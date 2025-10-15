from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import sqlite3
from datetime import datetime
import os  # For Railway dynamic port

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Load model and vectorizer
model = pickle.load(open("sentiment_model.pkl", "rb"))
vectorizer = pickle.load(open("vectorizer.pkl", "rb"))

# ---------- DATABASE SETUP ----------
def init_db():
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            review TEXT,
            sentiment TEXT,
            confidence REAL,
            timestamp TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ---------- HELPER FUNCTION ----------
def is_valid_review(text, threshold=0.1):
    words = text.lower().split()
    if len(words) < 2:
        return False
    restaurant_keywords = [
        "food", "taste", "tasty", "delicious", "spicy", "hotel", "restaurant",
        "meal", "plate", "curry", "biryani", "sambar", "dosa", "idli",
        "service", "staff", "waiter", "drinks", "menu", "chef", "cook",
        "buffet", "dining", "dish"
    ]
    if not any(keyword in words for keyword in restaurant_keywords):
        return False
    vectorized = vectorizer.transform([text])
    proba = max(model.predict_proba(vectorized)[0])
    return proba >= threshold

# ---------- PREDICT ROUTE ----------
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    review = data.get("review", "").strip()
    if not review:
        return jsonify({"error": "Review cannot be empty"}), 400
    if not is_valid_review(review):
        return jsonify({"error": "⚠️ Please enter a valid review related to restaurant"}), 400
    vectorized = vectorizer.transform([review])
    prediction = model.predict(vectorized)[0]
    confidence = max(model.predict_proba(vectorized)[0]) * 100
    if prediction == "Positive":
        message = "Thank you! Your review is positive 👍"
    elif prediction == "Negative":
        message = "We're sorry! Your review is negative 👎"
    else:
        message = "Your review seems neutral 😐"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO reviews (review, sentiment, confidence, timestamp) VALUES (?, ?, ?, ?)",
        (review, prediction, confidence, timestamp)
    )
    conn.commit()
    conn.close()
    return jsonify({
        "review": review,
        "sentiment": prediction,
        "confidence": round(confidence, 2),
        "message": message,
        "timestamp": timestamp
    })

# ---------- HISTORY ROUTE ----------
@app.route("/history", methods=["GET"])
def history():
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    cursor.execute("SELECT review, sentiment, confidence, timestamp FROM reviews ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    history_data = [
        {"review": row[0], "sentiment": row[1], "confidence": row[2], "timestamp": row[3]}
        for row in rows
    ]
    return jsonify(history_data)

# ---------- ALL SENTIMENTS ROUTE FOR ANALYZE BUTTON ----------
@app.route("/all-sentiments", methods=["GET"])
def all_sentiments():
    conn = sqlite3.connect("reviews.db")
    cursor = conn.cursor()
    cursor.execute("SELECT sentiment, COUNT(*) FROM reviews GROUP BY sentiment")
    rows = cursor.fetchall()
    conn.close()
    data = {row[0]: row[1] for row in rows}
    # Ensure all three sentiments are present
    for sentiment in ["Positive", "Negative", "Neutral"]:
        if sentiment not in data:
            data[sentiment] = 0
    return jsonify(data)








import requests

@app.route("/search-restaurants", methods=["GET"])
def search_restaurants():
    city = request.args.get("city", "").strip()
    if not city:
        return jsonify({"error": "City name is required"}), 400

    try:
        # 1. Get city bounding box
        nominatim_url = f"https://nominatim.openstreetmap.org/search?format=json&q={city}&limit=1"
        res = requests.get(nominatim_url, headers={"User-Agent": "Mozilla/5.0"})
        city_data = res.json()
        if not city_data:
            return jsonify({"error": "City not found"}), 404

        bbox = city_data[0]["boundingbox"]  # [south, north, west, east]
        south, north, west, east = bbox

        # 2. Overpass query for restaurants
        overpass_query = f"""
        [out:json][timeout:25];
        node["amenity"="restaurant"]({south},{west},{north},{east});
        out body;
        """
        overpass_url = "https://overpass-api.de/api/interpreter"
        overpass_res = requests.get(overpass_url, params={"data": overpass_query}, headers={"User-Agent": "Mozilla/5.0"})
        data = overpass_res.json()
        restaurants = []

        for r in data.get("elements", []):
            restaurants.append({
                "name": r.get("tags", {}).get("name", "Unnamed Restaurant"),
                "address": f"{r.get('tags', {}).get('addr_street', '')} {r.get('tags', {}).get('addr_housenumber','')}, {r.get('tags', {}).get('addr_city', city)}".strip(),
                "lat": r.get("lat"),
                "lon": r.get("lon")
            })

        return jsonify({"restaurants": restaurants})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------- RUN APP ----------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # Railway dynamic port
    app.run(host="0.0.0.0", port=port, debug=True)
