import pytest
from app import db
from app.models import Rating


def test_get_rating_no_ratings(client):
    response = client.get("/api/ratings/unknown-track")
    assert response.status_code == 200
    data = response.get_json()
    assert data["track_id"] == "unknown-track"
    assert data["thumbs_up"] == 0
    assert data["thumbs_down"] == 0
    assert data["user_rating"] is None


def test_get_rating_with_existing_ratings(client, app):
    with app.app_context():
        db.session.add(Rating(track_id="song-x", user_ip="1.1.1.1", rating="up"))
        db.session.add(Rating(track_id="song-x", user_ip="2.2.2.2", rating="up"))
        db.session.add(Rating(track_id="song-x", user_ip="3.3.3.3", rating="down"))
        db.session.commit()

    response = client.get("/api/ratings/song-x")
    assert response.status_code == 200
    data = response.get_json()
    assert data["thumbs_up"] == 2
    assert data["thumbs_down"] == 1
    assert data["user_rating"] is None


def test_get_rating_includes_user_rating(client, app):
    with app.app_context():
        db.session.add(Rating(track_id="song-y", user_ip="127.0.0.1", rating="up"))
        db.session.commit()

    response = client.get("/api/ratings/song-y")
    assert response.status_code == 200
    data = response.get_json()
    assert data["user_rating"] == "up"


def test_post_rating_invalid_value(client):
    response = client.post(
        "/api/ratings/track-1",
        json={"rating": "maybe"}
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_post_rating_missing_value(client):
    response = client.post(
        "/api/ratings/track-1",
        json={}
    )
    assert response.status_code == 400


def test_post_rating_new_rating(client):
    response = client.post(
        "/api/ratings/track-a",
        json={"rating": "up"}
    )
    assert response.status_code == 201
    data = response.get_json()
    assert data["track_id"] == "track-a"
    assert data["rating"] == "up"
    assert data["user_ip"] == "127.0.0.1"


def test_post_rating_change_existing(client, app):
    with app.app_context():
        db.session.add(Rating(track_id="track-b", user_ip="127.0.0.1", rating="up"))
        db.session.commit()

    response = client.post(
        "/api/ratings/track-b",
        json={"rating": "down"}
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["rating"] == "down"


def test_post_rating_same_rating_conflict(client, app):
    with app.app_context():
        db.session.add(Rating(track_id="track-c", user_ip="127.0.0.1", rating="up"))
        db.session.commit()

    response = client.post(
        "/api/ratings/track-c",
        json={"rating": "up"}
    )
    assert response.status_code == 409
    data = response.get_json()
    assert "error" in data


def test_get_user_ip_from_x_forwarded_for(client):
    response = client.get(
        "/api/ratings/test-track",
        headers={"X-Forwarded-For": "203.0.113.5"}
    )
    assert response.status_code == 200

    response2 = client.post(
        "/api/ratings/test-track",
        json={"rating": "up"},
        headers={"X-Forwarded-For": "203.0.113.5"}
    )
    assert response2.status_code == 201
    data2 = response2.get_json()
    assert data2["user_ip"] == "203.0.113.5"


def test_get_user_ip_different_ips_are_isolated(client):
    response1 = client.post(
        "/api/ratings/track-d",
        json={"rating": "up"},
        headers={"X-Forwarded-For": "10.0.0.1"}
    )
    assert response1.status_code == 201

    response2 = client.post(
        "/api/ratings/track-d",
        json={"rating": "up"},
        headers={"X-Forwarded-For": "10.0.0.2"}
    )
    assert response2.status_code == 201

    response_get = client.get("/api/ratings/track-d")
    data = response_get.get_json()
    assert data["thumbs_up"] == 2


def test_list_ratings_empty(client):
    response = client.get("/api/ratings")
    assert response.status_code == 200
    data = response.get_json()
    assert data == []


def test_list_ratings_all(client, app):
    with app.app_context():
        db.session.add(Rating(track_id="song-1", user_ip="1.1.1.1", rating="up"))
        db.session.add(Rating(track_id="song-2", user_ip="2.2.2.2", rating="down"))
        db.session.add(Rating(track_id="song-3", user_ip="3.3.3.3", rating="up"))
        db.session.commit()

    response = client.get("/api/ratings")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 3
    assert all("track_id" in r and "rating" in r for r in data)


def test_list_ratings_ordered_by_created_at_desc(client, app):
    with app.app_context():
        r1 = Rating(track_id="old", user_ip="1.1.1.1", rating="up")
        db.session.add(r1)
        db.session.flush()

        r2 = Rating(track_id="new", user_ip="2.2.2.2", rating="up")
        db.session.add(r2)
        db.session.commit()

    response = client.get("/api/ratings")
    data = response.get_json()
    assert data[0]["track_id"] == "new"
    assert data[1]["track_id"] == "old"
