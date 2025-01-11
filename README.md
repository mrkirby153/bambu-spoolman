# bambu-spoolman

BambuLab integration for Spoolman.

This program will monitor a Bambulab printer and synchronize usage automatically to [Spoolman](https://github.com/Donkie/Spoolman). It does this by listening for prints to be started, parsing the gcode and estimating the filament usage per layer. As layers are completed, the usage for that layer will be pushed to Spoolman.

## Configuration

Set the following environment variables:

* `SPOOLMAN_URL` -- The base URL for your spoolman instance (i.e. `http://localhost:7912`)
  * `SPOOLMAN_VERIFY` -- Set to `false` to disable SSL verification for spoolman requests (Useful for self-signed certificates)
* `PRINTER_IP` -- The IP address of your printer
* `PRINTER_SERIAL` -- The serial number of your printer
* `PRINTER_ACCESS_CODE` -- The access code for your printer
* `BAMBU_SPOOLMAN_CONFIG` -- A directory to store the configuration file

## Usage

Once deployed, the web ui can be used to configure the mapping of AMS spool trays -> Spoolman spool ids. An initial connection to the printer is needed to determine the number of AMS systems attached.

## Untested things

* External spools
* LAN only prints
* Custom filament/layer change gcode (`M620` is used to detect filament changes and `M730` is used to detect layer changes)
* More than 1 AMS unit (I only have one, but this should support multiple AMS units)
