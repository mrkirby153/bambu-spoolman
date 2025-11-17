import os
import time

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
        self._external_filaments_cache = None
        self._external_filaments_cache_time = None

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

    def get_external_filaments(self, use_cache=True):
        """
        Get a list of all external filaments from SpoolmanDB
        Caches the result for 1 hour to avoid repeated large fetches
        Set use_cache=False to force a fresh fetch
        """
        # Check cache (1 hour = 3600 seconds)
        cache_ttl = 3600
        if use_cache and self._external_filaments_cache is not None:
            if self._external_filaments_cache_time is not None:
                age = time.time() - self._external_filaments_cache_time
                if age < cache_ttl:
                    logger.debug(f"Using cached external filaments ({int(age)}s old)")
                    return self._external_filaments_cache

        # Fetch fresh data
        try:
            logger.info("Fetching external filaments from SpoolmanDB...")
            response = requests.get(
                self._make_api_route("external/filament"),
                verify=self.verify,
            )
            response.raise_for_status()
            
            data = response.json()
            # Update cache
            self._external_filaments_cache = data
            self._external_filaments_cache_time = time.time()
            logger.info(f"Cached {len(data)} external filaments")
            return data            
        except Exception as e:
            logger.error(f"Exception getting external filaments: {e}")
            return self._external_filaments_cache or []  # Return stale cache if available

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

    def set_active_tray(self, spool_id, ams_num=None, tray_num=None):
        """
        Sets the AMS and tray fields for a spool

        Args:
            spool_id: The spool ID to update
            ams_num: The AMS number (1-indexed), or None to clear
            tray_num: The tray number (1-indexed), or None to clear

        Uses environment variables:
            SPOOLMAN_AMS_FIELD_NAME: Field name for AMS number (e.g., "ams_num")
            SPOOLMAN_TRAY_FIELD_NAME: Field name for tray number (e.g., "ams_tray")

        Returns False if neither environment variable is set
        """
        ams_field_name = os.environ.get("SPOOLMAN_AMS_FIELD_NAME")
        tray_field_name = os.environ.get("SPOOLMAN_TRAY_FIELD_NAME")

        # Skip if neither environment variable is set
        if ams_field_name is None and tray_field_name is None:
            logger.debug("Neither SPOOLMAN_AMS_FIELD_NAME nor SPOOLMAN_TRAY_FIELD_NAME set, skipping tray field update")
            return False

        existing_spool = self.get_spool(spool_id)
        if existing_spool is None:
            logger.warning(f"Spool {spool_id} not found, cannot set tray fields")
            return False

        # Get extra data
        extra = existing_spool.get("extra", {})

        # Set or clear the AMS field
        if ams_field_name:
            if ams_num is not None:
                extra[ams_field_name] = f"\"{ams_num}\""
            else:
                extra[ams_field_name] = f"\"\""

        # Set or clear the tray field
        if tray_field_name:
            if tray_num is not None:
                extra[tray_field_name] = f"\"{tray_num}\""
            else:
                extra[tray_field_name] = f"\"\""

        # Update the spool
        response = requests.patch(
            self._make_api_route(f"spool/{spool_id}"),
            json={"extra": extra},
            verify=self.verify,
        )

        if response.status_code == 200:
            logger.debug(f"Set AMS/tray fields for spool {spool_id}: AMS={ams_num}, Tray={tray_num}")
            return True
        else:
            logger.error(f"Failed to set AMS/tray fields for spool {spool_id}: status={response.status_code}")
            return False

    def create_spool(self, filament_id, tray_uuid, initial_weight=1000):
        """
        Creates a new spool in Spoolman
        Returns the created spool or None on failure
        """
        extra_field = os.environ.get("SPOOLMAN_SPOOL_FIELD_NAME")
        extra = {}
        if extra_field:
            extra[extra_field] = f'"{tray_uuid}"'

        spool_data = {
            "filament_id": filament_id,
            "initial_weight": initial_weight,
            "remaining_weight": initial_weight,
            "spool_weight": 250,  # Bambu Lab default
            "extra": extra,
        }

        try:
            response = requests.post(
                self._make_api_route("spool"),
                json=spool_data,
                verify=self.verify,
            )

            response.raise_for_status()

            logger.info(f"Created spool with filament_id {filament_id}")
            
            return response.json()            
        except Exception as e:
            logger.error(f"Exception creating spool: {e}")
            return None

    def match_external_filament(self, tray_data):
        """
        Finds a matching external filament using a refined matching algorithm
        Steps:
        1. Filter by Bambu Lab manufacturer/vendor
        2. Filter by exact color hex match
        3. Try to match by sub_brand with various separators (underscore, plus, hyphen)
        4. Fall back to material type matching
        Returns the best match or None
        """
        external_filaments = self.get_external_filaments()
        if not external_filaments:
            logger.debug("No external filaments available")
            return None

        filament_type = tray_data.get("tray_type", "")
        filament_sub_brand = tray_data.get("tray_sub_brands", "")

        # Extract colors from cols array (supports multi-color filaments)
        cols = tray_data.get("cols", [])
        if cols:
            # Use cols array if available
            color_hexes = [col[:6].upper() for col in cols]
        else:
            # Fall back to tray_color for backwards compatibility
            tray_color = tray_data.get("tray_color", "")
            color_hexes = [tray_color[:6].upper()] if tray_color else []

        # Step 1: Filter by Bambu Lab manufacturer/vendor
        bambu_filaments = []
        for filament in external_filaments:
            manufacturer = filament.get("manufacturer", "")
            # Handle both dict and string manufacturer
            if isinstance(manufacturer, dict):
                manufacturer_name = manufacturer.get("name", "")
            elif isinstance(manufacturer, str):
                manufacturer_name = manufacturer
            else:
                manufacturer_name = ""

            if "bambu" in manufacturer_name.lower():
                bambu_filaments.append(filament)

        if not bambu_filaments:
            logger.debug("No Bambu Lab filaments found in external database")
            return None

        # Step 2: Filter by color (using intersection - any color match)
        color_matched = []
        for filament in bambu_filaments:
            # Handle both color_hex (single) and color_hexes (multiple)
            filament_colors = filament.get("color_hex") or filament.get("color_hexes")

            # Convert to list if single value
            if isinstance(filament_colors, str):
                filament_colors = [filament_colors]
            elif filament_colors is None:
                filament_colors = []

            # Check if any color from tray matches any color from filament (intersection)
            if any(color in filament_colors for color in color_hexes):
                color_matched.append(filament)

        if not color_matched:
            logger.debug(f"No color match found for {color_hexes}")
            return None

        # Step 3: Try to match by sub_brand/specific name (e.g., "PETG HF")
        if filament_sub_brand and filament_sub_brand.strip():
            sub_brands = [
                filament_sub_brand.replace(' ', '_').lower(),
                filament_sub_brand.replace(' ', '+').lower(),
                filament_sub_brand.replace(' ', '-').lower(),
            ]

            for filament in color_matched:
                filament_id = filament.get("id", "").lower()
                for brand in sub_brands:
                    if brand in filament_id:
                        logger.info(f"Found exact sub-brand match: {filament.get('name')} (id: {filament_id})")
                        return filament

        # Step 4: Filter by material type (fallback)
        for filament in color_matched:
            filament_material = filament.get("material", "").upper()
            if filament_material == filament_type.upper():
                logger.info(f"Found material type match: {filament.get('name')} (id: {filament.get('id')})")
                return filament

        logger.debug(f"No external filament match for {filament_sub_brand} ({filament_type}) with color {color_hex}")
        return None

    def create_filament_from_external(self, external_filament, tray_material=None):
        """
        Creates a filament from an external filament definition
        tray_material: Optional material from tray (e.g. "PLA Matte") to preserve full variant
        Returns the created filament or None on failure
        """
        try:
            # Get or create the vendor
            manufacturer = external_filament.get("manufacturer", {})
            # Handle both dict and string manufacturer
            if isinstance(manufacturer, dict):
                vendor_name = manufacturer.get("name", "Unknown")
            elif isinstance(manufacturer, str):
                vendor_name = manufacturer
            else:
                vendor_name = "Unknown"

            vendor = self._get_or_create_vendor(vendor_name)
            if vendor is None:
                logger.error(f"Failed to get or create vendor: {vendor_name}")
                return None

            # Use tray material if provided to preserve variants like "PLA Matte", "PLA Basic"
            # Otherwise fall back to external filament's material
            material = tray_material if tray_material else external_filament.get("material", "PLA")

            filament_data = {
                "name": external_filament.get("name", "Unknown"),
                "material": material,
                "vendor_id": vendor["id"],
                "color_hex": external_filament.get("color_hex", "000000"),
                "diameter": external_filament.get("diameter", 1.75),
                "weight": external_filament.get("weight", 1000),
                "density": external_filament.get("density", 1.24),
                "spool_weight": external_filament.get("spool_weight", 250),
                "external_id": external_filament.get("id"),
            }

            response = requests.post(
                self._make_api_route("filament"),
                json=filament_data,
                verify=self.verify,
            )
            response.raise_for_status()

            logger.info(f"Created filament from external: {filament_data['name']}")
            return response.json()
        except Exception as e:
            logger.error(f"Exception creating filament from external: {e}")
            return None

    def auto_create_spool_from_tray(self, tray_data):
        """
        Automatically creates a spool from tray data
        First tries to match with external filaments, then falls back to basic creation
        tray_data should contain: tray_uuid, tray_sub_brands (material), tray_color, tray_weight, tray_diameter
        Returns the created spool or None on failure
        """
        tray_uuid = tray_data.get("tray_uuid")
        material = tray_data.get("tray_sub_brands", "PLA")
        color_hex = tray_data.get("tray_color", "000000")
        tray_weight = tray_data.get("tray_weight")
        diameter = tray_data.get("tray_diameter", "1.75")

        # Clean up color hex (remove alpha channel if present)
        if len(color_hex) == 8:
            color_hex = color_hex[:6]

        # Parse diameter and weight
        try:
            diameter_float = float(diameter)
        except:
            diameter_float = 1.75

        try:
            weight_int = int(tray_weight) if tray_weight else 1000
        except:
            weight_int = 1000

        logger.info(f"Auto-creating spool: {material} {color_hex} ({weight_int}g)")

        # Try to find matching external filament first
        external_filament = self.match_external_filament(tray_data)

        filament = None
        if external_filament:
            # Try to create from external filament, passing the tray material to preserve variant
            filament = self.create_filament_from_external(external_filament, material)

        if filament is None:
            logger.info("Auto-creating spool failed due to no found filament")
            return None            

        # Create the spool with the tray UUID
        spool = self.create_spool(filament["id"], tray_uuid, weight_int)
        return spool

    def _get_or_create_vendor(self, vendor_name):
        """
        Gets a vendor by name or creates it if it doesn't exist
        """
        try:
            # Try to find existing vendor
            response = requests.get(self._make_api_route("vendor"), verify=self.verify)
            if response.status_code == 200:
                vendors = response.json()
                for vendor in vendors:
                    if vendor.get("name") == vendor_name:
                        return vendor

            # Vendor not found, create it
            vendor_data = {
                "name": vendor_name,
                "empty_spool_weight": 250,
            }
            response = requests.post(
                self._make_api_route("vendor"),
                json=vendor_data,
                verify=self.verify,
            )
            response.raise_for_status()

            logger.info(f"Created vendor: {vendor_name}")
            return response.json()            
        except Exception as e:
            logger.error(f"Exception in _get_or_create_vendor: {e}")
            return None

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
