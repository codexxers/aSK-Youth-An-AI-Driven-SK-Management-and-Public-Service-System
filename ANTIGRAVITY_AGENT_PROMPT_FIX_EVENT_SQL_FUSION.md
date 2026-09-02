# How to use this file

This replaces the Gemini-drafted fix, not the whole system — Test 11 (RAG retrieval of ABYIP scholarship programs) already passed and needs no changes. This is scoped entirely to Test 12's failure: the AI incorrectly claimed no 2026 events exist despite the live Events dashboard showing several. Paste into Antigravity in Planning Mode, review the plan, and **do not let it push to `main` without the verify steps below actually passing first** — this is a live, auto-deploying instance.

---

## ROLE & CONTEXT

You are working inside the **aSK//YOUTH AI** repository. Read `SYSTEM_ARCHITECTURE_CONTEXT.md` before touching anything — specifically the `isEventQuery()` / `fetchEventsAsContext()` SQL-fusion mechanism already documented as part of `buildRagContext()`, and the `/api/chat/stream` request shape, which already includes a `clientDateString` field sent by the frontend on every request.

## IMPORTANT — don't trust the architecture doc's schema table for this specific field

`SYSTEM_ARCHITECTURE_CONTEXT.md` was just regenerated with an explicit instruction to verify every claim against source — and it still documents `events.status` as `DEFAULT 'upcoming'`, "one of: upcoming, active, completed." That's the migration-time column definition, accurately re-confirmed. It is **not** what the live dashboard shows: the real Events & Attendance screen renders `Not Started` / `Active` / `Completed`, and unlike `users.status`, the `events.status` column has **no `CHECK` constraint** — meaning nothing stops the schema's documented default from silently diverging from whatever the actual event-creation code writes on every insert. That divergence is almost certainly the real bug, and it's exactly the kind of thing that survives a documentation pass that checks the table definition but not the application code that writes to it.

**Don't take either source — the doc, or the dashboard screenshot — as ground truth. Verify directly against the write path.**

## DIAGNOSE FIRST — confirm each of these before writing a fix, don't assume

1. **Find the actual literal status values the app writes.** Open `EventFormModal` (create/edit form) and find its status field — what literal string values does its dropdown/select actually submit? Then check the `POST`/`PATCH /api/events` handler — does it validate/transform the status value at all, or pass it straight through? If you can, also directly query a few live rows (`SELECT DISTINCT status FROM events`) to see what's actually stored — don't rely on the dashboard's rendered badge labels alone in case there's a display-side mapping you haven't found yet, and don't rely on the schema's `DEFAULT` clause either, since it may never actually be hit if the app always sets status explicitly on insert.
2. Open the actual current `fetchEventsAsContext()` implementation and find the exact SQL query it runs today. Compare its filter values against whatever you found in step 1 — this is likely where the mismatch lives.
3. Check `isEventQuery()`'s keyword/regex list against the actual failing message. Does it match Filipino phrasing like "naka-schedule," "susunod na buwan," "pinakamalapit"? If it doesn't match at all, the SQL fusion never runs regardless of query correctness — this is a separate, independently-fixable gap.
4. Check the month/year filtering logic the architecture doc describes ("parses the query for specific month names and YYYY patterns"). Does it correctly extract "September" + "2026" from the failing message even though they're embedded mid-Filipino-sentence in parentheses? And when the filtered month has zero matching events, what happens today — does it return an empty context (likely cause of the hallucinated "everything is from 2025" answer), or does anything already attempt a fallback?
5. Confirm whether `clientDateString` (sent in every `/api/chat` and `/api/chat/stream` request per the architecture doc) is actually being threaded through to wherever "today's date" gets used for this feature, or whether that part of the pipeline uses something else — a fresh server-side `new Date()`, for instance, which risks disagreeing with actual Philippine local time depending on Render's server timezone.

## ADDITIONAL FACTS

- The failing query was in Filipino: *"Anong mga events natin ang naka-schedule o 'Active' para sa susunod na buwan (September 2026)? Kung wala, ano ang pinakamalapit na upcoming event base sa database natin?"* — asking for September 2026 events, falling back to the closest upcoming event if none exist.
- The AI's actual (wrong) response claimed zero events exist and that "ang lahat ng nakatala ay mula sa 2025" (everything logged is from 2025) — flatly false; the dashboard shows multiple 2026 events.
- Once you've confirmed the real values in step 1, **update the architecture doc's `events.status` row too** (fix the `DEFAULT`/enum description to match reality, and consider whether a `CHECK` constraint should be added so this can't silently drift again) — as a small addendum to this task, not a full doc regeneration.

## FIX — apply precisely, don't rebuild what already exists

- **Fix `fetchEventsAsContext()` in place.** Do not create a second, separate, unconditionally-injected events block — keep this gated behind `isEventQuery()` exactly as it is today, so unrelated chat messages aren't bloated with the full events list.
- **Corrected query, using whatever step 1 of the diagnosis actually confirms as the real literal values** — not an assumed set. If it confirms `Not Started`/`Active`/`Completed` as the true stored values (matching the dashboard), the query becomes something like: `SELECT title, date, location, status FROM events WHERE status != 'Completed' ORDER BY date ASC` (excluding by what completion actually looks like is more robust than an explicit IN-list, since it doesn't need to be updated if a new non-completed status is ever added later). Note: this will include a `Not Started` event dated May 25, 2026 ("Defense Event"), which is chronologically before today (Aug 30, 2026) — that's a genuine data inconsistency in the seed/test data, not something to filter out in code. Surface it as-is in the context and flag it to the team as worth checking (possibly a stale test row, or a status that should've been updated).
- **If Task 1's diagnosis found the Filipino keyword gap is real**, extend `isEventQuery()`'s keyword list to cover common Filipino scheduling phrases — but only add what's actually needed to catch this class of query, verified against the regex, not padded speculatively.
- **Explicit "no match this month → nearest fallback" logic.** When month/year filtering (per Task 3) yields zero results, don't leave the context empty. Compute the nearest event by date to `clientDateString` among the non-`Completed` rows and inject it explicitly labeled as the fallback, e.g.:
  ```
  [DATABASE: EVENTS]
  Today's date is <clientDateString>.
  No events found for the requested period (September 2026).
  Closest upcoming/ongoing event: "<title>" on <date> at <location> — status: <status>.
  Full list of non-completed events, chronological:
  ...
  ```
  Don't rely on the model to infer "closest" correctly from a bare list — given it already fabricated a false claim once, make the fallback explicit in the injected text rather than implicit.
- **Use `clientDateString` as "today," not a fresh `new Date()` on the server** — wire this consistently everywhere "today" matters in this function.

## VERIFY — before pushing to `main`

Run all of these locally (or against a preview/staging deploy if one exists) and confirm actual pass/fail, don't take the model's own confidence as verification:

| # | Test | Expected |
|---|---|---|
| 1 | Re-run Test 11 exactly as before | Still passes — confirm no regression |
| 2 | Re-run Test 12 exactly as before (Filipino, September 2026) | States no September 2026 events exist, and explicitly surfaces the closest actual event (per current data, that's "Bayanihan Brigada: Community Clean-Up Drive 2026," Jul 18, 2026 — or acknowledges the currently `Active` "Event For Testing" if the query is read as also asking about right-now status) |
| 3 | Ask specifically about the currently `Active` event ("what's happening right now / ongoing") | Correctly identifies "Event For Testing" as ongoing since May 25, 2026 |
| 4 | Ask about a month that genuinely has events (e.g. June 2026) | Correctly lists the 3 June 2026 events with correct dates, no hallucinated ones |
| 5 | A completely unrelated, non-event chat message | No events context injected at all — confirms `isEventQuery()` gating still works and this fix didn't make it unconditional |

Only proceed to commit/push once all five actually pass in front of you.

## GUARDRAILS

- Don't touch the ABYIP background-knowledge global RAG scope, its relevance threshold, or its role gating — that's a completely separate mechanism from this. This fix is scoped entirely to the pre-existing `[DATABASE: EVENTS]` SQL-fusion path.
- Don't silently drop or "correct" the chronologically-odd `Not Started` "Defense Event" row — surface it as real data and flag it, don't filter around a possible bug in a way that hides it.
- Don't commit and push straight to `main` — this is a live, auto-deploying Render instance and you're mid-test-suite. Verify locally first.
