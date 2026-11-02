# AutoQuote AI: Automotive RFQ-to-Quote Costing Web App

[![Build & Verification Status](https://img.shields.io/badge/Verification-100%25%20Passing-emerald?style=flat-square)](https://github.com/KR-007J/rfq-costing-engine)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square)](LICENSE)

An enterprise-grade, deterministic RFQ costing web application engineered for **Company A (Chakan, Pune)**, a ₹140–160 Crore automotive component manufacturer producing machined shafts, forgings, and drivetrain assemblies for Tier-1 OEMs (Two-Wheelers, Tractors, Commercial Vehicles).

**Live Application**: [https://rfq-costing-engine.vercel.app](https://rfq-costing-engine.vercel.app)  
**Author**: Krish Joshi ([@KR-007J](https://github.com/KR-007J))  
**Assessment**: IsoCode Labs — Software Engineering Intern (+ PPO) Take-Home Task  

---

## 🏭 The Industrial Problem & Financial Diagnosis

Company A's 6-member estimation team evaluates ~60 RFQs per month (~300 parts/month). Estimators spend **2.5 hours per part** manually copying machine hour rates from an older ERP into Excel workbooks.
- Turnaround time is **9 working days** vs. the **4 days** customers expect.
- **5% of all RFQs (36 per year)** are lost specifically to late submissions.
- At an average contract value of ₹20 Lakhs/year and 12% contribution margin, delayed quoting bleeds **₹86.4 Lakhs in lost contribution annually**.
- Adding 9,000 hours of estimation engineering labor (₹40.5 Lakhs), Company A loses **₹1.27 Crore annually**.

**AutoQuote AI** compresses quote turnaround from 9 days to under 4 hours while enforcing deterministic mathematical precision, temporal rate snapshot immutability, and high-value contract governance.

---

## ⚡ Key Capabilities & Core Views (6–8 Flows)

| View | Path | Description |
|---|---|---|
| **RFQ Register** | `/` | High-signal engineering table with live pipeline metrics (Win Rate, Total Value, Overdue RFQs), filter tabs (`Estimating`, `Pending Approval`, `Sent`, `Won`, `Lost` with loss reasons), and instant search. |
| **Part Costing Screen** | `/rfqs/[id]` | Flagship desktop workspace. Left pane: material specs & scrap credit; Middle pane: routing operations table with inline cycle time edits; Right pane: reactive multi-volume price slabs (3 tiers) and interactive margin sliders. |
| **AI RFQ Intake** | `/rfqs/new` | Intelligent drawing title block & email OCR parser with 3 pre-loaded Chakan client samples (Company B, C, D), field-level confidence meters, source snippet citations, and historical routing recommender. |
| **Rate Masters** | `/rate-masters` | Single source of truth for alloy commodity prices and Machine Hour Rates (MHR) featuring an interactive "+ Add Rate Version" modal with effective date stamps. |
| **Formal PDF Quote** | `/rfqs/[id]/quote` | ISO 9001:2015 automotive quotation letterhead with multi-volume price schedule, statutory GST (18%) shown separately, commercial terms, and dual authorization signatures (Estimator + VP Sales). |
| **Past Quotes Intelligence** | `/past-quotes` | Instant search across past parts geometry and simulated indexing of 1,400 legacy ERP rows in <12ms. |

---

## 🧮 Mathematical Formulation & Costing Invariant

All cost calculations are executed in **100% pure, deterministic TypeScript (`lib/costing.ts`)**—never delegated to LLMs:

```
Gross Material Cost = Gross Weight (kg) × Material Base Rate (₹/kg)
Scrap Recovery Credit = (Gross Weight - Net Weight) × Scrap Credit Rate (₹32.00/kg)
Net Material Cost = Gross Material Cost - Scrap Recovery Credit

Direct Machining Cost = ∑ [(Cycle Time mins / 60) × Machine Hour Rate (₹/hr)]
Setup Amortization = ∑ [(Setup Time mins / 60) × Setup Rate (₹/hr)] / Batch Size

Ex-Factory Cost = Prime Cost + Factory Overhead (12%) + Quality (3%) + Logistics (₹7.50)
Unit Selling Price (Excl. GST) = Ex-Factory Cost / (1 - Margin%)
Final Price (Incl. GST) = Unit Selling Price + (Unit Selling Price × 18% GST)

High-Value Approval Gate: Annual Contract Value > ₹25,00,000 (₹25 Lakhs)
```

---

## 🚀 Quick Local Setup

```bash
# 1. Clone repository
git clone https://github.com/KR-007J/rfq-costing-engine.git
cd rfq-costing-engine

# 2. Install dependencies
npm install

# 3. Run automated math verification test suite
npm test

# 4. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Reviewer Demo Roles

Switch roles instantly using the top navigation bar switcher:
1. **Senior Estimator (`Rajesh Sharma`)**: Full access to edit part parameters, cycle times, AI intake, and margin sliders.
2. **VP Sales / Sales Head (`Vikram Malhotra`)**: Approval authority for quotes $> ₹25\text{ Lakhs}$, commercial margin audit, and quotation authorization.
3. **Plant Head (`Anand Patil`)**: Machine hour rate calibration and work center audit.

---

## 📄 Deliverables

- **Technical Design Document**: [`docs/TDD_AutoQuote_AI.pdf`](docs/TDD_AutoQuote_AI.pdf)
- **Deployment Runbook**: [`deployment.md`](deployment.md)
- **Submission ZIP Package**: Ready for upload to IsoCode Labs portal.
