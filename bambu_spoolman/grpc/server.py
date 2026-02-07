import grpc
from google.protobuf.empty_pb2 import Empty
from google.protobuf.json_format import ParseDict
from grpc.aio import ServicerContext
from loguru import logger

import bambu_spoolman.grpc.bambu_spoolman_pb2 as pb2
import bambu_spoolman.grpc.spoolman_pb2 as spoolman_pb2
from bambu_spoolman.bambu_mqtt import stateful_printer_info
from bambu_spoolman.broker.automatic_spool_switch import AutomaticSpoolSwitch
from bambu_spoolman.grpc import bambu_spoolman_pb2_grpc
from bambu_spoolman.settings import load_settings, save_settings
from bambu_spoolman.spoolman import instance as spoolman_instance


class BambuSpoolmanServicer(bambu_spoolman_pb2_grpc.BambuSpoolmanServicer):
    def __init__(self):
        pass

    async def GetTrayCount(self, request: Empty, context: ServicerContext):
        if stateful_printer_info.connected:
            if ams := stateful_printer_info.get_info().get("print", {}).get("ams"):
                tray_count = len(ams.get("ams", [])) * 4
            else:
                tray_count = 0
        else:
            tray_count = 0
        return pb2.TrayCountResponse(count=tray_count)

    async def GetPrinterStatus(self, request: Empty, context: ServicerContext):
        return pb2.PrinterStatusResponse(
            last_updated=stateful_printer_info.last_update,
            connected=stateful_printer_info.connected,
            status=stateful_printer_info.get_info(),
        )

    async def Info(self, request: Empty, context: ServicerContext):
        return pb2.InfoResponse(
            spoolman_url=spoolman_instance().endpoint,
            spoolman_valid=spoolman_instance().validate(),
        )

    async def GetSpools(self, request: pb2.GetSpoolsRequest, context: ServicerContext):
        if len(request.spool_id) == 0:
            # Retrieve all spools
            spools = spoolman_instance().get_spools()
        else:
            # Retrieve specific spools by ID
            spools = [
                spoolman_instance().get_spool(spool_id) for spool_id in request.spool_id
            ]
        return pb2.GetSpoolsResponse(
            spools=[
                ParseDict(spool, spoolman_pb2.Spool(), ignore_unknown_fields=True)
                for spool in spools
            ]
        )

    async def GetSettings(self, request: Empty, context: ServicerContext):
        settings = load_settings()
        return pb2.SettingsResponse(
            trays=settings.get("trays", {}),
            tray_count=settings.get("tray_count", 0),
            locked_trays=settings.get("locked_trays", []),
        )

    async def UpdateTray(
        self, request: pb2.UpdateTrayRequest, context: ServicerContext
    ):
        tray_id = str(request.tray_id)
        spool_id = request.spool_id

        settings = load_settings()
        trays = settings.get("trays", {})

        locked_trays = settings.get("locked_trays", [])
        logger.debug(f"Locked trays: {locked_trays}")
        if tray_id in locked_trays:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT, "Tray is locked and cannot be changed"
            )

        tray_id_int = int(tray_id)

        # Get the old spool_id if there was one, so we can clear its tray field
        # Try both string and int keys for compatibility
        old_spool_id = trays.get(tray_id) or trays.get(tray_id_int)

        if spool_id is None:
            # Clearing the tray assignment
            if tray_id in trays:
                del trays[tray_id]
                settings["trays"] = trays

            # Clear the tray fields in Spoolman for the old spool
            if old_spool_id is not None:
                try:
                    spoolman_instance().set_active_tray(old_spool_id, None, None)
                except Exception as e:
                    logger.error(
                        f"Failed to clear tray fields for spool {old_spool_id}: {e}"
                    )
        else:
            spool_id = int(spool_id)
            spool = spoolman_instance().get_spool(spool_id)
            if spool is None:
                await context.abort(grpc.StatusCode.NOT_FOUND, "Spool not found")

            if spool_id in trays.values():
                if trays.get(tray_id, None) != spool_id:
                    await context.abort(
                        grpc.StatusCode.INVALID_ARGUMENT,
                        "Spool is already assigned to a different tray",
                    )

            trays[tray_id] = spool_id

            # Set the tray fields in Spoolman for the new spool
            # Calculate AMS and tray slot (both 1-indexed for display)
            ams_num = (tray_id_int // 4) + 1
            tray_num = (tray_id_int % 4) + 1

            try:
                spoolman_instance().set_active_tray(spool_id, ams_num, tray_num)
            except Exception as e:
                logger.error(f"Failed to set tray fields for spool {spool_id}: {e}")

            # Clear the tray fields for the old spool if it was different
            if old_spool_id is not None and old_spool_id != spool_id:
                try:
                    spoolman_instance().set_active_tray(old_spool_id, None, None)
                except Exception as e:
                    logger.error(
                        f"Failed to clear tray fields for old spool {old_spool_id}: {e}"
                    )

        settings["trays"] = trays
        save_settings(settings)
        return Empty()

    async def GetSpoolByUUID(
        self, request: pb2.GetSpoolbyUUIDRequest, context: ServicerContext
    ):
        spool = spoolman_instance().lookup_by_tray_uuid(request.uuid)
        if spool is None:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Spool not found")
        return ParseDict(spool, spoolman_pb2.Spool(), ignore_unknown_fields=True)

    async def SetSpoolUUID(
        self, request: pb2.SetSpoolUUIDRequest, context: ServicerContext
    ):
        tray_uuid = request.uuid
        spool_id = request.spool_id

        spool = spoolman_instance().get_spool(spool_id)

        logger.debug(f"spool: {spool}")

        if spool is None:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Spool not found")

        success = spoolman_instance().set_tray_uuid(spool_id, tray_uuid)

        AutomaticSpoolSwitch.get_instance().sync()

        if not success:
            await context.abort(
                grpc.StatusCode.INTERNAL, "Failed to set tray UUID for spool"
            )
        return Empty()


async def serve(host: str = "0.0.0.0", port: int = 50051):
    server = grpc.aio.server()
    bambu_spoolman_pb2_grpc.add_BambuSpoolmanServicer_to_server(
        BambuSpoolmanServicer(), server
    )
    server.add_insecure_port(f"{host}:{port}")
    await server.start()
    logger.info(f"gRPC server started on {host}:{port}")

    try:
        await server.wait_for_termination()
    except KeyboardInterrupt:
        logger.info("Shutting down gRPC server...")
        await server.stop(grace=5)
