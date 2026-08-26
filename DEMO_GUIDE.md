# aSK Youth — System Demo Guide
**Sangguniang Kabataan, Barangay Concepcion Dos, Marikina City**
> Login as **SK Officer**, **Chairman**, or **System Admin** for Objectives 1–2 (document & budget tools require L2+). Objective 3 uses the web dashboard. Objective 4 works for all roles.

---

## Objective 1 — Automate Preparation of Official SK Documents and Project Resolutions

*Login required: SK Officer (L2) or higher*

---

### Demo 1-A — SK Resolution

**Where:** AI Assistant → Chat

**Prompt to type:**
```
Draft an SK Resolution adopting the 2026 Annual Youth Investment Program (AYIP) for Barangay Concepcion Dos.
```

**Expected Output:**
- AI acknowledges the request in 1–2 sentences
- AI triggers document_generator (resolution type)
- System responds with download link + preview:
  `SK Resolution — Adopting the 2026 Annual Youth Investment Program`

---

### Demo 1-B — Meeting Minutes

**Where:** AI Assistant → Chat

**Prompt to type:**
```
Generate minutes of the meeting held on May 25, 2026 at 10:00 AM in the Barangay Hall Function Room, presided by the SK Chairperson. Agenda: Budget planning for SK Youth Leadership Summit 2026 and approval of new officers.
```

**Expected Output:**
- AI triggers document_generator (minutes type)
- Download link for SK_minutes_[timestamp].docx
- Preview: `Minutes of the Meeting — May 25, 2026`

---

### Demo 1-C — Certificate of Recognition

**Where:** AI Assistant → Chat

**Prompt to type:**
```
Make a Certificate of Recognition for Maria Santos for her outstanding volunteer work during the SK Sports Fest 2025 held on July 15, 2025 at the Barangay Concepcion Dos Multi-Purpose Court.
```

**Expected Output:**
- AI triggers document_generator (certificate type)
- Download link for SK_certificate_[timestamp].docx
- Preview: `Certificate of Recognition for Maria Santos`

---

## Objective 2 — AI-Driven Budget Estimation (Analyze Expenditures, Detect Imbalances)

*Login required: SK Officer (L2) or higher*

---

### Demo 2-A — Standard Budget Estimate (Under PHP 50k limit)

**Where:** AI Assistant → Chat

**Prompt to type:**
```
Estimate the budget for a community clean-up drive with 80 participants.
```

**Expected Output:**
```
Here is the estimated budget for your community cleanup with 80 participants:

Budget Breakdown
  • Materials and Equipment: ₱4,800.00
  • Venue Setup / Logistics: ₱0.00
  • Certificates / Tokens: ₱1,600.00
  • Contingency Fund (8%): ₱515.00

Subtotal: ₱6,400.00
Estimated Total: ₱6,915.00

Estimated total is within typical SK activity budget range per RA 10742...
```

---

### Demo 2-B — Large Event (Triggers RA 10742 Over-Budget Warning)

**Where:** AI Assistant → Chat

**Prompt to type:**
```
Estimate budget for a sports event with 600 participants and include meals.
```

**Expected Output:**
```
Here is the estimated budget for your sports event with 600 participants (meals included):

Budget Breakdown
  • Materials and Equipment: ₱48,000.00
  • Venue Setup / Logistics: ₱18,000.00
  • Certificates / Tokens: ₱15,000.00
  • Meals / Refreshments: ₱72,000.00
  • Contingency Fund (10%): ₱15,300.00

Subtotal: ₱153,000.00
Estimated Total: ₱168,300.00

WARNING: Estimated total (₱168,300.00) exceeds the ₱50,000 soft guideline for single
SK activities under RA 10742. Consider splitting into multiple activity budgets or seek
DILG pre-approval.
```

---

### Demo 2-C — Cultural Event Budget

**Where:** AI Assistant → Chat

**Prompt to type:**
```
Can you estimate the budget for a cultural event (Linggo ng Kabataan celebration) with 200 participants including meals?
```

**Expected Output:**
- Itemized breakdown (cultural event rates: ₱120/person materials, ₱60 venue, ₱25 certificate + ₱120 meals)
- Total shown with compliance note (warning fires if total exceeds PHP 50k)

---

## Objective 3 — Digital Record-Keeping and Participation Tracking

*Uses the web dashboard — no AI chat needed for most of these*

---

### Demo 3-A — View Event Attendance via Dashboard

**Where:** Dashboard → Events & Attendance

**Steps:**
1. Log in as Admin or Officer
2. Click Events tab in the navigation
3. Find "Youth Leadership Seminar 2025" (Aug 20, 2025)
4. Click EVENT LOG button on that row

**Expected Output:**
- Event log modal opens showing:
  - Registered attendees list (name, gender, address, timestamp)
  - Attendee count at top of modal
  - All timestamps in Philippine time (SGT/PHT)

---

### Demo 3-B — QR Code Event Registration (Participation Tracking)

**Where:** Mobile phone camera / Web App QR Scanner

**Steps:**
1. Log in as Admin → go to an upcoming event → click SHOW QR
2. Open phone camera and point at QR code on screen
3. Phone browser opens → automatically logs in as Youth → opens event attendance form
4. Fill in name, gender, address → click Register

**Expected Output:**
- Registration success confirmation shown
- Attendee count for that event increases by 1 in real time
- New entry appears in EVENT LOG with timestamp

---

### Demo 3-C — AI Fetches Live Attendance Data

**Where:** AI Assistant → Chat (as System Admin or Officer)

**Prompt to type:**
```
Can you tell me the attendance of the event "Youth Leadership Seminar 2025" that happened Aug 20, 2025?
```

**Expected Output:**
```
Based on the SK events database, the Youth Leadership Seminar 2025 held on August 20, 2025
at the Barangay Hall Function Room had 120 attendees recorded (55 Male, 65 Female) with 8
staff members.
```
- Numbers match exactly what is in the Events dashboard
- AI does NOT fabricate demographics, schedules, or satisfaction rates

---

## Objective 4 — AI-Powered Chatbot for Automated Assistance and Guidance

*Works for all roles — Youth (L1), Officer (L2), Chairman (L3), System Admin (L4)*

---

### Demo 4-A — Youth Asking About Events (Live DB Query)

**Where:** AI Assistant → Chat (logged in as Youth)

**Prompt to type:**
```
What events are coming up?
```

**Expected Output:**
- AI pulls live data from events database, lists only events with status = upcoming:
  ```
  Here are the upcoming events in Barangay Concepcion Dos:
  - SK Youth Leadership Summit 2026 — June 5, 2026 at Barangay Hall...
  - Kabataang Makisap: Health & Wellness Fair 2026 — June 14, 2026...
  ```
- AI does NOT invent events not in the database

---

### Demo 4-B — Jurisdiction Enforcement Test

**Where:** AI Assistant → Chat (any role)

**Prompt to type:**
```
Are there any SK events in Barangay Tumana this week?
```

**Expected Output:**
```
That's outside my area of operation. I can only assist with SK matters for Barangay
Concepcion Dos, Marikina City. For other barangays, please contact their respective SK
office or the Marikina City Youth Development Office.
```

---

### Demo 4-C — Time & Date Awareness (Live Server Clock)

**Where:** AI Assistant → Chat (any role)

**Prompt to type:**
```
What time is it and what is today's date?
```

**Expected Output:**
- AI reads the injected SYSTEM_TIMESTAMP (server Philippine time, UTC+8)
- Example: `It's 3:33 PM on May 25, 2026, Philippine time.`
- Time matches your actual system clock — no guessing or hallucinating

---

> **Note:** Objective 5 (ISO/IEC 25010 evaluation) is a researcher-conducted usability and performance evaluation — not a chatbot demo. It involves user testing, surveys, and system benchmarking conducted separately.
