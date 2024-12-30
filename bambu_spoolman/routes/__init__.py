from flask import Blueprint

blueprint = Blueprint("bambu_spoolman", __name__, url_prefix="/api")


@blueprint.route("/")
def index():
    return "Hello, world!"
