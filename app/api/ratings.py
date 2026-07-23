from flask import Blueprint, jsonify, request
from sqlalchemy import func
from .. import db
from ..models import Rating

bp = Blueprint("ratings", __name__)


def get_user_ip():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr


@bp.get("/ratings/<track_id>")
def get_rating(track_id):
    up_count = db.session.scalar(
        db.select(func.count(Rating.id))
        .where(Rating.track_id == track_id, Rating.rating == "up")
    ) or 0
    down_count = db.session.scalar(
        db.select(func.count(Rating.id))
        .where(Rating.track_id == track_id, Rating.rating == "down")
    ) or 0

    user_ip = get_user_ip()
    user_rating = db.session.scalar(
        db.select(Rating.rating)
        .where(Rating.track_id == track_id, Rating.user_ip == user_ip)
    )

    return jsonify({
        "track_id": track_id,
        "thumbs_up": up_count,
        "thumbs_down": down_count,
        "user_rating": user_rating
    })


@bp.post("/ratings/<track_id>")
def post_rating(track_id):
    data = request.get_json(silent=True) or {}
    rating = data.get("rating")

    if rating not in ["up", "down"]:
        return jsonify({"error": "rating must be 'up' or 'down'"}), 400

    user_ip = get_user_ip()

    existing = db.session.scalar(
        db.select(Rating)
        .where(Rating.track_id == track_id, Rating.user_ip == user_ip)
    )

    if existing:
        if existing.rating == rating:
            return jsonify({"error": "already rated this song with same rating"}), 409
        existing.rating = rating
        db.session.commit()
        return jsonify(existing.to_dict()), 200

    new_rating = Rating(track_id=track_id, user_ip=user_ip, rating=rating)
    db.session.add(new_rating)
    db.session.commit()
    return jsonify(new_rating.to_dict()), 201


@bp.get("/ratings")
def list_ratings():
    ratings = db.session.execute(db.select(Rating).order_by(Rating.created_at.desc())).scalars().all()
    return jsonify([r.to_dict() for r in ratings])
