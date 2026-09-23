# UsersGuide Progress Logs

This document tracks the progress, revisions, and structural decisions made for the aSK Youth User's Guides.

## Current State

- **v1 Guide (`Users-Guide-aSKYOUTH.md`)**: Complete.
- **v2 Guide (`Users-Guide-aSKYOUTH-v2.md`)**: Complete. Restructured to explicitly delineate the experiences of Youth (Guests), SK Officers, and System Admins. Expanded with placeholders for screenshots and legal appendices to support a ~55-page physical export requirement for capstone documentation.

## Revisions & Fixes Applied

1. **Authentication Restructuring (v1 & v2)**
   - **Removed**: All references to public account registration, sign-up forms, and email verification. The system does not support public registration.
   - **Added**: Clarified that Youth (residents) access the system via a "Continue as Youth" guest login button that bypasses traditional authentication.
   - **Updated**: Clarified that official accounts for SK Officers and the Chairperson are securely provisioned exclusively by the System Admin.

2. **Admin Account Management (v1 & v2)**
   - **Added**: Detailed the Admin's role in Account Management.
   - **Added**: Specified that the creation of *any* account in the Admin Dashboard requires a privileged **Authentication Code** (admin token) as an intentional safeguard against unauthorized privilege escalation.

3. **Forgot Password Flow (v1 & v2)**
   - **Removed**: Eliminated all references to "Forgot Password" links and email recovery loops. 
   - **Updated**: Instructed users who forget their passwords to contact the System Administrator directly. Admins will manually reset/update passwords via the user edit function in the dashboard.

4. **Profile Customization (v1 & v2)**
   - **Removed**: Entirely removed the "Profile Setup & Customization" sections as this feature does not exist in the frontend UI. Adjusted downstream chapter/section numbering to remain sequential.
