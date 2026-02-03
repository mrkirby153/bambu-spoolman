import ftplib
import os
import ssl
import tempfile
from pathlib import Path

from loguru import logger


class ImplicitFTP_TLS(ftplib.FTP_TLS):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._sock = None

    @property
    def sock(self):
        """Return the socket."""
        return self._sock

    @sock.setter
    def sock(self, value):
        """When modifying the socket, ensure that it is ssl wrapped."""
        if value is not None and not isinstance(value, ssl.SSLSocket):
            value = self.context.wrap_socket(value)
        self._sock = value

    def ntransfercmd(self, cmd, rest=None):
        """Override the ntransfercmd method"""
        conn, size = ftplib.FTP.ntransfercmd(self, cmd, rest)
        conn = self.sock.context.wrap_socket(
            conn, server_hostname=self.host, session=self.sock.session
        )
        return conn, size


def retrieve_3mf(filename):
    logger.debug("Retrieving cached 3mf file {}", filename)
    with ImplicitFTP_TLS() as ftp:
        ftp.set_pasv(True)
        ftp.connect(os.environ.get("PRINTER_IP"), 990, 5)
        ftp.login("bblp", os.environ.get("PRINTER_ACCESS_CODE"))
        ftp.prot_p()

        # Check if the file exists
        logger.debug("Checking if file {} exists", filename)
        try:
            size = ftp.size(filename)
            logger.debug("File {} exists, size: {}", filename, size)
        except ftplib.error_perm:
            logger.error("File {} does not exist", filename)
            return None

        # Get the file
        logger.debug("Retrieving file {}", filename)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".3mf") as f:
            ftp.retrbinary(f"RETR {filename}", f.write)
            logger.debug("File retrieved")
            return f.name
