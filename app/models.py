from datetime import datetime, timezone
from . import db


class Rating(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.String(128), nullable=False, index=True)
    user_ip = db.Column(db.String(45), nullable=False)  # IPv4 or IPv6
    rating = db.Column(db.String(10), nullable=False)  # "up" or "down"
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    __table_args__ = (db.UniqueConstraint('track_id', 'user_ip', name='unique_user_track_rating'),)

    def to_dict(self):
        return {
            "id": self.id,
            "track_id": self.track_id,
            "user_ip": self.user_ip,
            "rating": self.rating,
            "created_at": self.created_at.isoformat(),
        }
