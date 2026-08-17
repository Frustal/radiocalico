from datetime import datetime, timezone
import pytest
from sqlalchemy.exc import IntegrityError
from app import db
from app.models import Rating


def test_rating_to_dict(app):
    with app.app_context():
        rating = Rating(
            track_id="test-track",
            user_ip="192.168.1.1",
            rating="up"
        )
        db.session.add(rating)
        db.session.commit()

        result = rating.to_dict()
        assert result["track_id"] == "test-track"
        assert result["user_ip"] == "192.168.1.1"
        assert result["rating"] == "up"
        assert "id" in result
        assert "created_at" in result


def test_rating_created_at_default(app):
    with app.app_context():
        before = datetime.now(timezone.utc).replace(tzinfo=None)
        rating = Rating(
            track_id="track-1",
            user_ip="10.0.0.1",
            rating="down"
        )
        db.session.add(rating)
        db.session.commit()
        after = datetime.now(timezone.utc).replace(tzinfo=None)

        assert before <= rating.created_at.replace(tzinfo=None) <= after


def test_unique_constraint_track_id_user_ip(app):
    with app.app_context():
        rating1 = Rating(
            track_id="song-a",
            user_ip="203.0.113.1",
            rating="up"
        )
        db.session.add(rating1)
        db.session.commit()

        rating2 = Rating(
            track_id="song-a",
            user_ip="203.0.113.1",
            rating="down"
        )
        db.session.add(rating2)

        with pytest.raises(IntegrityError):
            db.session.commit()
