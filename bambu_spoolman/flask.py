from flask import Flask
from bambu_spoolman.routes import blueprint

app = Flask(__name__)
app.register_blueprint(blueprint)
