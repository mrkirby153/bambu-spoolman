from flask import Flask, g
from bambu_spoolman.routes import blueprint
from bambu_spoolman.spoolman import new_client
from dotenv import load_dotenv
from loguru import logger

load_dotenv()

app = Flask(__name__)
app.register_blueprint(blueprint)


@app.before_request
def construct_client():
    g.spoolman = new_client()


@app.teardown_appcontext
def teardown_socket(_):
    socket = g.pop("bb_socket", None)
    if socket is not None:
        logger.debug("Closing socket")
        socket.close()
