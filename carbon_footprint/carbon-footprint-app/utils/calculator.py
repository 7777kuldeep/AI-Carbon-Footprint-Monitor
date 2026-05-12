"""
Carbon Footprint Calculator
Uses standardized emission factors from IPCC, EPA, and IEA reports.
All values in kg CO2 equivalent.
"""


# ─── Emission Factors ─────────────────────────────────────────────────────────
EMISSION_FACTORS = {
    # Transport: kg CO2 per km
    "transport": {
        "petrol_car": 0.192,       # Average petrol car (EPA)
        "diesel_car": 0.171,       # Diesel car
        "electric_car": 0.053,     # EV (India grid average)
        "motorcycle": 0.103,       # Motorcycle/bike
        "bus": 0.089,              # Public bus
        "metro_train": 0.041,      # Metro/subway
        "auto_rickshaw": 0.125,    # Auto-rickshaw (India)
        "bicycle": 0.0,            # Zero emissions
        "walking": 0.0,
        "flight_domestic": 0.255,  # kg CO2 per km per passenger
    },
    # Energy: kg CO2 per kWh (India grid = 0.82 kg CO2/kWh)
    "appliances": {
        "ac": {"watts": 1500, "emission_factor": 0.82},
        "fan": {"watts": 75, "emission_factor": 0.82},
        "refrigerator": {"watts": 150, "emission_factor": 0.82},
        "washing_machine": {"watts": 500, "emission_factor": 0.82},
        "tv": {"watts": 100, "emission_factor": 0.82},
        "computer": {"watts": 200, "emission_factor": 0.82},
        "water_heater": {"watts": 2000, "emission_factor": 0.82},
        "microwave": {"watts": 1200, "emission_factor": 0.82},
    },
    # Food: kg CO2 per day
    "food": {
        "vegan": 1.5,
        "vegetarian": 2.5,
        "pescatarian": 3.4,
        "non_vegetarian_low": 4.7,   # Meat < 3 times/week
        "non_vegetarian_high": 7.2,  # Meat daily
    },
    # Misc Activities: kg CO2 per day
    "activities": {
        "online_streaming_heavy": 0.036,   # 4+ hrs/day video streaming
        "online_streaming_light": 0.009,
        "shopping_frequent": 1.0,          # Frequent online/offline shopping
        "shopping_moderate": 0.4,
        "shopping_minimal": 0.1,
        "waste_high": 0.8,                 # Poor recycling habits
        "waste_medium": 0.4,
        "waste_low": 0.1,                  # Good recycling
        "lpg_cooking_high": 0.9,           # kg CO2/day cooking with LPG
        "lpg_cooking_low": 0.45,
        "induction_cooking": 0.2,
    },
}

# World average and country comparisons (yearly kg CO2)
BENCHMARKS = {
    "world_avg": 4700,
    "india_avg": 1900,
    "usa_avg": 14700,
    "eu_avg": 6400,
    "paris_target": 2300,   # Paris Agreement per-capita target by 2030
}


class CarbonCalculator:
    """
    Calculates carbon footprint from user input.
    
    Input dict keys:
      - transport: list of {mode, distance_km}
      - appliances: list of {name, hours_per_day}
      - food_habit: one of food emission factor keys
      - activities: dict of activity choices
    """

    def __init__(self, data: dict):
        self.data = data

    def calculate(self) -> dict:
        transport_co2 = self._calc_transport()
        energy_co2 = self._calc_energy()
        food_co2 = self._calc_food()
        activities_co2 = self._calc_activities()

        total_daily = round(transport_co2 + energy_co2 + food_co2 + activities_co2, 3)
        total_monthly = round(total_daily * 30, 2)
        total_yearly = round(total_daily * 365, 2)

        return {
            "categories": {
                "transport": round(transport_co2, 3),
                "energy": round(energy_co2, 3),
                "food": round(food_co2, 3),
                "activities": round(activities_co2, 3),
            },
            "total_daily": total_daily,
            "total_monthly": total_monthly,
            "total_yearly": total_yearly,
            "benchmarks": BENCHMARKS,
            "percentages": self._get_percentages(
                transport_co2, energy_co2, food_co2, activities_co2, total_daily
            ),
        }

    def _calc_transport(self) -> float:
        """Calculate daily transport emissions"""
        co2 = 0.0
        transports = self.data.get("transport", [])
        for t in transports:
            mode = t.get("mode", "petrol_car")
            distance = float(t.get("distance_km", 0))
            frequency = t.get("frequency", "daily")  # daily, weekly, monthly

            factor = EMISSION_FACTORS["transport"].get(mode, 0.19)
            daily_distance = self._normalize_distance(distance, frequency)
            co2 += factor * daily_distance

        return co2

    def _calc_energy(self) -> float:
        """Calculate daily electricity emissions"""
        co2 = 0.0
        appliances = self.data.get("appliances", [])
        for appl in appliances:
            name = appl.get("name", "")
            hours = float(appl.get("hours_per_day", 0))
            quantity = int(appl.get("quantity", 1))

            info = EMISSION_FACTORS["appliances"].get(name)
            if info:
                # kWh per day = watts * hours / 1000
                kwh = (info["watts"] * hours * quantity) / 1000
                co2 += kwh * info["emission_factor"]

        # Also accept direct kWh input (monthly electricity bill)
        monthly_kwh = float(self.data.get("monthly_kwh", 0))
        if monthly_kwh > 0:
            co2 += (monthly_kwh / 30) * 0.82  # India grid factor

        return co2

    def _calc_food(self) -> float:
        """Calculate daily food emissions"""
        habit = self.data.get("food_habit", "vegetarian")
        return EMISSION_FACTORS["food"].get(habit, 2.5)

    def _calc_activities(self) -> float:
        """Calculate daily misc activity emissions"""
        co2 = 0.0
        acts = self.data.get("activities", {})

        # Streaming
        streaming = acts.get("streaming", "light")
        co2 += EMISSION_FACTORS["activities"].get(
            f"online_streaming_{streaming}", 0.009
        )

        # Shopping
        shopping = acts.get("shopping", "moderate")
        co2 += EMISSION_FACTORS["activities"].get(f"shopping_{shopping}", 0.4)

        # Waste / Recycling
        waste = acts.get("waste", "medium")
        co2 += EMISSION_FACTORS["activities"].get(f"waste_{waste}", 0.4)

        # Cooking fuel
        cooking = acts.get("cooking", "lpg_cooking_low")
        co2 += EMISSION_FACTORS["activities"].get(cooking, 0.45)

        return co2

    def _normalize_distance(self, distance: float, frequency: str) -> float:
        """Convert distance to daily equivalent"""
        mapping = {"daily": 1, "weekly": 1 / 7, "monthly": 1 / 30}
        return distance * mapping.get(frequency, 1)

    def _get_percentages(self, t, e, f, a, total) -> dict:
        if total == 0:
            return {"transport": 0, "energy": 0, "food": 0, "activities": 0}
        return {
            "transport": round((t / total) * 100, 1),
            "energy": round((e / total) * 100, 1),
            "food": round((f / total) * 100, 1),
            "activities": round((a / total) * 100, 1),
        }
