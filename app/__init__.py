from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()


def create_app():
    app = Flask(__name__, static_folder="../static")
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///radiocalico.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.secret_key = "dev-secret-change-in-prod"

    db.init_app(app)
    migrate.init_app(app, db)

    from .api.ratings import bp as ratings_bp
    app.register_blueprint(ratings_bp, url_prefix="/api")

    return app
