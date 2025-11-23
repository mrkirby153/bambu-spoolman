# bambu-spoolman

BambuLab integration for Spoolman.

This program will monitor a Bambulab printer and synchronize usage automatically to [Spoolman](https://github.com/Donkie/Spoolman). It does this by listening for prints to be started, parsing the gcode and estimating the filament usage per layer. As layers are completed, the usage for that layer will be pushed to Spoolman.

## Quickstart

```sh
curl -o .env https://raw.githubusercontent.com/mrkirby153/bambu-spoolman/main/.env.example
curl -o docker-compose.yml https://raw.githubusercontent.com/mrkirby153/bambu-spoolman/main/docker-compose.yml
```

Update `.env` with the appropriate settings. See below for a list of configuration options.

Once the `.env` file is updated, start the app with `docker compose up -d`

## Configuration

Set the following environment variables:

* `SPOOLMAN_URL` -- The base URL for your spoolman instance (i.e. `http://localhost:7912`)
  * `SPOOLMAN_VERIFY` -- Set to `false` to disable SSL verification for spoolman requests (Useful for self-signed certificates)
* `PRINTER_IP` -- The IP address of your printer
* `PRINTER_SERIAL` -- The serial number of your printer
* `PRINTER_ACCESS_CODE` -- The access code for your printer
* `BAMBU_SPOOLMAN_CONFIG` -- A directory to store the configuration file
* `SPOOLMAN_AUTO_CREATE_SPOOLS` -- Create spools when detected
* `SPOOLMAN_AMS_FIELD_NAME` -- Spoolman field to store which AMS a spool is in
* `SPOOLMAN_AMS_TRAY_NAME` -- Spoolman field to store which tray a spool is in

## Usage

Once deployed, the web ui can be used to configure the mapping of AMS spool trays -> Spoolman spool ids. An initial connection to the printer is needed to determine the number of AMS systems attached.

## Untested things

* External spools
* LAN only prints
* Custom filament/layer change gcode (`M620` is used to detect filament changes and `M730` is used to detect layer changes)
* More than 1 AMS unit (I only have one, but this should support multiple AMS units)
