"""
AI-Powered Carbon Footprint Calculator - Main Flask Application
Author: Carbon AI Project
Description: Full-stack web app to calculate carbon footprint & provide AI recommendations
"""

from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json
import os

from utils.calculator import CarbonCalculator
from utils.ai_advisor import get_ai_recommendations
from utils.ml_model import CarbonMLModel

# ─── App Setup ───────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "carbon-footprint-secret-2024")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///carbon.db"
).replace("postgres://", "postgresql://")  # Render fix
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
ml_model = CarbonMLModel()

# ─── Database Models ──────────────────────────────────────────────────────────
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    records = db.relationship("FootprintRecord", backref="user", lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class FootprintRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    username_snapshot = db.Column(db.String(80), nullable=True)
    transport_co2 = db.Column(db.Float, default=0)
    energy_co2 = db.Column(db.Float, default=0)
    food_co2 = db.Column(db.Float, default=0)
    activities_co2 = db.Column(db.Float, default=0)
    total_daily_co2 = db.Column(db.Float, default=0)
    total_monthly_co2 = db.Column(db.Float, default=0)
    total_yearly_co2 = db.Column(db.Float, default=0)
    input_data = db.Column(db.Text)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username_snapshot or "Anonymous",
            "transport": self.transport_co2,
            "energy": self.energy_co2,
            "food": self.food_co2,
            "activities": self.activities_co2,
            "total_daily": self.total_daily_co2,
            "total_monthly": self.total_monthly_co2,
            "total_yearly": self.total_yearly_co2,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M"),
        }


# ─── Routes: Pages ───────────────────────────────────────────────────────────
@app.route("/")
def index():
    """Landing / home page"""
    return render_template("index.html")


@app.route("/calculator")
def calculator():
    """Calculator input form page"""
    return render_template("calculator.html")


@app.route("/dashboard")
def dashboard():
    """Results dashboard page"""
    return render_template("dashboard.html")


@app.route("/leaderboard")
def leaderboard():
    """Leaderboard page"""
    return render_template("leaderboard.html")


@app.route("/profile")
def profile():
    """User profile & history"""
    if "user_id" not in session:
        return redirect(url_for("index"))
    return render_template("profile.html")


# ─── Routes: Auth ────────────────────────────────────────────────────────────
@app.route("/api/register", methods=["POST"])
def register():
    data = request.json
    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "Username already exists"}), 400
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 400

    user = User(username=data["username"], email=data["email"])
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    session["user_id"] = user.id
    session["username"] = user.username
    return jsonify({"success": True, "username": user.username})


@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    user = User.query.filter_by(username=data["username"]).first()
    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    session["user_id"] = user.id
    session["username"] = user.username
    return jsonify({"success": True, "username": user.username})


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})


@app.route("/api/session")
def get_session():
    return jsonify({
        "logged_in": "user_id" in session,
        "username": session.get("username", "Guest")
    })


# ─── Routes: Core API ────────────────────────────────────────────────────────
@app.route("/api/calculate", methods=["POST"])
def calculate():
    """Main calculation endpoint"""
    data = request.json

    # Calculate carbon footprint
    calc = CarbonCalculator(data)
    result = calc.calculate()

    # Get ML-based risk category
    risk_level = ml_model.predict_risk(result["total_daily"])

    # Save record to DB
    record = FootprintRecord(
        user_id=session.get("user_id"),
        username_snapshot=session.get("username", "Anonymous"),
        transport_co2=result["categories"]["transport"],
        energy_co2=result["categories"]["energy"],
        food_co2=result["categories"]["food"],
        activities_co2=result["categories"]["activities"],
        total_daily_co2=result["total_daily"],
        total_monthly_co2=result["total_monthly"],
        total_yearly_co2=result["total_yearly"],
        input_data=json.dumps(data),
    )
    db.session.add(record)
    db.session.commit()

    result["record_id"] = record.id
    result["risk_level"] = risk_level
    return jsonify(result)


@app.route("/api/recommend", methods=["POST"])
def recommend():
    """AI recommendation endpoint using Anthropic API"""
    data = request.json
    recommendations = get_ai_recommendations(data)
    return jsonify({"recommendations": recommendations})


@app.route("/api/history")
def history():
    """User's calculation history"""
    if "user_id" not in session:
        return jsonify({"records": []})

    records = (
        FootprintRecord.query.filter_by(user_id=session["user_id"])
        .order_by(FootprintRecord.created_at.desc())
        .limit(10)
        .all()
    )
    return jsonify({"records": [r.to_dict() for r in records]})


@app.route("/api/leaderboard")
def get_leaderboard():
    """Leaderboard of lowest yearly CO2 users"""
    # Get best (lowest) record per username
    records = (
        db.session.query(
            FootprintRecord.username_snapshot,
            db.func.min(FootprintRecord.total_yearly_co2).label("best_yearly"),
            db.func.count(FootprintRecord.id).label("submissions"),
        )
        .filter(FootprintRecord.username_snapshot != None)
        .filter(FootprintRecord.username_snapshot != "Anonymous")
        .group_by(FootprintRecord.username_snapshot)
        .order_by("best_yearly")
        .limit(10)
        .all()
    )

    leaderboard = []
    for i, r in enumerate(records):
        leaderboard.append({
            "rank": i + 1,
            "username": r.username_snapshot,
            "yearly_co2": round(r.best_yearly, 1),
            "submissions": r.submissions,
            "badge": get_badge(r.best_yearly),
        })

    return jsonify({"leaderboard": leaderboard})


@app.route("/api/stats")
def global_stats():
    """Global statistics"""
    total_records = FootprintRecord.query.count()
    if total_records == 0:
        return jsonify({"total_users": 0, "avg_yearly": 0, "total_saved": 0})

    avg = db.session.query(db.func.avg(FootprintRecord.total_yearly_co2)).scalar()
    return jsonify({
        "total_users": total_records,
        "avg_yearly": round(avg or 0, 1),
        "global_average": 4700,  # kg CO2/year world average
    })


def get_badge(yearly_co2):
    if yearly_co2 < 1000: return "🌱 Carbon Hero"
    elif yearly_co2 < 2000: return "🌿 Eco Warrior"
    elif yearly_co2 < 3000: return "🍃 Green Citizen"
    elif yearly_co2 < 5000: return "⚡ Improving"
    else: return "🔥 High Impact"


# ─── Init ────────────────────────────────────────────────────────────────────
with app.app_context():
    db.create_all()
    ml_model.train()  # Train ML model on startup

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
