# ReSite - KFUPMxGoogle Cloud 'Intelligent Planet' Hackathon 2025

* [Summary](#summary)
* [Description](#description)
* [Key Points](#key-points)

---
<div align="center">

![ReSite Logo](public/ReSite-logo.png)

</div>
---

## Summary

**ReSite is a circular economy platform prototype that connects construction sites with surplus materials in Saudi Arabia to local sites that can reuse them, optimised for sustainability, explainability, and user satisfaction.**

- Current prototype built over 4 weeks for the KFUPM x Google Cloud 'Intelligent Planet' hackathon.

- Watch 3-min [demo video](https://drive.google.com/file/d/19i3dSE6TcBiJi3k7GW5UsjtoulMT2fvo/view?usp=drive_link)
>NOTE: Demo is of prototype submitted to hackathon on 12/2025 - may have certain APIs disabled after 03/2026

- Hackathon timeline: 
   - 10/2025: Project proposals (out of 1000+)
   - 12/2025: *Accepted projects (1 of 80)[**CURRENT STAGE**]*
   - 01/2026: Shortlisted projects chosen
   - 02/2026: Shortlisted projects flown to Saudi site for week-long MVP development 

<div align="center">

### <ins>**[Try ReSite](https://resite-prototype.lovable.app)**</ins>

</div>

<div align="center">

### <ins>Team</ins>
**Shohail Ismail** - Team Co-Lead (Technical), Full-stack development, Vertex AI + RL system
**Chinmay Sharma** - Team Co-Lead (Management), Frontend, UX design
**Ram Kurakula** - Backend, BigQuery analytics, Looker Studio
**Shaurya Singh** - Firebase Auth, Firestore, Maps API

</div>


---

## Description
- ### Stack

   - **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui
   - **Authentication & Storage:** Firebase (Auth, Firestore, Cloud Storage)
   - **Database:** Supabase (PostgreSQL + Edge Functions)
   - **Analytics:** Google BigQuery
   - **AI Classification:** Vertex AI (Gemini 1.5 Flash) - (API from Google Cloud)
   - **Maps:** Google Maps Platform


- ### Architecture

   - #### Google Cloud Projects
   We use two Google Cloud projects for separation of concerns:

   | Project | Purpose |
   |---------|---------|
   | **Firebase Project** | Auth, Firestore, Firebase (in general) |
   | **API Project** | Maps APIs (5+ assosciated APIs), Vertex AI, BigQuery |

   - #### Architecture Diagrams

   ![ReSite - Architecture Diagrams & Technical Considerations Report](public/ReSite-Week-2-Report--Architecture-Diagrams-And-Technical-Considerations.pdf)

---


<!--
## Key Features

### 1. AI-Powered Material Classification
- Upload construction material images
- Gemini 1.5 Flash automatically identifies material type, condition, and quantity
- Reduces listing time from minutes to seconds

### 2. Smart Matching System
- Algorithm connects suppliers with relevant buyers
- Location-based recommendations
- Material type and quantity matching

### 3. Real-time Messaging
- In-app chat for negotiations
- Firebase-powered real-time updates
- Image sharing support

### 4. Geospatial Discovery
- Google Maps integration
- Find materials near your location
- Distance-based search filtering

### 5. Impact Analytics
- BigQuery-powered analytics dashboard
- Track waste reduction metrics
- Material reuse statistics
-->

## Key Points

**Google Cloud Integration**
- Firebase for authentication and real-time data
- Vertex AI (Gemini) for image classification
- BigQuery for analytics at scale, visuaised with Looker Studio
- Google Maps for geospatial features

**Sustainable Impact**
- Reduces construction waste through material reuse
- Tracks environmental metrics
- Promotes circular economy in construction

**Production-Ready Architecture**
- Secure credential management (private submodule)
- Scalable serverless functions
- Type-safe TypeScript codebase
- Comprehensive error handling

**AI Application**
- Real-world use case (material classification)
- Reduces manual data entry
- Improves listing accuracy