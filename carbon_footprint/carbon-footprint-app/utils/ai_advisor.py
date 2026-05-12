"""
AI Recommendation System
Uses Anthropic Claude API to generate personalized carbon reduction advice.
Falls back to rule-based system if API is unavailable.
"""

import os
import json


def get_ai_recommendations(data: dict) -> list[dict]:
    """
    Get AI-powered recommendations based on user's footprint data.
    Uses Claude API if key is available, else rule-based fallback.
    """
    try:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if api_key:
            return _get_claude_recommendations(data, api_key)
    except Exception as e:
        print(f"Claude API error: {e}, falling back to rule-based")

    return _get_rule_based_recommendations(data)


def _get_claude_recommendations(data: dict, api_key: str) -> list[dict]:
    """Call Claude API for personalized recommendations"""
    import urllib.request

    categories = data.get("categories", {})
    input_data = data.get("input_data", {})
    total_yearly = data.get("total_yearly", 0)

    prompt = f"""You are an expert sustainability advisor. A user has calculated their carbon footprint:

Carbon Footprint Summary:
- Total Yearly: {total_yearly} kg CO2
- Transport: {categories.get('transport', 0)} kg CO2/day
- Energy: {categories.get('energy', 0)} kg CO2/day  
- Food: {categories.get('food', 0)} kg CO2/day
- Activities: {categories.get('activities', 0)} kg CO2/day

User Profile:
{json.dumps(input_data, indent=2)}

Global average yearly footprint: 4,700 kg CO2
India average: 1,900 kg CO2
Paris Agreement target: 2,300 kg CO2

Provide EXACTLY 6 personalized, actionable recommendations to reduce their carbon footprint. 
Focus on their highest emission categories.

Respond ONLY with a valid JSON array. No preamble, no markdown. Format:
[
  {{
    "category": "transport|energy|food|activities|lifestyle",
    "title": "Short action title",
    "description": "2-3 sentence actionable advice specific to their situation",
    "impact": "high|medium|low",
    "estimated_reduction_kg_yearly": 450,
    "difficulty": "easy|medium|hard",
    "icon": "🚗|⚡|🥗|🛍️|🌱|♻️|🚲|☀️|🌍"
  }}
]"""

    payload = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 1500,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=15) as response:
        result = json.loads(response.read())
        text = result["content"][0]["text"].strip()
        # Clean any accidental markdown fences
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)


def _get_rule_based_recommendations(data: dict) -> list[dict]:
    """
    Rule-based fallback recommendation engine.
    Analyzes emission categories and returns targeted advice.
    """
    categories = data.get("categories", {})
    input_data = data.get("input_data", {})
    recommendations = []

    # ── Transport Recommendations ──────────────────────────────────────────────
    transport = categories.get("transport", 0)
    if transport > 2.0:
        recommendations.append({
            "category": "transport",
            "title": "Switch to Electric Vehicle",
            "description": "Your transport emissions are significantly high. Switching from a petrol/diesel car to an electric vehicle can cut your transport CO2 by up to 72%. Consider EVs like Tata Nexon EV or MG ZS EV which have excellent range.",
            "impact": "high",
            "estimated_reduction_kg_yearly": round(transport * 0.65 * 365, 0),
            "difficulty": "hard",
            "icon": "⚡",
        })
        recommendations.append({
            "category": "transport",
            "title": "Use Metro/Public Transport 3x/Week",
            "description": "Replacing your car commute with metro or bus just 3 days a week can reduce transport emissions by 40%. Combine with cycling for last-mile connectivity.",
            "impact": "high",
            "estimated_reduction_kg_yearly": round(transport * 0.40 * 365, 0),
            "difficulty": "easy",
            "icon": "🚇",
        })
    elif transport > 0.5:
        recommendations.append({
            "category": "transport",
            "title": "Optimize Your Commute",
            "description": "Try carpooling with colleagues or neighbors. Sharing a ride with just one person halves your per-km emissions. Apps like Quick Ride and BlaBlaCar make this easy.",
            "impact": "medium",
            "estimated_reduction_kg_yearly": round(transport * 0.30 * 365, 0),
            "difficulty": "easy",
            "icon": "🚗",
        })

    # ── Energy Recommendations ─────────────────────────────────────────────────
    energy = categories.get("energy", 0)
    if energy > 3.0:
        recommendations.append({
            "category": "energy",
            "title": "Install Solar Panels",
            "description": "With your high electricity usage, rooftop solar is a game-changer. A 3kW system can offset 90%+ of your electricity carbon footprint and pays back in 4-5 years. Government subsidies reduce upfront cost.",
            "impact": "high",
            "estimated_reduction_kg_yearly": round(energy * 0.85 * 365, 0),
            "difficulty": "hard",
            "icon": "☀️",
        })
    if energy > 1.0:
        recommendations.append({
            "category": "energy",
            "title": "Upgrade to 5-Star Energy Appliances",
            "description": "Replace old AC and appliances with 5-star BEE-rated models. A 5-star AC uses 30% less power than a 2-star model. Set AC to 24°C instead of 18°C — each degree saves ~6% electricity.",
            "impact": "medium",
            "estimated_reduction_kg_yearly": round(energy * 0.25 * 365, 0),
            "difficulty": "medium",
            "icon": "❄️",
        })

    # ── Food Recommendations ───────────────────────────────────────────────────
    food = categories.get("food", 0)
    food_habit = input_data.get("food_habit", "")
    if food > 5.0:
        recommendations.append({
            "category": "food",
            "title": "Adopt Meatless Mondays",
            "description": "Reducing meat consumption just one day per week saves ~400 kg CO2/year. Beef is the highest-emission food — replacing it with lentils or paneer cuts emissions by 10x for that meal.",
            "impact": "high",
            "estimated_reduction_kg_yearly": 400,
            "difficulty": "easy",
            "icon": "🥗",
        })
    elif food > 3.0:
        recommendations.append({
            "category": "food",
            "title": "Choose Local & Seasonal Produce",
            "description": "Food transport accounts for 11% of food emissions. Buying local vegetables and fruits reduces food miles dramatically. Shop at local mandis or subscribe to farm-fresh delivery services.",
            "impact": "medium",
            "estimated_reduction_kg_yearly": 180,
            "difficulty": "easy",
            "icon": "🌽",
        })

    # ── Activities Recommendations ─────────────────────────────────────────────
    activities = categories.get("activities", 0)
    shopping = input_data.get("activities", {}).get("shopping", "")
    if shopping == "frequent":
        recommendations.append({
            "category": "activities",
            "title": "Adopt a Minimalist Shopping Approach",
            "description": "Fast fashion and frequent purchases have a huge hidden carbon cost. Try a 30-day no-buy challenge, shop secondhand on OLX/ThriftNation, and choose products with minimal packaging.",
            "impact": "medium",
            "estimated_reduction_kg_yearly": 200,
            "difficulty": "medium",
            "icon": "🛍️",
        })

    # ── Universal Green Tip ────────────────────────────────────────────────────
    recommendations.append({
        "category": "lifestyle",
        "title": "Plant Trees & Support Carbon Offsets",
        "description": "While reducing emissions, offset unavoidable carbon by planting native trees. One tree absorbs ~21 kg CO2/year. Support projects on GoldStandard.org or plant via SayTrees/TreesForFree India.",
        "impact": "medium",
        "estimated_reduction_kg_yearly": 200,
        "difficulty": "easy",
        "icon": "🌱",
    })

    # Return top 6
    return recommendations[:6]
