import requests
import os
from loguru import logger


class SpoolmanClient:
    """
    A client for the Spoolman API
    """

    def __init__(self, endpoint):
        self.endpoint = endpoint
        self.verify = os.environ.get("SPOOLMAN_VERIFY", "true").lower() == "true"

        if not self.verify:
            logger.warning("SSL verification for Spoolman API is disabled.")

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
