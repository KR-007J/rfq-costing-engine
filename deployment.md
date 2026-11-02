# Deployment & Local Runbook: AutoQuote AI
**Automotive RFQ-to-Quote Costing Web App for Company A (Chakan, Pune)**

---

## 1. Project Overview & Repository
- **GitHub Repository**: [https://github.com/KR-007J/rfq-costing-engine](https://github.com/KR-007J/rfq-costing-engine)
- **Live Deployment**: Deployed on Vercel Edge (`https://rfq-costing-engine.vercel.app`) / Local Node.js
- **Primary Domain**: Machined & forged parts costing for two-wheelers, tractors, and Tier-1 commercial vehicles.
- **Client**: Company A, Plot 42, Sector 10, MIDC Chakan Industrial Area, Pune – 410501.

---

## 2. Step-by-Step Local Setup & Run

### Prerequisites
- **Node.js**: `v18.18.0` or higher (tested on Node `v20.x` and `v26.x`)
- **Package Manager**: `npm` `v9.x`+ (or `pnpm` / `yarn`)
- **OS**: Linux, macOS, or Windows WSL2

### Step 1: Clone the Repository
```bash
git clone https://github.com/KR-007J/rfq-costing-engine.git
cd rfq-costing-engine
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run Costing Engine Math Verification Tests
Run the deterministic mathematical verification test suite to validate all costing formulas, scrap recovery credits, setup amortization across batch sizes, and the ₹25 Lakhs approval gate:
```bash
npm test
```
*Expected output: All 4 verification tests pass with exit code 0.*

### Step 4: Run the Development Server
```bash
npm run dev
```
Open your browser and navigate to:
```
http://localhost:3000
```

### Alternative: Production Build & Start
To test the optimized production build:
```bash
npm run build
npm start
```

---

## 3. Environment Variables

In accordance with IsoCode assessment rules, only environment variable **names** are listed (no secrets or default credentials):

| Variable Name | Required | Description | Default (if omitted) |
|---|---|---|---|
| `NODE_ENV` | Optional | Application runtime environment (`development` \| `production`) | `development` |
| `PORT` | Optional | HTTP port for server binding | `3000` |
| `NEXT_PUBLIC_APP_URL` | Optional | Canonical URL of the deployed instance | `http://localhost:3000` |

*Note: The application is designed to be completely self-contained with zero external third-party API dependencies required to run the full end-to-end evaluation.*

---

## 4. Reviewer Roles & Demo Access

The application features an instant **Role Switcher** in the top navigation bar to facilitate seamless evaluation without requiring password entry or session timeouts:

### 1. Senior Estimator: Rajesh Sharma
- **Role Identity**: `estimator` (Default)
- **Permissions**:
  - Open and modify RFQ part parameters (gross weight, net weight, material grades).
  - Add, re-order, and edit machine routing cycle times and setup times.
  - Run AI Intake Extraction from raw emails, drawing title blocks, or OCR dumps.
  - Adjust profit margin sliders and inspect reactive multi-volume price breaks.
  - Submit high-value costings (> ₹25 Lakhs) for Sales Head sign-off.

### 2. VP Sales / Sales Head: Vikram Malhotra
- **Role Identity**: `sales_head`
- **Permissions**:
  - High-value contract approval gate authority (> ₹25 Lakhs annual value).
  - One-click sign-off on locked quotes (`status: pending_approval` → `status: approved`).
  - View commercial margin impact and pipeline conversion metrics.
  - Authorize and sign official PDF Quotations with digital signatory block.

### 3. Plant Head: Anand Patil
- **Role Identity**: `plant_head`
- **Permissions**:
  - Machine hour rate (MHR) calibration and work center capacity review.
  - Rate master effective date auditing.

---

## 5. Reviewer Quick Walkthrough Guide (6 Key Flows)

To evaluate the core build requirements in under 5 minutes:

1. **RFQ Register (`/`)**:
   - Inspect the industrial table pre-seeded with 8 realistic Chakan RFQs.
   - Filter by status tabs: `Estimating`, `Pending Approval`, `Sent`, `Won`, and `Lost` (with competitive loss reasons).
   - Review KPI metrics: Win Rate (50%), Total Active Pipeline, and Turnaround Time reduction (3.8 days vs 9 days baseline).

2. **Part Costing Screen (`/rfqs/rfq-2611-014`)**:
   - The flagship screen for Company B's Rear Wheel Spindle (EN8, 180k volume).
   - Test live reactivity: change gross weight or cycle time to watch Ex-Factory Cost, Scrap Credit, and Multi-Volume Slabs recalculate instantly.
   - Observe setup amortization across the 3 volume tiers (Batch 5,000 vs 10,000 vs 15,000).

3. **High-Value Approval Workflow (`/rfqs/rfq-2611-019`)**:
   - Switch to **Sales Head** mode in the navbar.
   - Open RFQ-2611-019 (Hydraulic Lift Arm, ~₹2.79 Crore annual value).
   - Click the green **Approve Quote (> ₹25L)** button to unlock and approve the quotation.

4. **AI RFQ Intake & Drawing OCR (`/rfqs/new`)**:
   - Click any of the 3 pre-configured Chakan client samples (Company B, C, or D).
   - Click **Analyze & Extract with AI** to view field-level confidence badges, source citations, and cloned historical routings.
   - Click **Accept & Initialize Part Costing Sheet** to create a live RFQ.

5. **Rate Masters with Effective Dates (`/rate-masters`)**:
   - Review material commodity rates and machine hour rates with version tags (`v1.0`, `v2.0`).
   - Click **+ Add New Rate Version** to test temporal immutability: updating a rate automatically stamps an effective date range without modifying past quote snapshots.

6. **Formal PDF Quotation Generation (`/rfqs/rfq-2611-014/quote`)**:
   - View the official ISO 9001 automotive supplier quotation on Company A letterhead.
   - Check the multi-volume pricing schedule with GST (18%) shown separately.
   - Click **Print / Save as PDF** to generate an A4 printable quote.
