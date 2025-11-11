import os

import requests
import urllib3
from loguru import logger


class SpoolmanClient:
    """
    A client for the Spoolman API
    """

    def __init__(self, endpoint):
        self.endpoint = endpoint
        self.verify = os.environ.get("SPOOLMAN_VERIFY", "true").lower() == "true"

        if not self.verify:
            urllib3.disable_warnings()

    def validate(self):
        """
        Validates the connection to the Spoolman API
        """
        response = requests.get(self._make_api_route("health"), verify=self.verify)
        return response.status_code == 200

    def get_info(self):
        """
        Get information about the Spoolman instance
        """
        response = requests.get(self._make_api_route("info"), verify=self.verify)
        return response.json()

    def get_filaments(self):
        """
        Get a list of all filaments
        """
        response = requests.get(self._make_api_route("filament"), verify=self.verify)
        return response.json()

    def get_spools(self):
        """
        Get a list of all spools
        """
        response = requests.get(self._make_api_route("spool"), verify=self.verify)
        return response.json()

    def get_spool(self, spool_id):
        """
        Get a specific spool by ID
        """
        response = requests.get(
            self._make_api_route(f"spool/{spool_id}"), verify=self.verify
        )
        if response.status_code != 200:
            return None
        return response.json()

    def consume_spool(self, spool_id, *, length=None, weight=None):
        """
        Consume a part of a spool
        """
        assert length or weight, "Must provide either length or weight"
        assert not (length and weight), "Must provide either length or weight, not both"

        response = requests.put(
            self._make_api_route(f"spool/{spool_id}/use"),
            json={
                "use_length": length,
                "use_weight": weight,
            },
            verify=self.verify,
        )
        return response.json()
    
    def lookup_by_tray_uuid(self, tray_uuid):
        """
        Looks up a spoolman spool by the tray uuid
        """
        extra_field = os.environ.get("SPOOLMAN_SPOOL_FIELD_NAME")
        if extra_field is None:
            return None
        all_spools = self.get_spools()

        for spool in all_spools:
            extra = spool.get("extra", {})
            
            data = extra.get(extra_field, None)
            if data is not None and data == f"\"{tray_uuid}\"":
                return spool
        return None
    
    def set_tray_uuid(self, spool_id, tray_uuid):
        """
        Sets a tray's uuid
        """
        extra_field = os.environ.get("SPOOLMAN_SPOOL_FIELD_NAME")
        if extra_field is None:
            return False
        existing_spool = self.get_spool(spool_id)
        if existing_spool is None:
            return False
        # Get extra data
        extra = existing_spool.get("extra", {})
        # Set the new tray uuid
        extra[extra_field] = f"\"{tray_uuid}\""
        # Update the spool
        response = requests.patch(
            self._make_api_route(f"spool/{spool_id}"),
            json={"extra": extra},
            verify=self.verify,
        )
        return True if response.status_code == 200 else False

    def set_active_tray(self, spool_id, active_tray_id):
        """
        Sets the tray field for a spool
        active_tray_id should be in format: ams_{ams_id}_tray_{tray_id}
        Pass empty string to clear the tray field
        Uses SPOOLMAN_TRAY_FIELD_NAME environment variable
        Returns False if SPOOLMAN_TRAY_FIELD_NAME is not set
        """
        tray_field_name = os.environ.get("SPOOLMAN_TRAY_FIELD_NAME")

        # Skip if the environment variable is not set
        if tray_field_name is None:
            logger.debug("SPOOLMAN_TRAY_FIELD_NAME not set, skipping tray field update")
            return False

        existing_spool = self.get_spool(spool_id)
        if existing_spool is None:
            logger.warning(f"Spool {spool_id} not found, cannot set {tray_field_name}")
            return False

        # Get extra data
        extra = existing_spool.get("extra", {})

        # Set or clear the tray field
        if active_tray_id:
            extra[tray_field_name] = f"\"{active_tray_id}\""
        else:
            # Clear by setting to empty string
            extra[tray_field_name] = '""'

        # Update the spool
        response = requests.patch(
            self._make_api_route(f"spool/{spool_id}"),
            json={"extra": extra},
            verify=self.verify,
        )

        if response.status_code == 200:
            logger.debug(f"Set {tray_field_name} for spool {spool_id} to: {active_tray_id}")
            return True
        else:
            logger.error(f"Failed to set {tray_field_name} for spool {spool_id}: {response.status_code}")
            return False

    def _make_api_route(self, route, **kwargs):
        query_string = "&".join([f"{k}={v}" for k, v in kwargs.items()])
        if query_string:
            return f"{self.endpoint}/api/v1/{route}?{query_string}"
        return f"{self.endpoint}/api/v1/{route}"


def new_client(url=None) -> SpoolmanClient:
    """
    Create a new Spoolman client
    """
    if url is None:
        url = os.environ.get("SPOOLMAN_URL")
    return SpoolmanClient(url)
