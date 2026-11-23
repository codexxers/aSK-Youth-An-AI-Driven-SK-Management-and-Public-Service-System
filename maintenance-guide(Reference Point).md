# aSK Youth: An AI-Driven SK Management and Public Service System
## Software and Maintenance Manual

**Version 1.0**  
**Date:** [Insert Date]  
**Prepared by:** [Insert Dev Team Names]  

---

## Notice
Information in this documentation is subject to change without notice. Unauthorized use, copying, or translation of this documentation can result in civil or criminal penalties. No part of this documentation may be reproduced without the express written permission of the developers and Our Lady of Fatima University.

**Documentation Admonishments**

Admonishments are icons and text throughout this manual that alert the reader to assure personal safety, to minimize possible service interruptions, and to warn of the potential for equipment damage.

> **DANGER:** (This icon and text indicate the possibility of severe data loss or critical system failure.)
> **WARNING:** (This icon and text indicate the possibility of hardware damage or security breaches.)
> **CAUTION:** (This icon and text indicate the possibility of service interruption or temporary system downtime.)

---

## Table of Contents

- [Chapter 1. Introduction](#chapter-1-introduction)
  - [1.1 Overview](#11-overview)
  - [1.2 Scope and Audience](#12-scope-and-audience)
  - [1.3 Manual Organization](#13-manual-organization)
  - [1.4 Customer Care Center & Support](#14-customer-care-center--support)
- [Chapter 2. Platform Overview](#chapter-2-platform-overview)
  - [2.1 Introduction](#21-introduction)
  - [2.2 System Terminology](#22-system-terminology)
  - [2.3 System Hardware Configuration](#23-system-hardware-configuration)
  - [2.4 Software Configuration](#24-software-configuration)
  - [2.5 Network Configuration](#25-network-configuration)
  - [2.6 Security & User Administration](#26-security--user-administration)
- [Chapter 3. System Maintenance](#chapter-3-system-maintenance)
  - [3.1 Introduction](#31-introduction)
  - [3.2 Preventive Maintenance](#32-preventive-maintenance)
  - [3.3 Detecting and Reporting Problems](#33-detecting-and-reporting-problems)
  - [3.4 System Health Check Overview](#34-system-health-check-overview)
  - [3.5 Recovering from Problems](#35-recovering-from-problems)
- [Chapter 4. Platform and Application Alarms](#chapter-4-platform-and-application-alarms)
  - [4.1 Introduction](#41-introduction)
  - [4.2 Critical Platform Alarms](#42-critical-platform-alarms)
  - [4.3 Major Platform Alarms](#43-major-platform-alarms)
  - [4.4 Minor Platform Alarms](#44-minor-platform-alarms)
- [Chapter 5. Field Replaceable Units (FRUs)](#chapter-5-field-replaceable-units-frus)
  - [5.1 Introduction](#51-introduction)
  - [5.2 General FRU Guidelines](#52-general-fru-guidelines)
  - [5.3 FRU Replacement Procedures](#53-fru-replacement-procedures)
- [Appendix A. General Procedures](#appendix-a-general-procedures)
  - [A.1 Accessing the Admin Gateway](#a1-accessing-the-admin-gateway)
  - [A.2 Connecting to the Inference PC (SSH)](#a2-connecting-to-the-inference-pc-ssh)
  - [A.3 Restarting the Node.js/Python Services](#a3-restarting-the-nodejs-python-services)
  - [A.4 Manually Backing Up the Database](#a4-manually-backing-up-the-database)
  - [A.5 Saving and Clearing Logs](#a5-saving-and-clearing-logs)

---

## Chapter 1. Introduction

### 1.1 Overview
> **[Prompt for AI]:** Write a 1-2 paragraph overview explaining that this manual contains the information necessary for the maintenance of the aSK Youth System, a web-based AI platform deployed for the Sangguniang Kabataan of Barangay Concepcion Dos. Mention that it includes architecture overview, preventive maintenance, and corrective maintenance procedures.

### 1.2 Scope and Audience
> **[Prompt for AI]:** State that this manual is written for System Administrators, Lead Developers, and SK IT Support. Define that Preventive Maintenance includes scheduled routines (backups, log clearing), and Corrective Maintenance includes response to system alarms (AI server offline, database corruption).

### 1.3 Manual Organization
> **[Prompt for AI]:** Briefly list what Chapters 2, 3, 4, 5, and Appendix A cover (matching the structure of this document).

### 1.4 Customer Care Center & Support
> **[Prompt for AI]:** Provide the contact information for the aSK Youth development team (e.g., support@askyouth.online, office hours). State the procedure for reporting a critical system failure (e.g., contact the Lead Developer, check the Admin Gateway).

---

## Chapter 2. Platform Overview

### 2.1 Introduction
> **[Prompt for AI]:** Summarize the aSK Youth platform. Explain that it supports high-speed provisioning of SK events, document generation, and AI chatbot services via a distributed architecture.

### 2.2 System Terminology
> **[Prompt for AI]:** Create a table defining terms like: Frontend, Backend, Inference PC, LLM, Vector Store, Cloudflare Tunnel.

### 2.3 System Hardware Configuration
> **[Prompt for AI]:** List the hardware components (Client Devices, Vercel Cloud, Local Inference PC with RTX 4060 Ti, 32GB RAM).

### 2.4 Software Configuration
> **[Prompt for AI]:** Break down into sub-sections: React (Vite) frontend, Node.js Express backend, Python FastAPI (AI layer), Qwen 2.5 7B LLM, SQLite Database, Hnswlib Vector Store.

### 2.5 Network Configuration
> **[Prompt for AI]:** Explain how Cloudflare Tunnel exposes the local backend to the Vercel frontend securely. Mention the need for a stable internet connection (min 10 Mbps).

### 2.6 Security & User Administration
> **[Prompt for AI]:** Describe the Role-Based Access Control (RBAC) for Youth, SK Officer, SK Chairperson, and System Admin. Mention password hashing and session tokens.

---

## Chapter 3. System Maintenance

### 3.1 Introduction
> **[Prompt for AI]:** State that this chapter provides preventive and corrective maintenance information. 

### 3.2 Preventive Maintenance
> **[Prompt for AI]:** Divide into:
> *   **Daily Maintenance:** Backing up the SQLite database (`events.db`, `users.db`, `app.db`) and checking the System Health dashboard.
> *   **Monthly Maintenance:** Reviewing AI Logs for hallucinations/prompt injection, rotating Admin Authorization Tokens, and clearing old chat threads to free up GPU VRAM.

### 3.3 Detecting and Reporting Problems
> **[Prompt for AI]:** Explain that the system detects problems via the Admin Gateway (System Health tab). List how errors are reported: UI Alarm Badges, AI Server Log Viewer, and System Trajectory (Audit) Logs.

### 3.4 System Health Check Overview
> **[Prompt for AI]:** Describe the "System Health" tab in the Admin Gateway. Explain what it checks: Memory Usage, Python Engine (FastAPI) status, Vector DB chunk count, and SQLite size.

### 3.5 Recovering from Problems
> **[Prompt for AI]:** Describe the procedure for restoring the database from a backup file using the "Restore Backup" button in the Admin Gateway.

---

## Chapter 4. Platform and Application Alarms

### 4.1 Introduction
> **[Prompt for AI]:** State that this chapter describes recovery procedures for specific alarms. Alarms are grouped by severity: Critical, Major, and Minor.

### 4.2 Critical Platform Alarms
> **[Prompt for AI]:** Create a sub-section for:
> *   **Alarm 1001 - Python Engine Offline:** (AI to explain how to restart the FastAPI service and verify CUDA availability).
> *   **Alarm 1002 - Cloudflare Tunnel Disconnected:** (AI to explain how to check the `cloudflared` service on the local PC and verify the Vercel connection).

### 4.3 Major Platform Alarms
> **[Prompt for AI]:** Create a sub-section for:
> *   **Alarm 2001 - SQLite Database Locked:** (AI to explain how to check for locked processes and safely restart the Node.js server).
> *   **Alarm 2002 - LLM Out of VRAM (CUDA Error):** (AI to explain how to clear the AI context window, restart the LLM process, and verify GPU memory usage).

### 4.4 Minor Platform Alarms
> **[Prompt for AI]:** Create a sub-section for:
> *   **Alarm 3001 - High Latency on RAG Queries:** (AI to explain how to check internet bandwidth and optimize vector store indexing).
> *   **Alarm 3002 - Disk Space Shortage (90% Full):** (AI to explain how to archive old logs or download and delete old database backups).

---

## Chapter 5. Field Replaceable Units (FRUs)

### 5.1 Introduction
> **[Prompt for AI]:** Define FRUs as hardware components that the organization can replace in the field.

### 5.2 General FRU Guidelines
> **[Prompt for AI]:** State safety guidelines (power down, use anti-static straps, verify part numbers).

### 5.3 FRU Replacement Procedures
> **[Prompt for AI]:** Create sub-sections for:
> *   **GPU Replacement Procedure:** Steps to power down the Inference PC, remove the RTX 4060 Ti, install a new GPU, and verify CUDA drivers.
> *   **RAM Upgrade/Replacement:** Steps to add or replace DDR5 RAM to accommodate the LLM.
> *   **Disk Drive Replacement:** Steps to replace the SSD storing the SQLite databases and LLM weights.

---

## Appendix A. General Procedures

### A.1 Accessing the Admin Gateway
> **[Prompt for AI]:** Step-by-step guide to logging in at the aSK Youth Admin URL and navigating to the System Health tab.

### A.2 Connecting to the Inference PC (SSH)
> **[Prompt for AI]:** Step-by-step guide to using SSH (e.g., `ssh user@192.168.x.x`) to access the local GPU PC.

### A.3 Restarting the Node.js/Python Services
> **[Prompt for AI]:** Step-by-step terminal commands to restart the backend (e.g., `pm2 restart all` or `systemctl restart askyouth-backend`).

### A.4 Manually Backing Up the Database
> **[Prompt for AI]:** Step-by-step guide to manually copying the SQLite `.db` files to a secure external drive.

### A.5 Saving and Clearing Logs
> **[Prompt for AI]:** Steps to export the AI/Server log viewer from the Admin Gateway and clear old logs to free up space.

---
*End of Manual*