# Project Architecture & PRD: AutoQuote AI (RFQ-to-Quote Costing Engine)
### Client: Company A, Chakan, Pune (Automotive Machined & Forged Parts)
### Author: Krish Joshi | Software Engineering Candidate

---

## 1. Domain Modeling & Costing Mathematics

### 1.1 The Exact Engineering Costing Formula
Costing is 100% deterministic (never computed by generative AI):

1. **Material Cost Per Part:**
   $$\text{Gross Material Cost} = \text{Gross Weight (kg)} \times \text{Material Rate (₹/kg)}$$
   $$\text{Scrap Weight (kg)} = \text{Gross Weight (kg)} - \text{Net Finished Weight (kg)}$$
   $$\text{Scrap Recovery Credit} = \text{Scrap Weight (kg)} \times \text{Scrap Rate (₹/kg)} \times \text{Scrap Recovery Factor (e.g. 0.90)}$$
   $$\text{Net Raw Material Cost} = \text{Gross Material Cost} - \text{Scrap Recovery Credit}$$

2. **Machining / Routing Operations Cost:**
   For each operation $i \in \{ \text{Sawing, CNC Turning, VMC Milling, Heat Treatment, Cylindrical Grinding, Inspection} \}$:
   $$\text{Operation Cost}_i = \left( \frac{\text{Cycle Time (min)}}{60} \times \text{Machine Hour Rate (₹/hr)} \right) + \left( \frac{\text{Setup Time (min)}}{60 \times \text{Batch Size}} \times \text{Setup Hour Rate (₹/hr)} \right)$$
   $$\text{Total Routing Cost} = \sum_{i} \text{Operation Cost}_i$$

3. **Subtotal Factory Cost:**
   $$\text{Prime Manufacturing Cost} = \text{Net Raw Material Cost} + \text{Total Routing Cost}$$
   $$\text{Factory Overhead Cost} = \text{Prime Manufacturing Cost} \times \left( \frac{\text{Overhead \%}}{100} \right)$$
   $$\text{Direct Logistics Cost} = \text{Special Packaging (₹/part)} + \text{Freight Logistics (₹/part)}$$
   $$\text{Total Ex-Factory Cost} = \text{Prime Manufacturing Cost} + \text{Factory Overhead Cost} + \text{Direct Logistics Cost}$$

4. **Margin & Final Quotation:**
   $$\text{Final Part Unit Price (Excl. Tax)} = \frac{\text{Total Ex-Factory Cost}}{1 - \left( \frac{\text{Target Margin \%}}{100} \right)}$$
   $$\text{GST (18\%)} = \text{Final Part Unit Price} \times 0.18$$
   $$\text{Final Invoiced Price (Incl. GST)} = \text{Final Part Unit Price} + \text{GST}$$

5. **Multi-Volume Price Slabs (Amortization Scaling):**
   - Tier 1: Low Volume (e.g., 20,000 units/year $\rightarrow$ Batch size 1,500)
   - Tier 2: Mid Volume (e.g., 60,000 units/year $\rightarrow$ Batch size 5,000)
   - Tier 3: High Volume (e.g., 180,000 units/year $\rightarrow$ Batch size 15,000)
   *Higher annual volume lowers setup amortization per piece and allows raw material bulk discount.*

---

## 2. Rate Master Versioning Architecture

To solve the **"Old quotes keep old rates"** requirement:
- Rate Masters are **append-only with effective date ranges**:
  `MaterialRate(id, material_code, rate_per_kg, effective_from, effective_to)`
  `MachineRate(id, machine_code, hour_rate, effective_from, effective_to)`
- When a Quote is drafted, it captures an immutable **Snapshot JSON** of the exact Rate IDs and values used at quotation time:
  ```json
  {
    "rates_snapshot_id": "snap_202611_01",
    "snapshot_timestamp": "2026-11-02T10:00:00Z",
    "material_rates": { "EN8": 72.0, "40Cr4": 98.0, "20MnCr5": 110.0 },
    "machine_hour_rates": { "CNC-TURN-01": 850.0, "VMC-4AX-02": 1200.0, "FORGE-PRESS": 1450.0 }
  }
  ```
- Any future revision of the Rate Master does **NOT** modify or invalidate locked/historical quotes.

---

## 3. Roles and Approval Workflow

- **Estimator (`estimator@companya.com`)**:
  - Ingests RFQs via AI intake.
  - Edits weights, machine routings, cycle times, and scrap credits.
  - Generates costing sheets and multi-volume tables.
- **Sales Head (`saleshead@companya.com`)**:
  - Reviews quotes.
  - **Automated Gate**: If `Annual Order Value` $= \text{Unit Price} \times \text{Annual Volume} > ₹25,00,000$ (₹25 Lakh), status is locked as `Pending Approval`.
  - Sales Head can Approve, Reject with Revision Notes, or Apply Strategic Margin Override.
- **Status State Machine**:
  `Draft` $\rightarrow$ `Estimating` $\rightarrow$ `Pending Approval` (if $> ₹25L$) $\rightarrow$ `Approved` $\rightarrow$ `Sent to Customer` $\rightarrow$ `Won` / `Lost (with Reason Code)`.
