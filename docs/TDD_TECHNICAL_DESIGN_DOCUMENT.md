# Technical Design Document (TDD)
# AutoQuote AI: Enterprise RFQ-to-Quote Costing Web App

**Target Client**: Company A (Plot 42, Sector 10, MIDC Chakan, Pune – 410501)  
**Industry**: Machined & Forged Parts for Two-Wheeler, Tractor, and Commercial Vehicle Tier-1 OEMs  
**GitHub Repository**: [https://github.com/KR-007J/rfq-costing-engine](https://github.com/KR-007J/rfq-costing-engine)  
**Live Application**: [https://rfq-costing-engine.vercel.app](https://rfq-costing-engine.vercel.app)  
**Author**: Krish Joshi | Candidate for Software Engineering Intern (+ PPO), IsoCode Labs  
**Date**: November 2, 2026  

---

## 1. Executive Summary & Problem Diagnosis

Company A operates a ₹140–160 Crore manufacturing enterprise in Chakan, Pune with 320 employees and an estimation team of 6 engineers. The company processes approximately 60 RFQs per month (averaging 5 parts per RFQ = 300 parts/month). Under the legacy operating model:
- Estimators spend **2.5 hours per part** manually copying rates from an aging ERP into fragile Excel sheets.
- Total estimation time consumes **9,000 engineering hours annually** (₹40.5 Lakhs direct labor).
- Quote turnaround averages **9 working days**, significantly lagging customer expectations of 4 days.
- **5% of RFQs (36 per year)** are lost specifically to late submissions. At an average annual revenue of ₹20 Lakhs per part and a 12% contribution margin, delayed quoting bleeds **₹86.4 Lakhs in lost contribution annually**.
- **Total Annual Loss**: **₹1.27 Crore / year**.

**AutoQuote AI** was architected to reduce quote turnaround from 9 days to under 4 hours (a 95% reduction), while eliminating manual rate copying, enforcing strict rate master versioning, anchoring mathematical costing calculations in deterministic TypeScript logic, and maintaining a high-value approval gate for quotes exceeding ₹25 Lakhs.

---

## 2. Labeled Technical & Domain Assumptions

To ensure rigorous transparency, all domain assumptions are explicitly labeled:

- **[Assumption 1 - Pricing Currency & Taxation]**: All baseline currency is in Indian Rupees (INR ₹). In compliance with Indian GST statutory requirements for automotive job-work and machining, Goods & Services Tax (GST) is calculated at **18%** and explicitly displayed as a separate line item (never blended into the ex-factory unit price).
- **[Assumption 2 - Mathematical Costing Invariant]**: AI models are strictly non-deterministic and hallucination-prone. Therefore, **cost mathematics is 100% deterministic code (never delegated to LLMs)**. AI is utilized solely for intake parsing (drawing title block OCR, email body entity extraction) and historical routing retrieval.
- **[Assumption 3 - Temporal Rate Master Immutability]**: Once an RFQ quote is generated, it binds permanently to the rate master snapshot IDs and values in effect on its quotation date. Updating master commodity steel prices or machine hour rates (MHR) must create an append-only new version with effective date ranges, never retroactively altering previously submitted quotes.
- **[Assumption 4 - High-Value Governance Gate]**: Any RFQ whose total annual contract value (`Annual Volume × Unit Selling Price Excl. GST`) exceeds **₹25 Lakhs (₹2,500,000)** must be locked against dispatch until approved by the Sales Head (VP Commercial).
- **[Assumption 5 - Customer Drawing NDA Protection]**: Automotive OEM drawings are subject to strict non-disclosure agreements. No drawing or CAD metadata is ever transmitted to public AI training loops.
- **[Assumption 6 - Scrap Recovery Credit Formula]**: Scrap recovery credit is computed on net chip removal weight (`Gross Weight - Net Finished Weight`) multiplied by the active scrap market credit rate (₹32.00/kg for steel turnings; ₹38.00/kg for forging flash) and deducted directly from gross material cost.

---

## 3. System Architecture & Tech Stack Justification

### 3.1 Architectural Philosophy
The application follows a **Domain-Driven, Zero-Black-Box Industrial Architecture**:
1. **Next.js 14 App Router + React 18**: Provides high-performance server-side rendering (SSR) for instantaneous initial page loads and dense client-side reactivity for real-time costing re-calculation without full page reloads.
2. **TypeScript (Strict Mode)**: Guarantees end-to-end type safety between data storage, calculation algorithms, and UI components. Eliminates rounding, string-number coercion, or undefined property bugs in financial math.
3. **Deterministic Math Layer (`lib/costing.ts`)**: Pure, decoupled mathematical functions with 0 external dependencies. Fully testable via automated test runners (`npm test`).
4. **Tailwind CSS + Monospace Tabular Numerics**: Industrial design system featuring slate/zinc backgrounds, clean borders, high information density, and `font-variant-numeric: tabular-nums` to ensure numbers in financial tables align perfectly along decimal points.
5. **ReportLab & Print Engine**: Dual-format documentation allowing instant in-browser A4 quotation printing and publication-grade PDF generation.

### 3.2 System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 USER INTERFACES                                   |
|   +-------------------+  +--------------------+  +----------------------------+   |
|   |   RFQ Register    |  |  Part Costing View |  |    AI Intake OCR Parser    |   |
|   |  (Pipeline KPIs)  |  | (Live Reactivity)  |  |  (Confidence & Provenance) |   |
|   +-------------------+  +--------------------+  +----------------------------+   |
|             |                      |                           |                  |
+-------------|----------------------|---------------------------|------------------+
              |                      |                           |
              v                      v                           v
+-----------------------------------------------------------------------------------+
|                           NEXT.JS 14 REST API LAYER                               |
|   /api/rfqs            /api/rfqs/[id]         /api/rfqs/[id]/approve              |
|   /api/rates           /api/past-parts        /api/ai/extract                     |
+-----------------------------------------------------------------------------------+
              |                      |                           |
              +----------------------+---------------------------+
                                     |
                                     v
+-----------------------------------------------------------------------------------+
|                        CORE DOMAIN & DETERMINISTIC LOGIC                          |
|   +---------------------------------------------------------------------------+   |
|   | lib/costing.ts:                                                           |   |
|   |   - Gross & Net Material Costing     - Scrap Recovery Credit Deduction    |   |
|   |   - Direct Cycle Machining (MHR)     - Setup Amortization per Batch Size  |   |
|   |   - Factory Overhead & Quality %     - Logistics (Pack + Freight)         |   |
|   |   - Multi-Volume Slabs (3 Tiers)     - High-Value Approval Gate (> ₹25L)  |   |
|   +---------------------------------------------------------------------------+   |
|   +---------------------------------------------------------------------------+   |
|   | lib/db.ts: Temporal Snapshot Manager & In-Memory Persistence Layer        |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
                                     |
                                     v
+-----------------------------------------------------------------------------------+
|                             STORAGE & REPOSITORIES                                |
|   - rate_masters.json (Effective Dates, Material Base Rates, Machine Hour Rates)  |
|   - seed_rfqs.json    (Chakan Automotive Benchmarks: Spindles, Arms, Gears)       |
+-----------------------------------------------------------------------------------+
```

---

## 4. Mathematical Costing Engine Formulation

All formulas implemented in `lib/costing.ts` match standard Indian automotive Tier-1 engineering accounting:

### 4.1 Raw Material Costing with Scrap Credit
$$\text{Gross Material Cost} = \text{Gross Weight (kg)} \times \text{Base Material Rate (₹/kg)}$$
$$\text{Scrap Weight (kg)} = \max(0, \text{Gross Weight} - \text{Net Weight})$$
$$\text{Scrap Recovery Credit} = \text{Scrap Weight (kg)} \times \text{Scrap Recovery Rate (₹/kg)}$$
$$\text{Net Material Cost} = \max(0, \text{Gross Material Cost} - \text{Scrap Recovery Credit})$$

*Benchmark Example (RFQ-2611-014, Rear Wheel Spindle, EN8):*
- Gross Weight: $0.61\text{ kg}$, Net Weight: $0.48\text{ kg}$, Scrap: $0.13\text{ kg}$
- Material Rate: ₹$76.50\text{/kg}$ $\rightarrow$ Gross Material Cost = ₹$46.67$
- Scrap Credit: $0.13\text{ kg} \times ₹32.00\text{/kg} = ₹4.16$
- **Net Material Cost** = ₹$46.67 - ₹4.16 = ₹42.51$ / piece.

### 4.2 Manufacturing Routing & Setup Amortization
For each operation $i \in \{1 \dots n\}$:
$$\text{Machining Cost}_i = \left(\frac{\text{Cycle Time (minutes)}_i}{60}\right) \times \text{Machine Hour Rate (₹/hr)}_i$$
$$\text{Setup Amortization Cost}_i = \frac{\left(\frac{\text{Setup Time (minutes)}_i}{60}\right) \times \text{Setup Hour Rate (₹/hr)}_i}{\text{Batch Size}}$$
$$\text{Total Routing Cost} = \sum_{i=1}^{n} \left(\text{Machining Cost}_i + \text{Setup Amortization Cost}_i\right)$$

*Key Mathematical Invariant:* As production batch size increases across volume tiers, setup amortization decreases asymptotically towards zero, yielding natural multi-volume price breaks.

### 4.3 Ex-Factory Cost, Overheads, Logistics & Selling Price
$$\text{Prime Manufacturing Cost} = \text{Net Material Cost} + \text{Total Routing Cost}$$
$$\text{Factory Overhead Cost} = \text{Prime Manufacturing Cost} \times \left(\frac{\text{Overhead \%}}{100}\right) \quad (\text{Default: } 12\%)$$
$$\text{Quality Inspection Cost} = \text{Prime Manufacturing Cost} \times \left(\frac{\text{Quality \%}}{100}\right) \quad (\text{Default: } 3\%)$$
$$\text{Logistics Cost} = \text{Packaging (₹4.50)} + \text{Freight (₹3.00)} = ₹7.50\text{ / piece}$$
$$\text{Total Ex-Factory Cost} = \text{Prime Cost} + \text{Factory Overhead} + \text{Quality} + \text{Logistics}$$

$$\text{Unit Price (Excl. GST)} = \frac{\text{Total Ex-Factory Cost}}{1 - \left(\frac{\text{Margin \%}}{100}\right)} \quad (\text{Default Margin: } 15\%)$$
$$\text{GST Amount (18\%)} = \text{Unit Price (Excl. GST)} \times 0.18$$
$$\text{Final Unit Price (Incl. GST)} = \text{Unit Price (Excl. GST)} + \text{GST Amount}$$

### 4.4 High-Value Approval Gate ($> ₹25\text{ Lakhs}$)
$$\text{Annual Contract Value} = \text{Unit Price (Excl. GST)} \times \text{Annual Contract Volume}$$
$$\text{Requires Sales Head Approval} = \begin{cases} \text{TRUE} & \text{if Annual Contract Value} > ₹2,500,000 \\ \text{FALSE} & \text{otherwise} \end{cases}$$

---

## 5. Temporal Rate Master Versioning ("The Hard Part")

A common failure mode in manufacturing quoting systems is retro-active calculation mutation: if the master rate for EN8 steel increases from ₹72.00 to ₹76.50 in October, quotes submitted in June must NOT change their historical numbers when reopened or audited.

AutoQuote AI solves this through **Temporal Snapshot Anchoring**:
1. Every entry in `data/rate_masters.json` carries an `effective_from` date and an optional `effective_to` date, along with an explicit version tag (e.g. `v1.0`, `v2.0`).
2. When creating a new rate version, the previous rate version's `effective_to` is automatically closed to the start date of the new version.
3. Every RFQ records its `created_date`. Costing lookups execute temporal range queries:
   $$\text{effective\_from} \le \text{RFQ Created Date} \land (\text{effective\_to} = \text{NULL} \lor \text{effective\_to} \ge \text{RFQ Created Date})$$
4. This guarantees that historical quotes remain mathematically immutable, even decades after their submission.

---

## 6. AI Intake Extraction & Provenance Architecture

### 6.1 The Intake Pipeline
Automotive RFQs arrive in heterogeneous formats: email text, scanned drawing PDFs, and customer RFP packages. The AI Intake engine (`app/api/ai/extract/route.ts`) processes this input through a 4-stage pipeline:

1. **Entity Extraction**: Parses part description, customer name, drawing revision, alloy specification, rough and net weights, and annual SOP volume.
2. **Confidence Scoring**: Computes a confidence rating ($0.00 - 1.00$) for every extracted field based on exact text token matches vs. statistical heuristics.
3. **Source Citation**: Tags every field with its exact source text snippet (e.g., `Matched Drawing Title Block: DWG-RWS-8842-REV-C`).
4. **Historical Routing Recommender**: Queries the past parts catalog to identify similar geometry (shafts, arms, gear blanks) and clones proven machining routing sequences.

### 6.2 The "When AI Is Wrong" Fail-Safe
In compliance with the brief's strict mandate:
- **Zero Silent Assumptions**: Any field with confidence $< 0.90$ is highlighted with an orange warning indicator.
- **Estimator Verification Checkbox**: Pre-filled fields require estimator confirmation before the RFQ can transition to active costing.
- **Provenance Transparency**: The exact historical part number from which routings were suggested is displayed on screen (e.g., `Cloned routing from 2025 Rear Axle Pin (RFQ-2508-089)`).

---

## 7. UI/UX Design System & Key Views

In accordance with the client directive:
> *"The client values good, minimal design: clean layouts, white space, a restrained palette, clear type, with nothing on screen that lacks a purpose. Design counts as much as features. Estimators live in the costing screen: a dense but calm layout with clear numbers, aligned columns and no decoration."*

The application adopts an **Industrial Linear/Stripe Design System**:
- **Palette**: Slate/zinc neutrals (`#0f172a`, `#334155`, `#f8fafc`) with functional accents (emerald for won/profit, amber for approvals, blue for active costing).
- **Typography**: Clean sans-serif UI labels paired with monospace numbers (`font-mono`) and `tabular-nums` alignment.

### Key Screens Delivered:
1. **RFQ Register (`/`)**: High-signal table with pipeline metrics (Win Rate %, Active Estimating, Quotes Sent, Lost Reasons), search filtering, and status tabs.
2. **Part Costing Screen (`/rfqs/[id]`)**: The flagship desktop workspace. Left pane: material specs and scrap recovery; Middle pane: routing table with inline cycle time edits; Right pane: reactive multi-volume price slabs (3 tiers) and interactive margin sliders.
3. **AI RFQ Intake (`/rfqs/new`)**: 3 instant one-click Chakan client samples, raw OCR input textarea, confidence meters, and suggested routing review.
4. **Rate Masters (`/rate-masters`)**: Material commodity rates, Machine Hour Rates (MHR), and an interactive "+ Add Rate Version" modal with effective dates.
5. **Formal PDF Quotation (`/rfqs/[id]/quote`)**: Official ISO 9001 automotive quotation letterhead with dual authorization signatures (Estimator + Sales Head) and print-optimized A4 layout.
6. **Past Quotes Intelligence (`/past-quotes`)**: Search past quotes by part geometry and simulate bulk indexing of 1,400 legacy ERP rows.

---

## 8. What Was Cut & What Comes Next

### What Was Cut (Deliberate Scope Discipline):
- **CAD 3D B-Rep Geometry Analysis**: Automatically computing volume directly from STEP/IGES files was cut as explicitly stated in the client brief OUT OF SCOPE section.
- **Direct ERP Bi-Directional Sync**: Mocked via high-performance JSON persistence and Excel import to avoid coupling to proprietary legacy ERP APIs.
- **Supplier Procurement Portal**: External vendor RFQ bidding was omitted to focus 100% of engineering bandwidth on internal estimation speed and accuracy.

### What Comes Next (Roadmap):
1. **Multi-Currency Hedging**: Support USD/EUR quoting for export OEMs with forward-contract currency risk buffers.
2. **CMM Quality Inspection Automation**: Automated ingestion of coordinate measuring machine inspection logs into PPAP Level 3 documentation.
3. **Tool Wear Telemetry Integration**: IoT edge connection to CNC machines to feed actual spindle load and cycle times back into rate master calibration.

---

## 9. Conclusion
AutoQuote AI directly addresses Company A's ₹1.27 Crore annual loss by compressing quote turnaround from 9 days to under 4 hours, anchoring financial math in verifiable TypeScript code, and providing estimators with a calm, dense, world-class tool.
