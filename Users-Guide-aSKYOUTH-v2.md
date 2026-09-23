# aSK Youth — Complete User Manual (v2)

---

## PART 1: INTRODUCTION & GETTING STARTED

### 1.1 Welcome to aSK Youth
Welcome to **aSK Youth: An AI-Driven SK Management and Public Service System**. This platform is designed specifically for Barangay Concepcion Dos, Marikina City, to streamline how the Sangguniang Kabataan (SK) operates. By integrating artificial intelligence, automated document generation, and digital attendance tracking, aSK Youth brings public service directly to your fingertips. Whether you are a youth resident looking to join an event, an SK Officer planning a budget, or a System Admin managing users, this manual will guide you through every feature.

### 1.2 System Requirements & Supported Devices
aSK Youth is a web-based platform. You do not need to download or install any applications from an app store. To ensure a smooth experience, please ensure you meet the following requirements:
- **Supported Browsers:** Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari (updated to the latest versions).
- **Internet Connection:** A stable internet connection (at least 10 Mbps) is required. The AI Chatbot relies on cloud connectivity to function.
- **Supported Devices:** Desktop computers, laptops, tablets, and smartphones. The interface is fully responsive.
- **Hardware:** For QR code scanning, a device with a working camera is required.

### 1.3 User Roles Explained
aSK Youth divides its features across three distinct roles to ensure data privacy and ease of use.
- **Youth (Guest / Resident Level):** The default role for registered residents. You can view the calendar, register for events, scan QR codes for attendance, submit suggestions, and chat with the AI about public SK matters.
- **SK Officer (Management Level):** For elected SK officials. You have access to the Youth features, plus the ability to create events, generate QR codes, estimate project budgets using AI, and automate the drafting of official documents (like Resolutions and Minutes).
- **System Admin (Oversight Level):** For IT staff and the SK Chairperson. You have access to all features, plus user management, role assignments, system health monitoring, and the ability to export comprehensive PDF/DOCX reports.

### 1.4 Accessing the System (Youth)
There is no need to register or create an account if you are a youth resident of Barangay Concepcion Dos. A guest user account is available by default for your convenience.

**To access the system as a Youth:**
1. Open your web browser and navigate to the aSK Youth URL.
2. Click the **Continue as Youth** button on the welcome screen.
3. You will immediately access the Youth Dashboard.

*[INSERT FULL-PAGE SCREENSHOT: Login Page highlighting the "Continue as Youth" button with callout letter A]*

### 1.5 Logging In (SK Officers & Admins)
Security is a top priority. Official accounts for SK Officers and the Chairperson are securely provisioned by the System Admin. The login system includes safeguards against unauthorized access.

**To log in to your official account:**
1. Navigate to the login page.
2. Enter your assigned username.
3. Enter your password.
4. Click **Sign In**.

**Security Lockout Policy:**
If you enter an incorrect password **five (5) consecutive times**, your account will be temporarily locked for **15 minutes**. This prevents brute-force attacks. You must wait for the timer to expire before trying again.

*[INSERT FULL-PAGE SCREENSHOT: Login Page and Lockout Warning message with callout letters A, B, C]*

### 1.5.1 Account Management (Admins Only)
Account management is strictly handled by System Administrators. To ensure security, creating privileged accounts (like a new Admin or SK Officer) requires a special **Authentication Code** (admin token).

**To create a new user (Admin only):**
1. Navigate to **User Management** in the admin dashboard.
2. Click **Add New User**.
3. Fill out the user details and assign a role (e.g., SK Officer, System Admin).
4. If creating a privileged account, enter the required **Authentication Code** (token) to authorize the creation.
5. Click **Create User**.

### 1.6 Global Interface Tour
No matter your role, the main interface is built around three core areas:
- **The Header (Top Bar):** Contains the current date, your profile menu, a notification bell for alerts, and a quick Sign Out button.
- **The Sidebar (Left Menu):** Your main navigation hub. It expands and collapses to save space. Click here to jump between the Dashboard, Events, Chat, and other modules.
- **The Main Workspace (Center):** Where the active module displays its data.
- **The AI Widget (Bottom Right):** A floating button that allows you to open the AI Chatbot from any screen.

*[INSERT FULL-PAGE SCREENSHOT: Complete UI layout with red bounding boxes highlighting the Header, Sidebar, Workspace, and AI Widget]*

---

## PART 2: THE YOUTH EXPERIENCE (General Residents)

### 2.1 Youth Dashboard Overview
When a Youth user logs in, the system presents a streamlined dashboard. The goal is to get you involved in community events as quickly as possible.
- **Upcoming Events Panel:** Shows a countdown to the next SK activity.
- **Recent Announcements:** Displays bulletins from the SK Chairperson.
- **Quick Links:** Buttons to jump directly to Event Registration or the Suggestion Box.

*[INSERT FULL-PAGE SCREENSHOT: Youth Dashboard highlighting the welcome message and quick links]*

### 2.2 Using the AI Chatbot (RAG)
The AI Chatbot is your 24/7 digital assistant for SK matters. It uses Retrieval-Augmented Generation (RAG) to read the official SK database and answer your questions accurately.

#### 2.2.1 How the AI Works (English/Tagalog)
The chatbot is bilingual. If you ask a question in English (e.g., "What are the upcoming events?"), it will reply in English. If you use Tagalog or Taglish keywords (e.g., "Ano ang mga events natin po?"), the system will automatically detect this and respond in fluent Filipino. 

#### 2.2.2 Asking About SK Services
**To chat with the AI:**
1. Click the **Chat** tab on the sidebar.
2. Type your question in the message box at the bottom.
3. Ask questions like: "How do I apply for the scholarship?", "Where is the sports fest?", or "What is the SK doing for education?"
4. Press **Send**. The AI will search the SK database and provide an authoritative answer within seconds.

#### 2.2.3 Uploading Documents for Analysis
You can upload a document and ask the AI to explain it to you.
1. Click the **Upload** icon next to the chat box.
2. Select a PDF or DOCX file from your device.
3. Type a message like, "Summarize this document for me."
4. Press **Send**.

#### 2.2.4 Chat Limitations & Network Dependency
- **Cloud Dependency:** The AI requires a stable internet connection. If your connection drops, the chat will fail to send. The system will automatically attempt to retry the connection.
- **Cold Starts:** If the AI has not been used by anyone for a while, your first message might take 5–10 seconds longer to process as the cloud engine "wakes up."

*[INSERT FULL-PAGE SCREENSHOT: Chat interface showing a bilingual conversation and a document upload]*

### 2.3 Browsing the SK Calendar
The Events module lets you see everything the SK has planned for the year.
1. Click **Events** on the sidebar.
2. You will see a list of event cards.
3. Use the **Category Dropdown** to filter by Sports, Education, Health, or Governance.
4. Use the **Year Dropdown** to look at past events.

*[INSERT FULL-PAGE SCREENSHOT: Events catalog with filter dropdowns highlighted]*

### 2.4 Registering for Upcoming Events
When you find an event you want to attend, registering is just one click.
1. Click on the event card to open its details.
2. Review the date, time, location, and requirements.
3. Click the **Register** button.
4. You will receive a notification confirming your slot.

*[INSERT FULL-PAGE SCREENSHOT: Event details modal with the Register button highlighted]*

### 2.5 Tracking Your Event Attendance via QR
To prove you attended an event, aSK Youth uses QR codes instead of paper sign-up sheets.
1. When you arrive at the venue, locate the SK Officer holding a tablet or printed QR code.
2. Open your smartphone's camera or any QR scanner app.
3. Point your camera at the QR code.
4. Tap the link that appears on your screen.
5. You will see a green **"Attendance Recorded"** checkmark on your screen.

*[INSERT FULL-PAGE SCREENSHOT: Smartphone view of a successful QR attendance scan]*

### 2.6 Submitting Suggestions & Feedback
Your voice matters. You can send feedback directly to the SK Officers.
1. Go to the **Suggestions** tab.
2. Fill out the subject and your detailed message.
3. You can choose to submit this anonymously by checking the "Hide my name" box.
4. Click **Submit**.

*[INSERT FULL-PAGE SCREENSHOT: Suggestion submission form]*

---

## PART 3: THE SK OFFICER EXPERIENCE (Management & Planning)

### 3.1 Officer Dashboard Overview
SK Officers have elevated privileges. Your dashboard focuses on management and analytics.
- **Active Projects:** Tracks ongoing events and their registration numbers.
- **Action Items:** Reminds you of pending document drafts or budget approvals.
- **Quick Generators:** Buttons to instantly launch the Budget Estimator or Document Automator.

*[INSERT FULL-PAGE SCREENSHOT: SK Officer Dashboard showing metrics and action items]*

### 3.2 Event Management
Officers are responsible for populating the calendar.

#### 3.2.1 Creating a New Event
1. Go to the **Events** tab and click **Create New Event**.
2. Fill in the Title, Description, Date, Time, and Location.
3. Set the maximum capacity for registrations.
4. Click **Save Event**. It will immediately appear on the Youth calendar.

#### 3.2.2 Editing Event Details
If a venue changes, you can edit the event.
1. Click the **Edit (Pencil)** icon on the event card.
2. Change the details and click **Update**.
3. All registered youth will be notified of the change.

#### 3.2.3 Generating & Printing QR Codes
1. Open the event details page.
2. Click the **Generate Attendance QR** button.
3. The system creates a unique QR code.
4. Click **Print** or display it full-screen on a tablet at the venue entrance.

#### 3.2.4 Tracking Live Attendance
As youth scan the QR code, the event page will show a live counter of attendees, broken down by male and female participants.

*[INSERT FULL-PAGE SCREENSHOT: Event Creation Form and Live Attendance Tracker]*

### 3.3 Budget Estimation Tool
Budgeting is strictly governed by RA 10742. The AI helps you draft compliant budgets based on historical SK spending.

#### 3.3.1 How the AI Suggests Budgets
The AI analyzes past events in Barangay Concepcion Dos to estimate costs for meals, venues, and materials.

#### 3.3.2 Inputting Activity Details
1. Go to **Budget Estimation**.
2. Select the Activity Category (e.g., Sports Fest).
3. Enter the expected number of participants.
4. Check the box if meals are required.
5. Click **Calculate Budget**.

#### 3.3.3 Interpreting Warnings
If your estimated budget exceeds typical barangay limits, the AI will flag a warning. It will cite RA 10742 guidelines to ensure your funds are allocated to the correct mandatory categories (e.g., 10% for youth development).

*[INSERT FULL-PAGE SCREENSHOT: Budget Estimator tool showing an AI breakdown of costs and compliance warnings]*

### 3.4 Document Automation
Officers spend hours drafting resolutions. aSK Youth automates this.

#### 3.4.1 Selecting Templates
1. Go to the **Document Automation** tab.
2. Choose a template: Project Brief, SK Resolution, Meeting Minutes, or Certificate.

#### 3.4.2 Letting AI Draft Content
1. Fill in the basic bullet points (e.g., "Meeting about summer league, agreed to allocate 50k, adjourned at 5pm").
2. Click **AI Expand**.
3. The AI will convert your short notes into formal, highly professional government paragraphs.

#### 3.4.3 Previewing and Exporting
1. Review the generated text in the preview pane.
2. Click **Export PDF** or **Export DOCX** to download the finished file for physical signing.

*[INSERT FULL-PAGE SCREENSHOT: Document Automation interface showing raw bullet points transforming into a formal resolution]*

### 3.5 Officer-Level AI Chatbot Features
When an Officer uses the Chat tab, the AI recognizes your authority. 
- You can ask the AI to draft an event directly in the chat window.
- The AI will ignore the standard "redirect to Secretariat" rule and will help you brainstorm project proposals, outline schedules, and summarize long government memos.

*[INSERT FULL-PAGE SCREENSHOT: AI Chatbot answering a complex budget question for an Officer]*

---

## PART 4: THE SYSTEM ADMIN EXPERIENCE (Oversight & Configuration)

### 4.1 Admin Dashboard (System Health & Logs)
The Admin Dashboard provides a bird's-eye view of the entire system.
- **System Telemetry:** Shows server uptime and API request counts.
- **Total Users:** A breakdown of registered accounts by role.
- **Audit Feed:** A live scrolling log of every action taken in the system.

*[INSERT FULL-PAGE SCREENSHOT: System Admin Dashboard with Telemetry charts]*

### 4.2 User Management
Admins must verify and manage all accounts to ensure only legitimate residents access the system.

#### 4.2.1 Viewing the User Directory
1. Go to **User Management**.
2. Search for users by name or filter by role (Youth, Officer).

#### 4.2.2 Assigning & Revoking Roles
1. Click on a user's row.
2. Change their Role dropdown from Youth to SK Officer.
3. Click **Update Role**. They will instantly gain officer tools.

#### 4.2.3 Resolving Locked Accounts
If a user is locked out due to 5 failed login attempts:
1. Find their name in the directory.
2. Click **Unlock Account**.
3. You can also manually update their password using the edit function if they have forgotten it.

*[INSERT FULL-PAGE SCREENSHOT: User Management table with role assignment dropdowns]*

### 4.3 Admin Reports & Exports
End-of-year reporting is critical for SK transparency. Admins can export massive datasets instantly.

#### 4.3.1 Generating Participation Reports
1. Go to **Admin Reports**.
2. Select **Participation Analytics**.
3. Choose a Date Range (e.g., Jan 1 - Dec 31).
4. The system aggregates all QR scans across all events into demographic charts.

#### 4.3.2 Generating Budget Reports
1. Select **Financial Analytics**.
2. The system totals the allotted budgets of all completed events.

#### 4.3.3 Exporting to PDF/DOCX
1. Once the charts load on screen, click **Export Full Report**.
2. Choose PDF for official submission or DOCX if you need to add manual notes before printing.

*[INSERT FULL-PAGE SCREENSHOT: Admin Reports page showing complex bar charts and the Export buttons]*

### 4.4 System Telemetry & AI Logs
Admins can monitor how the AI is being used.
1. Go to **System Health**.
2. View the **AI Logs** ring buffer.
3. You can see the queries being sent and monitor for any abuse, prompt injection attempts, or recurring errors.

*[INSERT FULL-PAGE SCREENSHOT: AI Telemetry Logs showing queries and response times]*

---

## PART 5: TROUBLESHOOTING & SUPPORT

### 5.1 Login & Authentication Issues
- **"Account Locked" Error:** You typed the wrong password 5 times. Wait 15 minutes. The timer is strictly enforced by the server. If urgent, contact the System Admin.
- **Forgot Password:** Please contact the System Administrator to have your password reset manually.

### 5.2 AI Chatbot Connectivity & Language Issues
- **"Uplink Failed" Error:** This means your internet connection dropped right as you hit send. The system will automatically retry once after 2 seconds. If it still fails, check your Wi-Fi.
- **AI replies in the wrong language:** The AI mirrors your input. If you type just "Hello", it replies in English. If you want a Tagalog response, use Tagalog markers like "po", "opo", or "kumusta".
- **AI refuses to draft a document:** If you are a Youth user, the AI is programmed to refuse document drafting and will direct you to the Secretariat. Only Officers can draft documents.

### 5.3 QR Code Scanning Errors
- **"Camera Permission Denied":** Your browser blocked the camera. Look for the lock icon in your URL bar, click it, and set Camera to "Allow". Reload the page.
- **"Invalid QR Code":** Ensure you are scanning an aSK Youth QR code, not a generic link.
- **"Attendance Already Recorded":** You double-scanned the code. Your attendance is safe.

### 5.4 Report Generation & Export Errors
- **Blank PDF:** Ensure you selected a date range that actually contains events. If there were no events in February, a February report will be blank.
- **Export button unresponsive:** If generating a massive yearly report, the server may take up to 10 seconds. Do not click the button multiple times. Wait for the download prompt.

### 5.5 Contacting the SK Secretariat & IT Support
If you encounter a bug not listed here:
- For policy, event, or account questions: Visit the SK Secretariat at the Barangay Concepcion Dos Hall.
- For severe technical glitches: Use the "Report Bug" link in the footer to email the development team directly.

---

## PART 6: REGULATORY COMPLIANCE & APPENDICES

### 6.1 Data Privacy & Security (RA 10173)
aSK Youth was built with strict adherence to the **Data Privacy Act of 2012 (Republic Act 10173)**. 
- **Data Minimization:** The system only collects data necessary for SK operations (name, age, residency).
- **Encryption:** All passwords are mathematically hashed. The admins cannot see your password.
- **Right to Erasure:** You may request the SK Secretariat to delete your account and remove your personal data from the database at any time.

### 6.2 SK Reform Act Alignment (RA 10742)
The budgeting and document features of this system are modeled after the **Sangguniang Kabataan Reform Act of 2015 (Republic Act 10742)**. The AI is specifically tuned to flag budgets that do not align with the mandatory 10% youth fund allocation rules dictated by the act.

### 6.3 ISO/IEC 25010 Quality Standards
During development, aSK Youth was rigorously evaluated against the **ISO/IEC 25010 Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE)** framework. It scored highly in Functional Suitability, Usability, Reliability, and Security.

### 6.4 Glossary of Terms
- **AI (Artificial Intelligence):** The engine that powers the chatbot and document automation.
- **RAG (Retrieval-Augmented Generation):** The specific technology that allows the AI to read the SK database and answer based strictly on official records, rather than hallucinating facts.
- **SSE (Server-Sent Events):** The technology that makes the chatbot type out its answers word-by-word in real-time.
- **QR Code (Quick Response Code):** The square barcode used for instant attendance tracking.

### 6.5 Appendix A: Full Text Excerpts of Data Privacy Act
*(In the printed version of this manual, insert the full text of RA 10173 Sections 11-20 regarding the general principles of data processing and the rights of the data subject here. This will span approximately 10-15 pages.)*

### 6.6 Appendix B: Full Text Excerpts of SK Reform Act
*(In the printed version of this manual, insert the full text of RA 10742 Sections 14-20 regarding SK budgets, meetings, and resolutions here. This will span approximately 10-15 pages.)*

### 6.7 Copyright & Development Team
**aSK Youth: An AI-Driven SK Management and Public Service System**

Developed as a capstone project for the College of Computer Studies, Our Lady of Fatima University – Antipolo City, 2027.

**Development Team:**
- Generoso B. Estrabon IV
- Jade M. Quilar
- Daniel D. Kuan Wong
- Rich Mon P. Sy

**Supervised by:** [adviser name]

*All rights reserved. This software and manual are the intellectual property of the developers and the university. Designed exclusively for Barangay Concepcion Dos, Marikina City.*

---
**[END OF MANUAL]**
