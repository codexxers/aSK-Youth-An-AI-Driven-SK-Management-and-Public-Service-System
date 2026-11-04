# aSK Youth: An AI-Driven SK Management and Public Service System
## User's Manual — Version 3.0

**Barangay Concepcion Dos, Marikina City**
**Sangguniang Kabataan — Official Documentation**

---

## Development Team

**System Developer:** Generoso B. Estrabon IV

**Documentation Team:**
- Daniel D. Kuan Wong
- Rich Mon P. Sy
- Jade M. Quilar

**Supervised by:** [Adviser Name]

Developed as a capstone project for the College of Computer Studies,
Our Lady of Fatima University – Antipolo City, 2027.

*All rights reserved. Designed exclusively for Barangay Concepcion Dos, Marikina City.*

---

## Table of Contents

- Chapter 1: Introduction to aSK Youth .............. 5
- Chapter 2: First-Time Access, Login, and the Global Interface .............. 7
- Chapter 3: For Youth Residents — Your Complete Guide .............. 17
- Chapter 4: For SK Officers — Event Management .............. 24
- Chapter 5: For SK Officers — AI Assistant and Document Tools .............. 30
- Chapter 6: For System Administrators — Platform Oversight .............. 37
- Chapter 7: Troubleshooting and Support .............. 46
- Appendix A: Glossary of Technical Terms .............. 50
- Appendix B: Data Privacy Act (RA 10173) — Relevant Provisions .............. 52
- Appendix C: SK Reform Act (RA 10742) — Relevant Provisions .............. 55
- Appendix D: Index .............. 58

---

# Chapter 1: Introduction to aSK Youth

---

## 1.1 Welcome to aSK Youth

Congratulations on accessing **aSK Youth: An AI-Driven SK Management and Public
Service System** — the official digital platform of the Sangguniang Kabataan (SK)
of Barangay Concepcion Dos, Marikina City.

aSK Youth was created with a single purpose: to bring the operations of the SK
into the modern era. For years, managing community events, tracking youth
participation, drafting official documents, and communicating program information
all required manual effort — paper sign-up sheets, hand-drafted resolutions, and
in-person inquiries at the Barangay Hall. aSK Youth replaces all of that with a
secure, accessible, and intelligent web platform that works on any device, any
time.

Whether you are a young resident curious about upcoming events, an SK Officer
coordinating a sports fest, or a System Administrator keeping the platform
running, this manual will guide you through every feature the system provides.

---

## 1.2 Background — The Problem This System Solves

Before aSK Youth, the SK of Barangay Concepcion Dos relied entirely on manual
processes to carry out its mandate under the SK Reform Act of 2015 (RA 10742):

- **Event attendance** was tracked using paper sign-up sheets, which were
  frequently lost, illegible, or duplicated.
- **Official documents** — resolutions, meeting minutes, certificates — were
  drafted from scratch each time, consuming hours of officer time with no
  standardized format.
- **Youth residents** had no reliable way to know what SK programs were available
  to them, short of visiting the Barangay Hall in person.
- **Budget reporting** had no digital trail, making year-end compliance reviews
  difficult and time-consuming.
- **Communication** between officers happened through informal messaging, with no
  audit record of decisions.

aSK Youth addresses every one of these pain points through a unified platform
that automates document generation, digitizes attendance via QR codes, makes
program information publicly accessible through an AI assistant, and provides
administrators with a full audit log of all system activity.

---

## 1.3 Key Features at a Glance

| Feature | What It Does |
|---|---|
| **AI Assistant (RAG)** | Answers questions about SK services in English or Filipino, with awareness of the current event calendar |
| **Event Management** | Create, edit, and categorize SK events; track live attendance per event |
| **QR Attendance Tracking** | Generate unique QR codes per event; youth scan to record attendance instantly |
| **Document Generator** | Fill a form → download an official SK document (Resolution, Minutes, Certificate, or Project Brief) as DOCX |
| **Suggestions Module** | Youth submit feedback; officers respond and track status |
| **FAQ Module** | Admins and Chairperson publish and manage official Q&A content |
| **Admin Dashboard** | Analytics, user management, audit logs, and system health monitoring |

---

## 1.4 System Architecture Overview

aSK Youth is a web-based system that runs entirely in the cloud. You do not need
to install any software, and there is no local data storage on your device. Here
is how the system is organized at a level that is useful to know as a user:

- **Your browser** is your interface. Everything you see — the login page, the
  chat, the event list — is delivered to your browser over a secure internet
  connection. Any modern browser on any device works.

- **The web server** receives your requests and serves the application. It
  manages your login sessions, enforces role permissions, and routes your
  actions to the right service.

- **The AI service** powers the AI Assistant chat. When you send a message,
  the system sends it securely to a cloud-based AI service, which generates
  the response. The AI service uses a multi-tier approach: if one AI provider
  is temporarily unavailable or has reached its daily request limit, the system
  automatically retries with a backup provider, then a second backup — so you
  are unlikely to experience an outage from a single provider issue.

- **The knowledge base** stores indexed summaries of official SK documents —
  programs, budgets, event details. This is what enables the AI to answer
  questions about specific SK data rather than giving generic answers. It is the
  ''R'' in RAG (Retrieval-Augmented Generation).

- **The data store** holds all structured records: events, user accounts,
  attendance records, suggestions, FAQ entries, and audit logs.

**What this means for you as a user:**

- The AI Assistant **requires a live internet connection**. It cannot work offline.
- When the server has been idle for a while, the **first AI response may take
  10–30 seconds** while the system wakes up. Subsequent messages will be faster.
- Closing your browser tab **ends your session automatically**. The next time
  you open the app, you will see the login page again. This is by design
  for security.

[Insert Screenshot Here — Simple architecture diagram showing Browser -> Web Server
-> AI Service (with multi-tier fallback) and Knowledge Base and Database.
No role logged in. Callout A points to the browser layer. Callout B points to the
AI service. Callout C points to the knowledge base and data store.]

---

## 1.5 System Requirements and Supported Devices

| Requirement | Specification |
|---|---|
| **Browsers** | Google Chrome, Microsoft Edge, Mozilla Firefox, Apple Safari (latest version) |
| **Internet** | Minimum 10 Mbps for smooth AI streaming |
| **Devices** | Desktop, laptop, tablet, smartphone — fully responsive |
| **Camera** | Required only for QR code attendance scanning (Youth role) |
| **Account** | Required for SK Officers, Chairperson, and System Admins only |
| **Registration** | Not required for Youth residents |

> **Tip:** For the best experience with the AI Assistant's real-time text
> streaming, use Google Chrome on a desktop or laptop.

---

## 1.6 Understanding User Roles — The Four-Role Model

aSK Youth organizes all users into four roles. Each role grants access to a
different set of modules. Your role is determined when your account is created
by the System Administrator (for Officers and Admins) or assigned automatically
when you choose "Continue as Youth."

| Capability | Youth | SK Officer | SK Chairperson | System Admin |
|---|:---:|:---:|:---:|:---:|
| 💬 AI Assistant | ✅ | ✅ | ✅ | ✅ |
| 📷 Scan Attendance (QR) | ✅ | — | — | — |
| 💡 Submit Suggestions | ✅ | ✅ | ✅ | ✅ |
| 📅 Event Management (create/edit) | — | ✅ | ✅ | ✅ |
| 🗂️ Document Generator | — | ✅ | ✅ | ✅ |
| ❓ FAQ (view) | ✅ | ✅ | ✅ | ✅ |
| ❓ FAQ (add/edit) | — | — | ✅ | ✅ |
| 🛡️ Admin Dashboard | — | — | ✅ | ✅ |
| 👥 User Management | — | — | — | ✅ |
| 📜 Audit Logs | — | — | — | ✅ |
| 🩺 System Health | — | — | — | ✅ |
| 🤖 AI Document Drafting via Chat | — | ✅ | ✅ | ✅ |

> **Note:** The SK Chairperson and System Admin both have access to the Admin
> Dashboard, but only the System Admin sees the Audit Logs and System Health tabs.
> Only the System Admin can create, modify, or delete user accounts.

---

## 1.7 Before You Begin — Quick Start Checklist

**For Youth Residents:**
- [ ] Open a supported browser
- [ ] Navigate to the aSK Youth URL
- [ ] Click **Continue as Youth** — you're in

**For SK Officers and SK Chairperson:**
- [ ] Confirm you have received your username and password from the System Admin
- [ ] Open a supported browser
- [ ] Navigate to the aSK Youth URL
- [ ] Enter your credentials and click **Sign In**

**For System Administrators:**
- [ ] Confirm you have your admin username, password, and Authorization Token
- [ ] Log in via the standard Sign In flow
- [ ] After login, you will land directly on the Admin Dashboard

---

*End of Chapter 1*

---

# Chapter 2: First-Time Access, Login, and the Global Interface

This chapter walks every type of user through getting into aSK Youth for the first
time — whether you are a youth resident browsing community events or an SK Officer
signing in with your official account. It also introduces the main interface so
every user knows exactly where to find things before the feature-specific chapters
begin.

---

## 2.1 Before You Begin — Access Requirements

aSK Youth is a fully web-based platform. There is nothing to install from an app
store and no registration process for general youth residents. All you need is:

- **A modern web browser.** Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple
  Safari — all updated to their latest versions — are supported. Older browser
  versions may display layout inconsistencies.

- **A stable internet connection.** The AI Assistant relies on a live connection to
  cloud servers. A minimum of 10 Mbps is recommended for smooth AI response
  streaming.

- **A device with a camera** (for QR attendance scanning only). Any smartphone with
  a working camera and a QR-capable browser is sufficient.

- **Your credentials** (for SK Officers, SK Chairperson, and System Admins only).
  Your username and password are issued exclusively by the System Administrator.
  Youth residents do not need credentials.

> **Tip:** aSK Youth works on mobile phones, tablets, laptops, and desktop
> computers. The interface adjusts automatically to fit your screen size.

![Login page at askyouth.online showing the SYSTEM ACCESS form with Username, Password, Sign In button, and Continue as Youth button.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss12.png)

---

## 2.2 Navigating to the Login Page

Open your preferred web browser and type the aSK Youth URL into the address bar,
then press **Enter**. The system will load the login page within a few seconds.

**What you will see:**

The login page is the entry point for all users regardless of role. It displays:

- The **aSK//YOUTH.AI** logo at the top in a blue-to-cyan gradient, with the
  subtitle "Sangguniang Kabataan • Barangay Concepcion Dos" beneath it.
- A glass-effect card containing the login form in the center of the screen.
- A dark, animated background with subtle blue and cyan glowing orbs.
- A small role reference grid at the bottom of the card listing the four available
  roles: Youth Member, SK Officer, SK Chairperson, and System Administrator.

![Login page with annotated callouts showing the login form layout and the four-role indicator at the bottom.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss12.png)

---

## 2.3 Accessing the System as a Youth Resident

Youth residents of Barangay Concepcion Dos do not need a username or password. A
shared guest session is available by default, giving immediate access to all
Youth-level features.

**Steps to log in as a Youth resident:**

1. On the login page, locate the **"Continue as Youth"** button. It appears below
   the Sign In button, separated by a divider labeled "or."

2. Click **Continue as Youth**.

3. The system will authenticate you automatically in the background and load the
   main interface. No credentials are required.

4. You will land on the **AI Assistant** view by default, which is the starting
   screen for all Youth users.

![Login page with arrows highlighting the Continue as Youth button (for youth residents) and credential fields (for officers).](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss12.png)

> **Important:** Because the Youth session is shared, it does not store personal
> data. Your chat history and submissions are associated with the session but not
> with a named account. Youth users cannot access event management, admin controls,
> or the Official Reports module.

---

## 2.4 Logging In as an SK Officer, Chairperson, or System Admin

Official accounts for SK Officers, the SK Chairperson, and System Administrators
are created and issued exclusively by the System Administrator. If you do not have
an account, see Section 2.7 (Requesting Account Creation).

**Steps to log in with an official account:**

1. On the login page, locate the **Username** field (identified by a person icon on
   the left). Click on it and type your assigned username.

2. Click on the **Password** field (identified by a lock icon) and type your
   password.

   - To reveal your password while typing, click the **eye icon** on the right side
     of the password field. Click it again to hide the password.

3. The **Sign In** button will become active (blue-to-cyan gradient) once both
   fields contain text. Click **Sign In**.

4. The system verifies your credentials against the server. A brief spinning
   indicator labeled "Authenticating..." will appear on the button while this
   happens.

5. Upon successful authentication, you will be redirected to your role-appropriate
   starting view:
   - **SK Officers** land on the **AI Assistant** view.
   - **SK Chairperson** lands on the **AI Assistant** view.
   - **System Administrators** land on the **Admin Dashboard** view directly.

![Login page at askyouth.online with credential entry callouts and the Continue as Youth button labeled.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss12.png)

![Post-login interface for SK Officer: annotated with 1. Top Bar (aSK//YOUTH.AI), 2. Left Menu (sidebar with modules), and 3. Center (AI chat workspace with greeting message).](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss14.png)

> **Note:** The Sign In button is intentionally disabled if either field is blank.
> This prevents accidental empty-credential submissions.

---

## 2.5 Understanding the Security Lockout Policy

To protect official accounts from unauthorized access attempts, aSK Youth enforces
a strict login attempt limit. This policy applies to **SK Officer, SK Chairperson,
and System Admin accounts only** — the Youth guest login is not subject to lockout.

### 2.5.1 How the Lockout Works

The server tracks failed login attempts per username. The rules are:

| Condition | Result |
|---|---|
| 1–4 consecutive wrong passwords | Warning displayed with attempts remaining |
| 5th consecutive wrong password | Account locked for **15 minutes** |
| Correct password entered (before lockout) | Counter resets to zero |
| 15 minutes elapsed after lockout | Lock clears automatically |

### 2.5.2 The Attempts Remaining Warning

After each incorrect password (attempts 1 through 4), an **amber warning banner**
appears on the login page, directly below the error message. It states:

> *"X attempt(s) remaining before lockout."*

This counter decreases with each wrong attempt, giving you clear advance notice
before the account is locked.

![Login page showing the red error banner 'Invalid username or password. 3 attempts remaining before lockout.' and the amber warning banner below it.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss1.png)

### 2.5.3 The Lockout Countdown Banner

When the fifth consecutive wrong password is entered, a **red lockout banner**
replaces the normal error banner. The banner displays:

- A lock icon on the left.
- The heading **"Account Temporarily Locked"** in red.
- A live **MM:SS countdown timer** (e.g., `14:58`, `14:57`…) counting down to
  zero in real time.
- The message: *"You can contact the System Administrator to have your account
  unlocked immediately."*

While the countdown is active, the Sign In button is disabled and cannot be
clicked. The form will not submit even if the Enter key is pressed.

![Login page in locked state showing ACCOUNT TEMPORARILY LOCKED banner with a 14:55 countdown timer and the System Administrator contact note.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss6.png)

### 2.5.4 Resolving a Lockout

You have two options:

**Option 1 — Wait.** When the countdown reaches 00:00, the lockout clears
automatically on the server. The banner disappears and you may attempt to log in
again with fresh attempts.

**Option 2 — Contact the System Admin.** If 15 minutes is too long (for example,
if access is urgently needed for an SK event), contact your System Administrator.
The admin can lift the lockout instantly from the Users tab in the Admin Gateway —
see Section 6.6 for the admin-side procedure.

> **Important:** The lockout is enforced by the server, not the browser. Refreshing
> the page, clearing your cookies, or using a different browser on the same device
> does **not** reset the timer. The server-side counter persists until the 15 minutes
> expire or an admin clears it manually.

---

## 2.6 The Login Page Role Reference

At the bottom of the login card, a small four-item grid displays the available
roles in the system. Each role is represented by a colored dot and its full title:

| Dot Color | Role |
|---|---|
| 🔴 Red | System Administrator |
| 🟡 Amber/Gold | SK Chairperson |
| 🔵 Blue | SK Officer |
| 🟢 Green | Youth Member |

This grid is for reference only — it does not affect how you log in. It is intended
to remind users which role type their credentials belong to, so they know what to
expect after logging in.

---

## 2.7 Requesting Account Creation (SK Officers & Admins)

Official accounts cannot be self-registered. If you are a new SK Officer or a new
System Administrator and do not yet have credentials, contact the current System
Administrator. The admin will:

1. Open the **Admin Gateway** and go to the **Users** tab.
2. Click **+ Authorize Account** (the account creation button).
3. Fill in your full name, assign your role, set a username and initial password.
4. Enter the required **Authorization Token** to confirm creation.
5. Inform you of your credentials.

See Chapter 6 (System Administration) for the complete account creation walkthrough.

---

## 2.8 The Global Interface Tour

Once you are logged in, the main application interface surrounds your working area.
Understanding its structure will help you navigate confidently throughout this
manual.

The interface is composed of three primary areas:

![Annotated full-screen layout: 1. Top Bar (aSK//YOUTH.AI brand), 2. Left Menu (sidebar with modules), 3. Center workspace (AI chat).](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss14.png)

### 2.8.1 The Hamburger Menu Button (Top-Left)

A **☰ (three-line) button** is fixed to the top-left corner of the screen at all
times, regardless of which module is open. Clicking it toggles the left sidebar
open or closed.

- On **desktop**, the sidebar opens to the left of the main workspace and stays
  open until you close it manually.
- On **mobile**, the sidebar slides in from the left as an overlay. A semi-transparent
  backdrop covers the main content behind it. Tapping anywhere on the backdrop
  closes the sidebar.

### 2.8.2 The Left Sidebar

When the sidebar is open, it contains two sections:

**Top section — Recent Chat Threads:**
A scrollable list of your previous AI Assistant conversations, labeled "Recent
Threads." Each thread shows the conversation title. You can:
- **Click** any thread to switch back to that conversation.
- **Pin** a thread (it rises to the top of the list).
- **Rename** a thread (double-click or use the three-dot "..." menu).
- **Delete** a thread permanently (from the three-dot "..." menu, then confirm).
- **Create a new chat** by clicking the **"+ New Chat"** button at the top of the
  sidebar.

**Bottom section — Modules navigation:**
A vertical list of module buttons labeled "Modules." The modules shown depend on
your role. Clicking any module button switches the main workspace to that module.
A blue dot beside the active module name indicates your current location.

### 2.8.3 Module Access by Role

Not all modules are visible to every role. The table below shows exactly which
modules each role can see in their sidebar:

| Module | Youth | SK Officer | SK Chairperson | System Admin |
|---|:---:|:---:|:---:|:---:|
| 💬 AI Assistant | ✅ | ✅ | ✅ | ✅ |
| 📷 Scan Attendance | ✅ | — | — | — |
| 💡 Suggestions | ✅ | ✅ | ✅ | ✅ |
| 📅 Event Management | — | ✅ | ✅ | ✅ |
| 🗂️ Official Reports | — | ✅ | ✅ | ✅ |
| ❓ FAQ | ✅ | ✅ | ✅ | ✅ |
| 🛡️ Admin Dashboard | — | — | ✅ | ✅ |

> **Note:** The Scan Attendance module is the QR code scanner, visible only to
> Youth users — Officers and Admins manage the QR generation side, not scanning.
> The Admin Dashboard (which includes the Admin Gateway) is visible to both System
> Admins **and** the SK Chairperson.

### 2.8.4 The Notification Bell

A **bell icon** (🔔) appears in the top-right area of the main workspace at all
times. It checks for upcoming events and alerts you when an event is approaching.
Clicking a notification in the dropdown will navigate you directly to the Events
module.

### 2.8.5 The Main Workspace

The large area to the right of the sidebar is the **Main Workspace**. This is where
each module renders its content — the chat interface, the events list, the document
generator, the admin dashboard, and so on. The workspace fills the entire remaining
screen area and adapts its layout to the active module.

---

## 2.9 Signing Out

To end your session:

1. Open the sidebar (click the hamburger ☰ button if it is closed).
2. Scroll to the **bottom of the sidebar**.
3. Your name and role are displayed in a small section above a **"Sign Out"**
   button (or similarly labeled logout control).
4. Click **Sign Out**. Your session token is immediately cleared and you are
   returned to the login page.

> **Note:** aSK Youth stores your session token in the browser's session storage,
> not in a persistent cookie. This means closing the browser tab or window will
> automatically end your session. The next time you open the app, you will see the
> login page again.

---


---

# Chapter 3: For Youth Residents — Your Complete Guide

---

## 3.1 What Youth Users Can Access

As a Youth resident, you have immediate, no-registration access to the platform.
Your available modules are:

- **💬 AI Assistant** — Ask questions, get answers, attach files
- **📷 Scan Attendance** — Scan a QR code to record event attendance
- **💡 Suggestions** — Submit feedback, complaints, and ideas to the SK
- **❓ FAQ** — Browse official answers to common questions about SK programs

These modules are accessible from the sidebar once you are logged in as a Youth
user.

---

## 3.2 The Youth Dashboard — Your Starting Point

When you log in as a Youth user, you are taken directly to the **AI Assistant**
view. This is the primary interface for Youth users, designed to help you
discover SK services and events quickly.

![AI Assistant view as a Youth user. Greeting reads 'aSK//YOUTH.AI Initialized. Good Morning, Youth Youth.' Youth module sidebar visible.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss20.png)

---

## 3.3 Using the AI Assistant

The AI Assistant is aSK Youth's most powerful tool for Youth residents. It
operates 24 hours a day, 7 days a week and can answer questions about SK
programs, upcoming events, community services, and more — in either English or
Filipino.

### 3.3.1 How the AI Works (RAG Technology)

The AI uses a technique called **Retrieval-Augmented Generation (RAG)**. Instead
of answering from general knowledge alone, it:

1. Reads your question.
2. Searches the official SK database (events, programs, budgets, FAQs) for
   relevant information.
3. Combines what it finds with its language understanding to compose an accurate,
   context-aware answer.

This means the AI answers based on **actual SK data**, not guesses. If an event
is not in the system, the AI will say so rather than invent details.

![AI Assistant showing the RAG sources panel: user asked about RA 10742 compliance for an event, AI responded with a budget summary and cited source 'abyip_2025' at 56% match. The SOURCES panel shows the matched document snippet.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss7.png)

### 3.3.2 Asking Questions — English and Filipino

The AI is bilingual. You can ask in English, Filipino (Tagalog), or a mix of
both (Taglish). The system detects the language of your message and responds
in kind:

**English example:**
> *"What events are coming up this month?"*
> → AI responds in English, listing upcoming events from the database.

**Filipino example:**
> *"Ano po ang mga programa ng SK para sa kabataan?"*
> → AI responds in Filipino, summarizing available SK youth programs.

**To start a conversation:**
1. Click **💬 AI Assistant** in the sidebar Modules section.
2. Type your question in the message input box at the bottom of the chat pane.
3. Press **Enter** or click the **Send** button (arrow icon).
4. The AI will respond in real time — text streams word by word as it generates.

![AI chat bilingual demonstration: user typed 'kumusta' (Filipino greeting) and the AI responded in Filipino: 'Kumusta! Maayos naman ako. Paano kita matutulungan...' confirming the date and offering SK assistance.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss8.png)

### 3.3.3 Starting a New Conversation

Each conversation is saved as a **Thread** in your sidebar. To start a fresh
conversation:

1. Click **+ New Chat** at the top of the sidebar.
2. A blank chat pane opens.
3. Begin typing your question.

Previous threads remain in the sidebar and can be revisited at any time by
clicking them.

### 3.3.4 Attaching Files for Analysis

You can attach files to your message and ask the AI to summarize or explain them.

1. Click the **Attach** (paperclip / clip icon) in the chat input area.
2. Select one or more files from your device. Up to **8 files** per message are
   accepted. Any file type is supported.
3. Type a message alongside your file (e.g., "Summarize this document" or
   "What does this say?").
4. Press **Send**. The AI will read the attached file content and respond.

[Insert Screenshot Here — AI Assistant with a file attached (shown as a badge in
the input area) and a summary response from the AI. Role: Youth. Callout A points
to the file attachment badge. Callout B points to the AI's summary response.]

### 3.3.5 AI Limitations to Know

| Situation | What Happens |
|---|---|
| **Internet drops mid-message** | The message fails. The AI does not auto-retry — resend manually when connection restores. | See the screenshot below for what this looks like:

![AI chat showing UPLINK FAILED error: after the AI responded in Filipino, the next message 'ano ang mga ganap ngayon?' returned the error 'UPLINK FAILED: Failed to fetch', indicating the connection dropped mid-session.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss8.png)
| **Cold start (server was idle)** | First response may take 10–30 seconds. Subsequent messages are faster. |
| **You ask to draft an official document** | As a Youth user, the AI will politely decline and direct you to the SK Secretariat. Document drafting is an Officer/Chairperson feature only. |
| **You ask about something not in the SK database** | The AI will say it does not have that information rather than guess. |

> **Important:** The AI cannot take any actions on your behalf — it cannot
> register you for an event, submit a suggestion, or modify any data. It only
> provides information and answers.

---

## 3.4 Browsing the Events Calendar

The **📅 Event Management** module is not visible to Youth users in their sidebar.
However, you can ask the AI Assistant about upcoming events and it will retrieve
current event information from the database.

For scanning into an event, you use the **Scan Attendance** module (see 3.5).

---

## 3.5 Attending SK Events — QR Code Check-In

When you attend an SK event, your presence is recorded using a QR code that the
SK Officer displays at the venue entrance. This replaces paper sign-up sheets
entirely.

**Steps to check in via QR:**

1. Arrive at the SK event venue.
2. Locate the SK Officer holding a device (tablet or phone) displaying the QR
   code, or a printed QR code posted at the entrance.
3. In the aSK Youth app, tap **📷 Scan Attendance** in your sidebar Modules.
4. Your device camera will activate.
5. Point your camera at the QR code displayed by the officer.
6. The system will read the code and record your attendance automatically.
7. A confirmation message will appear on your screen indicating successful
   attendance recording.

![QR scan success screen shown on a mobile device browser (askyouth.online): full-screen green background with a large white checkmark and 'Successfully Recorded!' text in white bold. 'Tap to dismiss' appears below. The mobile browser address bar is visible at top.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss5.png)

![Scan Attendance module with camera viewfinder active. Title: 'Scan Attendance'. Subtitle: 'Point your camera at the Event QR code shown by the SK Officer.' Youth sidebar (AI Assistant, Scan Attendance, Suggestions, FAQ) visible. Guest Youth user.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss19.png)

> **Important:** If your attendance has already been recorded for this event, the
> system will display a message indicating this. Your attendance will not be
> duplicated.

> **Note:** If your browser requests camera permission, tap **Allow**. If you
> previously denied camera access, open your browser settings, find site
> permissions, and set Camera to "Allow" for the aSK Youth URL. Then reload the
> page.

---

## 3.6 Submitting Suggestions and Feedback

You can send feedback, ideas, and complaints directly to the SK through the
**💡 Suggestions** module. All submissions are reviewed by Officers and the
Chairperson.

**Steps to submit a suggestion:**

1. Click **💡 Suggestions** in the sidebar Modules.
2. The submission form appears at the top of the page.
3. Choose a **Category** from the dropdown:
   - **General** — general feedback
   - **Event Idea** — suggestions for new SK events
   - **Complaint** — concerns or complaints about SK services
   - **App Feedback** — feedback about the aSK Youth platform itself
4. Type your suggestion or feedback in the text box (the field marked *"What's
   on your mind? Any suggestions for SK?"*).
5. Click **Submit Suggestion**.
6. Your submission is recorded with your name and role attached automatically.

![Suggestions module: Submit Feedback form with Category dropdown (General), text area placeholder 'What''s on your mind?', Submit Suggestion button. ALL SUGGESTIONS (25) list below shows submitted items with SK RESPONSE boxes.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss15.png)

> **Tip:** Be as specific as possible in your suggestion. SK Officers can see your
> name and role when they review submissions, so they can follow up with you
> directly if needed.

---

## 3.7 Browsing the FAQ

The **❓ FAQ** module contains official answers to common questions about SK
programs and services, published by the SK Chairperson or System Administrator.

**To browse the FAQ:**
1. Click **❓ FAQ** in the sidebar Modules.
2. FAQ entries are displayed as expandable cards organized by category.
3. Click any question to expand and read the official answer.
4. You cannot edit or delete FAQ entries as a Youth user — viewing only.

---

*End of Chapter 3*

---

---

# Chapter 4: For SK Officers — Event Management

---

## 4.1 SK Officer Privileges

As an SK Officer, you have access to everything a Youth user can see, plus:

- **📅 Event Management** — Create, edit, and manage all SK events
- **🗂️ Official Reports (Document Generator)** — Generate formal SK documents
- **🤖 AI Document Drafting** — Ask the AI to draft proposals, resolutions, and
  budgets (the AI is authorized to produce full drafts for Officers)
- **💡 Suggestions (Officer View)** — Review and respond to youth submissions

---

## 4.2 The Event Management Module

The **📅 Event Management** module is the central hub for all SK program activity.
Click **📅 Event Management** in your sidebar to open it.

### 4.2.1 The Event Catalog

When you open Event Management, you see a catalog of all SK events — upcoming
and completed. The catalog includes:

- **Filter by Category:** Narrow the list by event type. Available categories are:
  Sports, Seminar, Scholarship, Assembly, Community, Livelihood, General,
  Cultural, Health, and Others.
- **Filter by Status:** Toggle between **Upcoming** and **Completed** events.
- **Sort controls:** Sort the events list by different criteria.

![Events & Attendance list view with Search bar, Category dropdown (open showing all categories), Status dropdown, and + Add button. Event rows show name, date, location, category, and EDIT/EVENT LOG actions.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss17.png)

### 4.2.2 Reading an Event Card

Each event in the catalog is displayed as a card showing:
- Event title
- Category badge
- Date, time, and location
- Attendance count (total, male, female breakdown)
- Budget allotted
- Status (Upcoming / Completed)
- **Edit** and **QR** action buttons

### 4.2.3 Creating a New Event

1. Click the **+ Create Event** button (or similar create button) at the top of
   the Event Management module.
2. A form modal opens with the following fields:

| Field | Description |
|

![Event Management Dashboard view showing the live attendance overview: TOTAL ATTENDEES stat at top, and an ACTIVE EVENTS - ATTENDANCE SCANNING section with a green 'Event For Testing → Show QR Code →' button. The DASHBOARD and EVENTS toggle buttons appear at the top-right corner.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss18.png)
---|---|
| **Title** | The name of the event |
| **Description** | A short summary of what the event is about |
| **Category** | Select from: Sports, Seminar, Scholarship, Assembly, Community, Livelihood, General, Cultural, Health, Others |
| **If "Others"** | A "Specify Category" field appears — type a custom label |
| **Date** | Event date |
| **Time** | Event start time |
| **Location** | Venue or address |
| **Organizer** | Name of the organizing group or officer |
| **Status** | Upcoming or Completed |
| **Requirements** | Any requirements for attendees (optional) |
| **Contact** | Point of contact for inquiries |
| **Attendees** | Expected total attendee count |
| **Male Count** | Expected male attendees |
| **Female Count** | Expected female attendees |
| **Staff Count** | Number of SK staff involved |
| **Budget Allotted** | Budget in Philippine Pesos (optional) |

3. Fill in all required fields.
4. Click **Save** (or **Create Event**). The event will appear in the catalog
   immediately and will be visible to Youth users in the AI's event knowledge base.

[Insert Screenshot Here — Create Event modal with all fields visible. Role:
SK Officer. Callout A points to the Category dropdown. Callout B points to the
Date field. Callout C points to the Male/Female count fields. Callout D points
to the Save button.]

### 4.2.4 Editing an Existing Event

If event details change (venue, time, speaker), update the event so the AI
and the catalog reflect the correct information.

1. Find the event in the catalog.
2. Click the **Edit (pencil) icon** on the event card.
3. The same form opens, pre-filled with the current details.
4. Make your changes.
5. Click **Update Event** (or **Save**). Changes take effect immediately.

### 4.2.5 Generating the Attendance QR Code

Each event has its own unique QR code. Youth scan this code to check in.

1. Find the event in the catalog.
2. Click the **QR icon** (or **Generate QR**) on the event card.
3. A QR code is displayed in a modal.
4. Options:
   - **Display on screen:** Show this QR on a tablet at the venue entrance for
     youth to scan with their phones.
   - **Print:** Send the QR to your printer and post it at the entrance.
5. As youth scan the code, the attendee counter on the event card updates in
   real time.

![Attendance Event Log modal for 'Event For Testing': QR code displayed with SCAN TO REGISTER subtitle, attendance log below showing three attendees with timestamps and ATTENDED status badges.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss10.png)

### 4.2.6 Monitoring Live Attendance

The event card's attendance counter updates as youth scan the QR code. You can:

- See the **total** number of check-ins
- See the **male/female breakdown** of attendance recorded so far
- Compare against the original estimate you set when creating the event

---

## 4.3 Responding to Suggestions (Officer View)

As an Officer, the Suggestions module shows you a view of submitted feedback
with status management tools. You can filter suggestions by status (Pending,
Reviewed, etc.) and mark items as reviewed to keep the queue organized.

---

*End of Chapter 4*

---

---

# Chapter 5: For SK Officers — AI Assistant and Document Tools

---

## 5.1 The AI Assistant — Officer Mode

When an SK Officer is logged in, the AI Assistant behaves differently from Youth
mode. The AI is authorized to:

- **Draft formal SK documents** — resolutions, project proposals, event briefs —
  using parameters you provide.
- **Answer complex budget and governance questions** with an understanding of your
  role's authority.
- **Produce meeting minutes** outlines and certificates of recognition drafts.

The "redirect to Secretariat" rule that applies to Youth users does not apply to
Officers and above. The AI will produce full drafts on request.

### 5.1.1 Sample Officer Prompts

| What You Want | What to Type |
|---|---|
| Draft a sports fest resolution | "Draft an SK Resolution for our upcoming Sports Fest with a budget of ₱45,000 on July 15 at the Multi-Purpose Court." |
| Create a project brief | "Write a project brief for a livelihood seminar for 50 youth, budget ₱20,000, happening in August." |
| Summarize a law | "Summarize what RA 10742 says about how SK funds must be allocated." |
| Review a document you attach | Attach the file + "Review this document and suggest improvements." |

> **Note:** The AI drafts text for review — it does not automatically save or
> submit anything to the database. Copy the AI's output and use it in the Document
> Generator to produce a properly formatted, downloadable file.

![AI Assistant in SK Officer mode: user requested budget breakdown of SK events. AI responded with 2025 ABYIP data showing two programs (Edu-Aksyon PHP 200,000 and Turnover of Sports Equipment PHP 200,000).](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss3.png)

---

## 5.2 The Document Generator (Official Reports Module)

The **🗂️ Official Reports** module provides a form-based document generator.
You fill in the fields, click Generate, and download a properly formatted
official SK document as a DOCX file.

Click **🗂️ Official Reports** in your sidebar to open it.

### 5.2.1 The Four Templates

[Insert Screenshot Here — Document Generator module showing the four template
cards. Role: SK Officer. Callout A points to the "SK Resolution" card.
Callout B points to the "Meeting Minutes" card. Callout C points to the
"Certificate of Recognition" card. Callout D points to the "Project Brief"
card.]

| Template | When to Use |
|---|---|
| **📜 SK Resolution** | To formally resolve and approve a matter during an SK session |
| **📝 Meeting Minutes** | To record the official proceedings of an SK meeting |
| **🏆 Certificate of Recognition** | To recognize a youth resident or organization for a contribution |
| **📊 Project Brief** | To formally propose an SK activity or project for approval |

### 5.2.2 Generating an SK Resolution

1. Click **📜 SK Resolution** from the template grid.
2. The form below the grid updates to show the Resolution fields.
3. Fill in:

| Field | Description |
|---|---|
| **Series No.** | e.g., 001 |
| **Year** | e.g., 2025 |
| **Resolution Title** | e.g., "Resolution Approving the Summer Sports Fest" |
| **WHEREAS (1)** | First whereas clause (required) |
| **WHEREAS (2) — optional** | Second whereas clause if needed |
| **RESOLVED** | The main resolution clause |
| **RESOLVED FURTHER — optional** | Additional clause if needed |
| **Day** | e.g., 15th |
| **Month** | e.g., July |
| **SK Chairperson Name** | Full name for signature block |
| **SK Secretary Name** | Full name for signature block |

4. Select **DOCX** from the Format dropdown (PDF option is also available).
5. Click **Generate DOCX**.
6. The document downloads automatically to your device's Downloads folder.

![Document Generator form (Meeting Minutes template) with fields filled: Agenda Items, Proceedings, Action Items, Adjournment Time, Prepared By, Noted By. Download notification shows 'minutes_document.docx 8.8 KB Done.'](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss2.png)

### 5.2.3 Generating Meeting Minutes

1. Click **📝 Meeting Minutes** from the template grid.
2. Fill in:

| Field | Description |
|---|---|
| **Date** | e.g., July 15, 2025 |
| **Time** | e.g., 2:00 PM |
| **Venue** | e.g., Barangay Hall, Concepcion Dos |
| **Presiding Officer** | SK Chairperson or acting chair |
| **Attendees** | One name per line |
| **Agenda Items** | One item per line |
| **Proceedings / Discussion** | Full narrative of the meeting discussion |
| **Action Items** | One action per line |
| **Adjournment Time** | e.g., 4:30 PM |
| **Prepared By** | SK Secretary's full name |
| **Noted By** | SK Chairperson's full name |

3. Click **Generate DOCX** to download.

### 5.2.4 Generating a Certificate of Recognition

1. Click **🏆 Certificate of Recognition** from the template grid.
2. Fill in:

| Field | Description |
|---|---|
| **Recipient Name** | Full name of the awardee |
| **Purpose / Recognition** | Description of the award or contribution |
| **Additional Details — optional** | Extra context for the certificate |
| **Day, Month, Year** | Date of issuance |
| **SK Chairperson Name** | Full name for signature |
| **Barangay Captain Name** | Full name for countersignature |

3. Click **Generate DOCX** to download.

### 5.2.5 Generating a Project Brief

1. Click **📊 Project Brief** from the template grid.
2. Fill in:

| Field | Description |
|---|---|
| **Name of Project / Activity** | e.g., Gabi ng Kabataan 2025 |
| **Location** | Venue for the project |
| **Target Date of Implementation** | e.g., December 15, 2025 |
| **Background / Rationale** | Why this project is needed |
| **Objective** | What the project aims to achieve |
| **Target Physical Output** | Measurable output (e.g., 200 youth attended) |
| **Target Beneficiaries** | Who will benefit |
| **Budget (Php)** | Total budget in pesos |
| **Prepared By — Name** | Full name of preparer |
| **Prepared By — Title/Position** | e.g., SK Chairperson |

3. Click **Generate DOCX** to download.

> **Tip:** For any of the four templates, you can use the AI Assistant first to
> draft the content, then copy the AI's output into the form fields. This
> combination — AI drafting + Document Generator formatting — produces
> publication-ready official documents in minutes.

---

*End of Chapter 5*

---

---

# Chapter 6: For System Administrators — Platform Oversight

---

## 6.1 The Admin Dashboard — Your Control Center

When you log in as a System Administrator, you land directly on the
**🛡️ Admin Dashboard**. This is the nerve center of the entire platform.

### 6.1.1 The Admin Dashboard Tabs

The Admin Dashboard has four tabs:

| Tab | Visible To | Contents |
|---|---|---|
| **📊 Analytics** | Admin + Chairperson | Event statistics chart, summary stat cards |
| **👥 Users** | Admin + Chairperson | User directory, account management |
| **📜 Audit** | Admin only | Full system audit log with CSV export |
| **🩺 System Health** | Admin only | Server diagnostics and AI telemetry |

![Admin Gateway with Analytics tab active showing four tabs (Analytics, Users, Audit, System Health), stat cards (Budget Utilized P2,558,500; Pending Suggestions 6), and event bar and donut charts.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss16.png)

### 6.1.2 Analytics Tab — The Overview

The Analytics tab shows:

- **TOTAL SK EVENTS** — Total number of events recorded in the system.
- **ACTIVE ATTENDEES** — Total combined attendance across all events.
- **BUDGET UTILIZED** — Total budget allotted across all recorded events,
  in Philippine Pesos.
- **Event Statistics Chart** — A bar chart showing participation and budget data
  per event. The chart supports sorting (ascending/descending) and can be
  filtered to show the Top 5, Top 10, or all events.
- A **Refresh** button (circular arrows icon) updates all data in real time.

![Admin Analytics tab showing event statistics bar chart (events sorted by attendees) and Budget Allocation by Category donut chart (Sports 37.7%, Scholarship 33.2%, Community 13.7%).](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss16.png)

---

## 6.2 User Management — The Users Tab

The **👥 Users** tab is where all operator accounts are managed. Youth guest
sessions do not appear here — only provisioned accounts (Officers, Chairperson,
and Admins) are listed.

### 6.2.1 Viewing the User Directory

The Users tab displays a table of all registered accounts with these columns:
- **Username** — Login identifier
- **Full Name** — Legal name of the account holder
- **Role** — Their privilege tier (admin, chairman, officer)
- **Status** — Active or Inactive
- **Created** — Date the account was created
- **Actions** — Deactivate button, Edit button, and (if locked) a Lift button

![Admin Dashboard Users tab: Registered Operators (12) showing all accounts with USERNAME, ROLE TIER badges (ADMIN/OFFICER/CHAIRMAN), STATUS (ACTIVE/INACTIVE dots), CREATED LINK dates, and PRIVILEGE CONTROLS (EDIT/DEACTIVATE) per row. + Authorize Account button top-right.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss9.png)

### 6.2.2 Creating a New Account

1. Click **+ Authorize Account** (or the account creation button) at the top of
   the Users tab.
2. A form modal opens. Fill in:
   - **Full Name** — the user's legal name
   - **Username** — a unique login identifier
   - **Password** — initial password (the user should change this after first
     login)
   - **Role** — choose from: SK Officer, SK Chairperson, or System Admin

   > **Important:** Only one account can hold the SK Chairperson role at a time.
   > If a Chairperson account already exists, the Chairman option will be shown
   > as unavailable until the existing Chairperson account is reassigned.

3. Enter the **🔐 Authorization Token** in the token field. This token is
   required for all account creation operations and must be obtained from the
   authorized IT administrator.
4. Click **Create User** (or **Authorize**). The account is added to the
   directory immediately.

### 6.2.3 Modifying an Account

To change a user's name, role, status, or password:

1. Find the user in the directory table.
2. Click the **Edit** button on their row. The **Modify Account** modal opens.
3. You can update:
   - **Full Legal Name**
   - **Privilege Tier (Role)**
   - **Status** (Active / Inactive)
   - **Password** (leave blank to keep unchanged)
4. Enter the **🔐 Authorization Token** — this is required for every
   modification, not just password changes.
5. Click **Apply Changes**.

![MODIFY ACCOUNT: OFFICETEST modal showing Full Legal Name field, Privilege Tier dropdown (with Admin / Chairman Already Assigned / Officer options), New Password field, Authorization Token field, and DELETE ACCOUNT + Cancel + Apply Changes buttons.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss11.png)

### 6.2.4 Deactivating an Account

Deactivating an account immediately prevents the user from logging in, without
permanently removing the account. The account can be reactivated later.

1. Find the user in the directory.
2. Click the **Deactivate** button on their row.
3. A single confirmation dialog appears asking you to confirm.
4. Click **Confirm** (or equivalent). The user's status changes to **INACTIVE**
   and they can no longer sign in.

To reactivate, click **Activate** (the button toggles based on current status).

### 6.2.5 Permanently Deleting an Account

Account deletion is irreversible. A two-step confirmation process protects
against accidental deletion.

1. Find the user in the directory.
2. Click the **Edit** button on their row to open the **Modify Account** modal.
3. At the bottom-left of the modal, click **🗑 Delete Account**.
4. **Step 1:** A confirmation dialog appears asking: *"Delete this account?"*
   Click **Delete** to proceed.
5. **Step 2:** A second dialog appears. Type the account's **exact username** in
   the text box to confirm. The final delete button is disabled until the
   username is typed correctly.
6. Click **Confirm Deletion**. The account is permanently removed.

[Insert Screenshot Here — Second deletion confirmation dialog with the username
type-to-confirm input field. Role: System Admin. Callout A points to the text
input field. Callout B points to the disabled/active Confirm Deletion button.
Callout C shows the username that must be typed.]

> **Caution:** Deleted accounts cannot be recovered. If you are unsure, use
> **Deactivate** instead.

### 6.2.6 Resolving a Locked Account (Lifting a Lockout)

When a user's account is locked due to 5 failed login attempts, a
**🔒 Locked** badge with a countdown timer appears next to their name in
the Users tab.

1. Find the locked user in the directory — the badge and timer make them easy
   to spot.
2. Click the **Lift** button beside the lockout badge.
3. The lockout is cleared immediately on the server. The user can log in again
   right away.

[Insert Screenshot Here — Users tab row showing a locked account with the
lockout timer badge and the Lift button visible. Role: System Admin. Callout A
points to the lockout timer badge (showing e.g. "8m 30s locked"). Callout B
points to the Lift button.]

---

## 6.3 Audit Log — The Audit Tab

![Admin Dashboard Audit tab: full log table with columns Timestamp, Actor Entity, Role Tier (color-coded badge), Action Command (linked verbs like view_user_list, login_success), Target Payload, Diagnostic Output, and IP Source. EXPORT LOGS (CSV) button at top right.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss13.png)

The **📜 Audit** tab (visible to System Admins only) shows a full chronological
log of all significant actions in the system — logins, account changes, event
creations, document generations, and more.

**To export the audit log:**
1. Open the **📜 Audit** tab.
2. Click **Export CSV**.
3. A CSV file downloads to your device containing the complete audit record.
4. Open in Microsoft Excel or Google Sheets for review and compliance
   documentation.

> **Note:** The export contains all records since the system was initialized.
> It is recommended to export and archive the log at the end of each SK term.

---

## 6.4 System Health Monitoring

The **🩺 System Health** tab (visible to System Admins only) provides server
and AI diagnostics:

- **AI Query Log** — A rolling buffer of recent AI queries sent to the system,
  with timestamps and response status.
- **Server uptime and memory indicators** (if available).

Use this tab to:
- Monitor AI usage patterns
- Detect unusual or suspicious query activity
- Troubleshoot AI response failures by checking if the AI engine is responding

![System Health tab showing four stat cards (Memory Usage 51%, Python Engine Offline, Vector DB 23 chunks, SQLite 0.23 MB), Maintenance Actions (Backup Now / Restore Backup), and AI/Server Log Viewer with recent log entries.](C:\Users\DIStressCodeTech\.gemini\antigravity-ide\brain\c68524a7-8c0a-4646-81bc-23a6d5d9337c\screenshots\ss4.png)

---

## 6.5 The FAQ Module — Admin and Chairperson Edition

Both the SK Chairperson and System Admin can add and edit FAQ entries. Officers
and Youth users can only view them.

**To add a new FAQ entry:**
1. Open **❓ FAQ** from the sidebar Modules.
2. Click **+ Add FAQ** (visible only to admin/chairperson roles).
3. Fill in:
   - **Question** — the FAQ question text
   - **Answer** — the official answer
   - **Category** — topic category
   - **Order** — display position number (lower = higher on the list)
   - **Status** — Published, Draft, or Archived
   - **Visibility** — Public or Restricted
4. Click **Save**.

**To edit an existing entry:**
Click **Edit** beside the FAQ card. Make your changes and click **Save**.

---

*End of Chapter 6*

---

---

# Chapter 7: Troubleshooting and Support

---

## 7.1 Login and Authentication Issues

| Problem | Cause | Solution |
|---|---|---|
| "Invalid credentials" error | Wrong username or password | Double-check your username. Passwords are case-sensitive. |
| "Account Temporarily Locked" banner with countdown | 5 consecutive wrong passwords | Wait for the timer to reach 00:00, then try again. Or contact the System Admin to lift the lockout immediately. |
| Amber "X attempts remaining" warning | 1–4 failed attempts so far | Be extra careful on your next attempt. Consider contacting the Admin to reset your password if unsure. |
| Sign In button is greyed out / disabled | Username or password field is empty | Both fields must have text before the button activates. |
| "Cannot reach server" error | Backend server is offline or unreachable | Check your internet connection. If the connection is fine, wait a few minutes and try again — the server may be restarting. |
| Forgot password | Not a self-service reset | Contact the System Administrator. They can reset your password via the Modify Account modal. |

---

## 7.2 AI Assistant Issues

| Problem | Cause | Solution |
|---|---|---|
| Message fails to send | Internet connection dropped mid-request | Check your connection, then resend the message manually. |
| No response for 30+ seconds | AI engine is warming up (cold start) | Wait — the first message of a new session may take up to 30 seconds. The engine is loading. |
| AI replies in the wrong language | The AI mirrors your input language | If you want Filipino, include Filipino words in your message ("po", "opo", Tagalog words). If you want English, write in English. |
| AI refuses to draft a document | You are logged in as Youth | Document drafting is only available to SK Officers, Chairperson, and Admins. |
| AI gives an outdated event date | The event database may not have been updated | Contact the SK Officer responsible for Event Management to update the event record. |
| File attachment not accepted | File may be too large or count exceeds 8 files | Keep total file count to 8 or fewer per message. |

---

## 7.3 QR Code Scanning Issues

| Problem | Cause | Solution |
|---|---|---|
| "Camera Permission Denied" | Browser blocked camera access | Tap the lock icon in your browser's URL bar → set Camera to "Allow" → reload the page. |
| Camera opens but QR won't scan | QR code is too far away or screen glare | Move closer. Shield the QR from direct sunlight. Ensure the QR is clearly lit. |
| "Attendance Already Recorded" | You scanned the same code twice | Your attendance is safe — no duplicate created. No action needed. |
| Scan Attendance module not visible | Your role is not Youth | The QR scanner is only in the Youth module list. Officers manage QR generation, not scanning. |

---

## 7.4 Document Generator Issues

| Problem | Cause | Solution |
|---|---|---|
| Clicking "Generate DOCX" does nothing | Backend may be loading or an error occurred | Check the red error message that appears below the button. Note the error text and report it to IT support. |
| Download starts but file is corrupt | Browser or network interrupted the download | Try generating again. Use Chrome for the most reliable download behavior. |
| Document fields are blank in the downloaded file | Required fields were left empty | Review all fields before generating. Optional fields are labeled; all others should be filled. |
| "Generation failed" error message | Server error during document creation | Wait 30 seconds and try again. If the error persists, report it to the System Administrator with the exact error message. |

---

## 7.5 General Connectivity Issues

| Problem | Cause | Solution |
|---|---|---|
| The page is blank or white on load | JavaScript failed to load | Hard refresh: press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac). |
| Sidebar modules are missing | Role not loaded correctly | Sign out, sign back in. If issue persists, contact IT support. |
| Data (events, users) not showing | API request failed | Click the Refresh button (if visible) or reload the page. |

---

## 7.6 Support Contacts

**For policy, event, or program questions:**
Visit the SK Secretariat at Barangay Concepcion Dos Hall, Marikina City.

**For account issues (password reset, lockout):**
Contact the current System Administrator directly. They are the only person who
can modify account credentials.

**For technical platform issues:**
Contact the development team through your designated IT support channel or the
contact information provided by the college.

---

*End of Chapter 7*

---

---

# Appendix A: Glossary of Technical Terms

| Term | Definition |
|---|---|
| **AI (Artificial Intelligence)** | Software that simulates human reasoning to understand language, retrieve information, and generate text responses. |
| **API (Application Programming Interface)** | The communication bridge between the frontend (browser) and the backend (server). When the app loads data or sends a message, it uses the API. |
| **Authentication Token (Admin Token)** | A special secret code required to authorize high-privilege actions such as creating or modifying user accounts. Separate from your login password. |
| **Backend** | The server-side component of aSK Youth — runs on Node.js, stores the database, handles AI requests, and processes document generation. |
| **DOCX** | The standard file format for Microsoft Word documents. aSK Youth generates documents in this format. |
| **FAQ (Frequently Asked Questions)** | A curated list of questions and official answers published by SK officials for public reference. |
| **Frontend** | The browser-side component of aSK Youth — the visual interface you see and interact with, built with React. |
| **JWT (JSON Web Token)** | The secure session credential stored in your browser after login. It expires after 24 hours (officer/admin) or 12 hours (youth). |
| **Lockout** | A temporary 15-minute account suspension triggered by 5 consecutive failed login attempts. |
| **QR Code (Quick Response Code)** | A two-dimensional barcode that encodes event attendance links. Youth scan these codes to check in to events. |
| **RAG (Retrieval-Augmented Generation)** | The AI technique used by aSK Youth where the AI searches the SK database before answering, ensuring answers are grounded in official records rather than general knowledge alone. |
| **Role** | A permission level that controls which modules and actions a user can access. The four roles are: Youth, SK Officer, SK Chairperson, and System Admin. |
| **Session Storage** | A browser feature that stores your login token temporarily. Unlike cookies, it is cleared when you close the browser tab. |
| **SK (Sangguniang Kabataan)** | The youth council mandated by Philippine law to govern youth affairs at the barangay level. |
| **SSE (Server-Sent Events)** | The technology that allows the AI's responses to stream word by word in real time rather than appearing all at once after a long wait. |
| **SQLite** | The database engine used by aSK Youth to store all events, users, logs, suggestions, and FAQ entries on the backend server. |
| **Status (Event)** | Whether an event is "Upcoming" (not yet held) or "Completed" (already held). |
| **Status (Account)** | Whether a user account is "Active" (can log in) or "Inactive" (deactivated). |
| **Template** | A pre-structured document format in the Document Generator. The four templates are: SK Resolution, Meeting Minutes, Certificate of Recognition, and Project Brief. |

---

# Appendix B: Data Privacy Act (RA 10173) — Relevant Provisions

aSK Youth was built in compliance with the **Data Privacy Act of 2012 (Republic
Act 10173)**. The following provisions directly govern how this system collects
and uses personal data.

> **For the full text of RA 10173, visit the official National Privacy Commission
> website:** [https://www.privacy.gov.ph](https://www.privacy.gov.ph) or the
> Official Gazette at [https://www.officialgazette.gov.ph](https://www.officialgazette.gov.ph)

---

### What Personal Data aSK Youth Collects

Based on the actual system database schema, aSK Youth stores the following:

| Data Field | Stored For | Purpose |
|---|---|---|
| Full Name | Officer / Admin accounts | Account identification and document signatures |
| Username | All accounts | Login credential |
| Password (hashed) | All accounts | Authentication — stored as a bcrypt hash, never in plain text |
| Role | All accounts | Access control |
| Account Status | All accounts | Active/inactive session gating |
| Event Attendance | Youth QR scans | Participation tracking |
| Suggestion Content | Youth submissions | Program improvement feedback |
| Suggestion Submitter Name/Role | Youth submissions | Identity attached to feedback for SK officer follow-up |
| IP Address | Login attempts | Security — recorded in audit log for lockout tracking |
| Action Logs | All roles | Audit trail of system events |

**aSK Youth does not collect:** financial information, home addresses, contact
numbers, biometric data, or any data beyond what is listed above.

---

### Key RA 10173 Provisions Applied

**Section 11 — General Data Privacy Principles**

Personal data must be processed fairly and lawfully. aSK Youth collects data
only for specific, legitimate SK governance purposes and does not use it for any
other purpose.

*Applicable to this system:* Attendance data is used solely for event
participation reporting. Suggestion content is used solely for SK program
improvement. Login logs are used solely for security auditing.

**Section 13 — Sensitive Personal Information and Privileged Information**

The act requires heightened protection for sensitive data. Passwords in aSK Youth
are stored using **bcrypt hashing** — a one-way cryptographic algorithm — meaning
even System Administrators cannot retrieve or view any user's plain-text password.

**Section 16 — Rights of the Data Subject**

Data subjects (users) have the right to:
- **Access** their personal information held by the system.
- **Erasure or blocking** — request the SK Secretariat to delete their account
  and associated records.
- **Rectification** — request corrections to inaccurate information.

To exercise any of these rights, contact the SK Secretariat at Barangay Concepcion
Dos Hall or the System Administrator directly.

**Section 20 — Security of Personal Information**

Organizations processing personal data must maintain security measures. aSK Youth
implements:
- Password hashing (bcrypt) for all stored credentials
- JWT tokens with expiration for session management
- Audit logging of all significant system actions
- Role-based access control restricting data access by privilege level

---

# Appendix C: SK Reform Act (RA 10742) — Relevant Provisions

aSK Youth's event management, budget tools, and document templates are designed
to support compliance with the **Sangguniang Kabataan Reform Act of 2015
(Republic Act 10742)**.

> **For the full text of RA 10742, visit:**
> [https://www.officialgazette.gov.ph](https://www.officialgazette.gov.ph) or
> the Commission on Elections (COMELEC) SK guidelines portal.

---

### How RA 10742 Shapes This System

**Section 5 — Composition of the Sangguniang Kabataan**

The SK is composed of a Chairperson and seven (7) SK members elected by
registered Katipunan ng Kabataan members. aSK Youth's role model reflects this
by providing distinct privilege levels for the Chairperson (executive functions)
and Officers (management functions) while maintaining Youth-level access for the
general resident population.

**Section 14 — Meetings**

The SK is required to hold regular sessions and keep official meeting minutes.
The **Meeting Minutes** template in the Document Generator directly supports
this requirement by providing a standardized, officially formatted record of
SK sessions.

**Section 15 — Functions of the Sangguniang Kabataan**

The SK is mandated to, among other functions:
- Promote programs addressing the needs of the youth
- Represent the youth sector in local governance
- Create and implement youth development programs

aSK Youth's event management, AI assistant, and public-facing suggestion system
directly support these functions by enabling officers to organize programs and
giving youth a channel to participate and provide feedback.

**Section 18 — SK Fund**

The SK is allocated a share of the municipality's Internal Revenue Allotment
for youth programs. A mandatory **10% allocation to the Sangguniang Kabataan
Education Fund** is required by law. When Officers use the AI Assistant to
draft budgets, the AI is aware of RA 10742 fund allocation rules and can flag
non-compliant budget structures when asked.

*Example prompt for budget compliance check:*
> "We have a budget of ₱100,000. Does this proposed allocation comply with
> RA 10742?"

The AI will analyze the allocation against the statutory requirements and advise
accordingly.

**Sections 16 and 17 — SK Resolutions and Ordinances**

Formal SK actions must be enacted through resolutions. The **SK Resolution**
template in the Document Generator is structured in compliance with standard
Philippine local legislative document formats, including the requisite WHEREAS
clauses, RESOLVED clause, and signature blocks for the Chairperson and Secretary.

---

# Appendix D: Index

**A**
- Account creation — 6.2.2
- Account deletion — 6.2.5
- Account deactivation — 6.2.4
- Account modification — 6.2.3
- Admin Dashboard — 6.1
- Analytics tab — 6.1.2
- Attendance, QR — 3.5, 4.2.5
- Attempts remaining warning — 2.5.2
- Authorization Token — 6.2.2, 6.2.3
- Audit Log — 6.3

**B**
- Background of aSK Youth — 1.2
- Budget, event — 4.2.3
- Budget compliance (RA 10742) — Appendix C

**C**
- Camera permission — 7.3
- Certificate of Recognition template — 5.2.4
- Chat threads — 3.3.3
- Cold start (AI) — 3.3.5, 7.2
- Continue as Youth button — 2.3

**D**
- Data Privacy (RA 10173) — Appendix B
- Delete account — 6.2.5
- Document Generator — 5.2
- DOCX format — 5.2.2, Glossary

**E**
- Event categories — 4.2.1
- Event creation — 4.2.3
- Event editing — 4.2.4
- Event Management module — 4.2

**F**
- FAQ module — 3.7, 6.5
- File attachments (AI) — 3.3.4

**G**
- Glossary — Appendix A

**H**
- hamburger menu — 2.8.1

**I**
- Interface tour — 2.8

**J**
- JWT token — Glossary

**L**
- Lift lockout — 2.5.4, 6.2.6
- Login — 2.3, 2.4
- Login lockout policy — 2.5
- Lockout countdown — 2.5.3

**M**
- Meeting Minutes template — 5.2.3
- Module access by role — 2.8.3

**N**
- New Chat (button) — 3.3.3
- Notification bell — 2.8.4

**O**
- Officer privileges — 4.1

**P**
- Password — 2.4
- Password, forgot — 5.1 (table), 7.1
- Password, show/hide — 2.4
- Project Brief template — 5.2.5

**Q**
- QR code, generating — 4.2.5
- QR code, scanning — 3.5
- QR scanning errors — 7.3

**R**
- RA 10173 — Appendix B
- RA 10742 — Appendix C
- RAG (Retrieval-Augmented Generation) — 3.3.1, Glossary
- Role reference grid — 2.6
- Roles, the four — 1.6

**S**
- Scan Attendance module — 3.5
- Security lockout — 2.5
- Session storage — 2.9, Glossary
- Sign Out — 2.9
- SK Reform Act — Appendix C
- Suggestions module — 3.6
- System Admin, role — 1.6
- System Architecture — 1.4
- System Health tab — 6.4
- System Requirements — 1.5

**T**
- Templates (Document Generator) — 5.2.1
- Troubleshooting — Chapter 7

**U**
- User Management — 6.2
- Users tab — 6.2.1

**W**
- Welcome — 1.1

---
