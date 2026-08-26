"""
budget_estimator.py
aSK Youth AI — Python Tool 2
─────────────────────────────────────────────────────────────────────────────
Estimates SK project budgets based on activity type, participant count,
and optional meal/logistics flags. Returns itemized line items, totals,
and RA 10742 compliance notes — offloading all arithmetic from the AI.

API:
  POST /tools/budget
  Body: { "activity_type": str, "participants": int,
          "include_meals": bool, "notes": str }
  Returns: { "status": "ok", "line_items": [...], "total": float,
             "compliance_note": str, "summary": str }

Dependencies:
  pip install flask
"""

import json
import argparse
from flask import Flask, request, jsonify

app = Flask(__name__)

# ── Rate tables (PHP) ─────────────────────────────────────────────────────────
# Per-participant rates by activity category
RATES = {
    "sports event": {
        "materials_equipment": 80,
        "venue_setup":         30,
        "certificate":         25,
        "contingency_pct":     0.10,
    },
    "livelihood training": {
        "materials_equipment": 150,
        "venue_setup":         50,
        "certificate":         25,
        "contingency_pct":     0.10,
    },
    "leadership seminar": {
        "materials_equipment": 100,
        "venue_setup":         40,
        "certificate":         25,
        "contingency_pct":     0.10,
    },
    "community cleanup": {
        "materials_equipment": 60,
        "venue_setup":         0,
        "certificate":         20,
        "contingency_pct":     0.08,
    },
    "health awareness": {
        "materials_equipment": 90,
        "venue_setup":         30,
        "certificate":         25,
        "contingency_pct":     0.10,
    },
    "cultural event": {
        "materials_equipment": 120,
        "venue_setup":         60,
        "certificate":         25,
        "contingency_pct":     0.10,
    },
    "general": {
        "materials_equipment": 100,
        "venue_setup":         40,
        "certificate":         25,
        "contingency_pct":     0.10,
    },
}

MEAL_RATE_PER_PERSON = 120  # PHP per participant per meal (AM snack + lunch)

# RA 10742 soft cap per activity (rough guideline — chairperson confirms)
RA_SOFT_CAP = 50_000


def estimate_budget(
    activity_type: str,
    participants: int,
    include_meals: bool = False,
    notes: str = "",
) -> dict:
    category = activity_type.lower().strip()
    rates = RATES.get(category, RATES["general"])

    n = max(1, int(participants))

    materials    = rates["materials_equipment"] * n
    venue        = rates["venue_setup"] * n
    certificates = rates["certificate"] * n
    meals        = (MEAL_RATE_PER_PERSON * n) if include_meals else 0

    subtotal    = materials + venue + certificates + meals
    contingency = subtotal * rates["contingency_pct"]
    total       = subtotal + contingency

    line_items = [
        {"item": "Materials and Equipment",  "amount": round(materials, 2)},
        {"item": "Venue Setup / Logistics",  "amount": round(venue, 2)},
        {"item": "Certificates / Tokens",    "amount": round(certificates, 2)},
    ]
    if include_meals:
        line_items.append({"item": "Meals / Refreshments", "amount": round(meals, 2)})
    line_items.append({
        "item":   f"Contingency Fund ({int(rates['contingency_pct']*100)}%)",
        "amount": round(contingency, 2),
    })

    compliance_note = (
        "Estimated total is within typical SK activity budget range per RA 10742. "
        "Final amounts require SK Treasurer review and DILG approval before disbursement."
    )
    if total > RA_SOFT_CAP:
        compliance_note = (
            f"WARNING: Estimated total (₱{total:,.2f}) exceeds the ₱{RA_SOFT_CAP:,} "
            "soft guideline for single SK activities under RA 10742. "
            "Consider splitting into multiple activity budgets or seek DILG pre-approval."
        )

    summary = (
        f"Estimated budget for a {activity_type} with {n} participants"
        f"{' (with meals)' if include_meals else ''}: ₱{total:,.2f}."
    )
    if notes:
        summary += f" Notes: {notes}"

    return {
        "status":           "ok",
        "activity_type":    activity_type,
        "participants":     n,
        "include_meals":    include_meals,
        "line_items":       line_items,
        "subtotal":         round(subtotal, 2),
        "contingency":      round(contingency, 2),
        "total":            round(total, 2),
        "compliance_note":  compliance_note,
        "summary":          summary,
    }


@app.route("/tools/budget", methods=["POST"])
def api_estimate():
    data          = request.get_json(force=True)
    activity_type = data.get("activity_type", "general")
    participants  = int(data.get("participants", 1))
    include_meals = bool(data.get("include_meals", False))
    notes         = data.get("notes", "")
    result = estimate_budget(activity_type, participants, include_meals, notes)
    return jsonify(result), 200


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="aSK Youth Budget Estimator")
    parser.add_argument("--serve",        action="store_true")
    parser.add_argument("--port",         type=int, default=5002)
    parser.add_argument("--activity",     type=str, default="sports event")
    parser.add_argument("--participants", type=int, default=50)
    parser.add_argument("--meals",        action="store_true")
    parser.add_argument("--notes",        type=str, default="")
    args = parser.parse_args()

    if args.serve:
        print(f"[BudgetEstimator] Serving on port {args.port}")
        app.run(host="0.0.0.0", port=args.port, debug=False)
    else:
        result = estimate_budget(args.activity, args.participants, args.meals, args.notes)
        print(json.dumps(result, indent=2))
