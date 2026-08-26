"""
narrative_compiler.py
aSK Youth AI — Python Tool 4
─────────────────────────────────────────────────────────────────────────────
Compiles a full narrative accomplishment report for an SK event by pulling
event data from the DB, attendance stats, and budget actuals, then returning
a structured narrative the AI can present directly to the user.

The AI never writes narratives from scratch — it calls this tool, which
assembles all data and returns a formatted draft.

API:
  POST /tools/narrative
  Body: { "event_id": str, "language": "filipino"|"english", "tone": "formal"|"casual" }
  Returns: { "status": "ok", "narrative": str, "word_count": int }

Dependencies:
  pip install flask psycopg2-binary
"""

import json
import os
import argparse
from datetime import datetime
from flask import Flask, request, jsonify

app = Flask(__name__)


def _fetch_event(event_id: str) -> dict:
    """
    Pull event metadata from DB. Stub returns sample data.
    Replace with real DB query using psycopg2 or your ORM.
    """
    return {
        "event_name":       "Sports Fest 2025",
        "event_date":       "August 10, 2025",
        "venue":            "Barangay Plaza, Concepcion Dos",
        "participant_count": 120,
        "present":          108,
        "absent":           12,
        "budget_approved":  25000.00,
        "budget_used":      22850.00,
        "objectives":       [
            "Promote physical fitness among the youth",
            "Foster camaraderie and teamwork",
            "Encourage active participation in SK programs",
        ],
        "activities":       [
            "Registration and orientation",
            "Basketball tournament",
            "Volleyball exhibition",
            "Awarding ceremony",
        ],
        "outcomes":         [
            "108 youth participated actively",
            "3 barangay teams competed",
            "Awards distributed to top performers",
        ],
        "recommendations":  [
            "Expand to include more sports categories next year",
            "Increase budget allocation for refreshments",
        ],
    }


def compile_narrative(event_id: str, language: str = "english", tone: str = "formal") -> dict:
    event = _fetch_event(event_id)

    name   = event["event_name"]
    date   = event["event_date"]
    venue  = event["venue"]
    total  = event["participant_count"]
    pct    = round((event["present"] / total) * 100) if total > 0 else 0
    budget_used     = event["budget_used"]
    budget_approved = event["budget_approved"]
    savings         = budget_approved - budget_used

    objs  = "\n".join(f"  {i+1}. {o}" for i, o in enumerate(event["objectives"]))
    acts  = "\n".join(f"  {i+1}. {a}" for i, a in enumerate(event["activities"]))
    outs  = "\n".join(f"  {i+1}. {o}" for i, o in enumerate(event["outcomes"]))
    recs  = "\n".join(f"  {i+1}. {r}" for i, r in enumerate(event["recommendations"]))

    if language == "filipino":
        narrative = f"""ULAT NG GAWAIN
{name.upper()}
Petsa: {date} | Lugar: {venue}

I. LAYUNIN
{objs}

II. NILALAMAN NG AKTIBIDAD
{acts}

III. MGA NAGANAP
Noong {date}, matagumpay na naisagawa ang {name} sa {venue}. Sa kabuuang {total} na kabataang naimbita, {event['present']} ang aktibong dumalo ({pct}% attendance rate). Nagpakita ito ng malakas na interes at suporta ng kabataan sa programang ito ng Sangguniang Kabataan.

IV. MGA RESULTA AT TAGUMPAY
{outs}

V. PAGGAMIT NG BADYET
Aprubadong Badyet : ₱{budget_approved:,.2f}
Nagastos          : ₱{budget_used:,.2f}
Natipid           : ₱{savings:,.2f}

Ang lahat ng gastusin ay naaayon sa itinakda ng batas at ng Sangguniang Kabataan.

VI. MGA REKOMENDASYON
{recs}

Inihanda ni:
________________________________
SK Chairperson
Sangguniang Kabataan, Barangay Concepcion Dos, Marikina City
Petsa: {datetime.now().strftime('%B %d, %Y')}
"""
    else:
        narrative = f"""ACTIVITY / ACCOMPLISHMENT REPORT
{name.upper()}
Date: {date} | Venue: {venue}

I. OBJECTIVES
{objs}

II. ACTIVITIES CONDUCTED
{acts}

III. NARRATIVE
On {date}, the {name} was successfully conducted at {venue}. Out of {total} youth invited, {event['present']} actively participated, representing a {pct}% attendance rate. This demonstrates strong youth engagement and community support for the SK's programs.

IV. OUTCOMES AND ACCOMPLISHMENTS
{outs}

V. BUDGET UTILIZATION
Approved Budget : ₱{budget_approved:,.2f}
Amount Used     : ₱{budget_used:,.2f}
Savings         : ₱{savings:,.2f}

All expenditures were within approved allocations and compliant with RA 10742 fiscal guidelines.

VI. RECOMMENDATIONS
{recs}

Prepared by:
________________________________
SK Chairperson
Sangguniang Kabataan, Barangay Concepcion Dos, Marikina City
Date: {datetime.now().strftime('%B %d, %Y')}
"""

    return {
        "status":     "ok",
        "event_id":   event_id,
        "language":   language,
        "tone":       tone,
        "narrative":  narrative.strip(),
        "word_count": len(narrative.split()),
    }


@app.route("/tools/narrative", methods=["POST"])
def api_compile():
    data     = request.get_json(force=True)
    event_id = data.get("event_id", "")
    language = data.get("language", "english").lower()
    tone     = data.get("tone", "formal").lower()

    if not event_id:
        return jsonify({"status": "error", "message": "Missing event_id."}), 400

    result = compile_narrative(event_id, language, tone)
    return jsonify(result), 200


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="aSK Youth Narrative Compiler")
    parser.add_argument("--serve",    action="store_true")
    parser.add_argument("--port",     type=int, default=5004)
    parser.add_argument("--event",    type=str, default="sports_fest_2025")
    parser.add_argument("--language", type=str, default="english")
    parser.add_argument("--tone",     type=str, default="formal")
    args = parser.parse_args()

    if args.serve:
        print(f"[NarrativeCompiler] Serving on port {args.port}")
        app.run(host="0.0.0.0", port=args.port, debug=False)
    else:
        result = compile_narrative(args.event, args.language, args.tone)
        print(json.dumps(result, indent=2))
