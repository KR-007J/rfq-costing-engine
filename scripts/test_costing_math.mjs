import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { calculatePartCost, calculateMultiVolumeQuotes } from '../lib/costing.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('------------------------------------------------------------');
console.log('AutoQuote AI - Verification Test Suite (Costing Engine Math)');
console.log('------------------------------------------------------------\n');

// 1. Load Data
const rateMasters = JSON.parse(
  readFileSync(resolve(__dirname, '../data/rate_masters.json'), 'utf8')
);
const seedRfqs = JSON.parse(
  readFileSync(resolve(__dirname, '../data/seed_rfqs.json'), 'utf8')
);

console.log(`✓ Loaded ${rateMasters.material_rates.length} material rate records`);
console.log(`✓ Loaded ${rateMasters.machine_hour_rates.length} machine hour rate records`);
console.log(`✓ Loaded ${seedRfqs.length} benchmark RFQs from Chakan, Pune`);

// TEST 1: RFQ-2611-014 (Rear Wheel Spindle, EN8, 180,000 Volume)
console.log('\n[Test 1] RFQ-2611-014: High Volume Rear Wheel Spindle (Company B)');
const rfq14 = seedRfqs.find((r) => r.rfq_number === 'RFQ-2611-014');
assert.ok(rfq14, 'RFQ-2611-014 must exist in seed data');

const quote14 = calculatePartCost(
  {
    material_grade: rfq14.material_grade,
    gross_weight_kg: rfq14.gross_weight_kg,
    net_weight_kg: rfq14.net_weight_kg,
    routing_steps: rfq14.routing_steps,
    volume_tier: rfq14.volume_tiers[2], // 180,000 contract volume
    gst_pct: rfq14.gst_rate_percent,
  },
  rateMasters,
  '2026-10-25'
);

console.log(`  - Material: ${quote14.material_grade} @ ₹${quote14.material_rate_per_kg}/kg`);
console.log(`  - Gross Material Cost: ₹${quote14.gross_material_cost}`);
console.log(`  - Scrap Recovery Credit: -₹${quote14.scrap_recovery_credit} (${quote14.scrap_weight_kg}kg @ ₹${quote14.scrap_rate_per_kg}/kg)`);
console.log(`  - Net Material Cost: ₹${quote14.net_material_cost}`);
console.log(`  - Routing Operations: ${quote14.operations.length} steps, Total Routing: ₹${quote14.total_routing_cost}`);
console.log(`  - Ex-Factory Cost: ₹${quote14.total_ex_factory_cost}`);
console.log(`  - Margin (${quote14.margin_pct}%): ₹${quote14.margin_amount}`);
console.log(`  - Unit Selling Price (Excl GST): ₹${quote14.unit_price_excl_gst}`);
console.log(`  - GST (18%): ₹${quote14.gst_amount}`);
console.log(`  - Final Unit Price (Incl GST): ₹${quote14.final_unit_price_incl_gst}`);
console.log(`  - Annual Contract Value: ₹${(quote14.annual_contract_value_excl_gst / 100000).toFixed(2)} Lakhs`);
console.log(`  - Requires Sales Head Approval (> ₹25L): ${quote14.requires_sales_head_approval}`);

// Assertions for RFQ-2611-014
assert.equal(quote14.material_grade, 'EN8');
assert.equal(quote14.gross_weight_kg, 0.61);
assert.equal(quote14.net_weight_kg, 0.48);
assert.equal(quote14.scrap_weight_kg, 0.13);
// In 2026-10-25, EN8 rate v2 is 76.5
assert.equal(quote14.material_rate_per_kg, 76.5);
assert.equal(quote14.gross_material_cost, Math.round(0.61 * 76.5 * 100) / 100); // 46.67
assert.equal(quote14.scrap_recovery_credit, Math.round(0.13 * 32.0 * 100) / 100); // 4.16
assert.ok(quote14.annual_contract_value_excl_gst > 2500000, 'Contract value must exceed ₹25L');
assert.equal(quote14.requires_sales_head_approval, true, 'High value quote must require approval');
console.log('✓ RFQ-2611-014 Math & Approval Gate Passed');

// TEST 2: Multi-Volume Pricing Comparison
console.log('\n[Test 2] Multi-Volume Price Breaks for RFQ-2611-014');
const multiQuotes = calculateMultiVolumeQuotes(
  {
    material_grade: rfq14.material_grade,
    gross_weight_kg: rfq14.gross_weight_kg,
    net_weight_kg: rfq14.net_weight_kg,
    routing_steps: rfq14.routing_steps,
    gst_pct: rfq14.gst_rate_percent,
  },
  rfq14.volume_tiers,
  rateMasters,
  '2026-10-25'
);

assert.equal(multiQuotes.length, 3);
multiQuotes.forEach((q) => {
  console.log(`  Tier [${q.label}]: Batch ${q.batch_size} -> Setup Amortization: ₹${q.total_setup_cost}/pc | Unit Price: ₹${q.unit_price_excl_gst}`);
});
// Higher batch size amortizes setup cost better -> Unit price should be lower or equal for higher volume
assert.ok(
  multiQuotes[0].unit_price_excl_gst >= multiQuotes[1].unit_price_excl_gst,
  'Unit price at 60k should be >= unit price at 120k due to setup amortization'
);
assert.ok(
  multiQuotes[1].unit_price_excl_gst >= multiQuotes[2].unit_price_excl_gst,
  'Unit price at 120k should be >= unit price at 180k due to setup amortization'
);
console.log('✓ Multi-Volume Setup Amortization Invariant Passed');

// TEST 3: Rate Master Effective Dating (Immutable Past Quotes)
console.log('\n[Test 3] Rate Master Versioning & Effective Date Invariant');
// Rate in 2025 (v1.0 = ₹72.0) vs Rate in 2026 (v2.0 = ₹76.5)
const quote2025 = calculatePartCost(
  {
    material_grade: 'EN8',
    gross_weight_kg: 1.0,
    net_weight_kg: 1.0,
    routing_steps: [],
    volume_tier: { volume: 1000, batch_size: 1000, label: 'Standard' },
    margin_pct: 0,
    factory_overhead_pct: 0,
    quality_inspection_pct: 0,
    packaging_inr: 0,
    freight_inr: 0,
    gst_pct: 0,
  },
  rateMasters,
  '2025-06-15'
);

const quote2026 = calculatePartCost(
  {
    material_grade: 'EN8',
    gross_weight_kg: 1.0,
    net_weight_kg: 1.0,
    routing_steps: [],
    volume_tier: { volume: 1000, batch_size: 1000, label: 'Standard' },
    margin_pct: 0,
    factory_overhead_pct: 0,
    quality_inspection_pct: 0,
    packaging_inr: 0,
    freight_inr: 0,
    gst_pct: 0,
  },
  rateMasters,
  '2026-06-15'
);

console.log(`  - 2025 Rate Snapshot: ₹${quote2025.material_rate_per_kg}/kg -> Cost: ₹${quote2025.net_material_cost}`);
console.log(`  - 2026 Rate Snapshot: ₹${quote2026.material_rate_per_kg}/kg -> Cost: ₹${quote2026.net_material_cost}`);
assert.equal(quote2025.material_rate_per_kg, 72.0, '2025 quote must use v1 rate of ₹72/kg');
assert.equal(quote2026.material_rate_per_kg, 76.5, '2026 quote must use v2 rate of ₹76.5/kg');
console.log('✓ Rate Master Temporal Immutability Invariant Passed');

// TEST 4: RFQ-2611-019 (Hydraulic Lift Arm, 40Cr4 Forging, Press Machining)
console.log('\n[Test 4] RFQ-2611-019: Heavy Forging (Company C)');
const rfq19 = seedRfqs.find((r) => r.rfq_number === 'RFQ-2611-019');
const quote19 = calculatePartCost(
  {
    material_grade: rfq19.material_grade,
    gross_weight_kg: rfq19.gross_weight_kg,
    net_weight_kg: rfq19.net_weight_kg,
    routing_steps: rfq19.routing_steps,
    volume_tier: rfq19.volume_tiers[1], // 24,000 contract volume
    gst_pct: rfq19.gst_rate_percent,
  },
  rateMasters,
  '2026-10-28'
);
console.log(`  - Material Rate: 40Cr4 forging @ ₹${quote19.material_rate_per_kg}/kg`);
console.log(`  - Net Material: ₹${quote19.net_material_cost} (Gross: ₹${quote19.gross_material_cost}, Scrap: -₹${quote19.scrap_recovery_credit})`);
console.log(`  - Routing Total: ₹${quote19.total_routing_cost}`);
console.log(`  - Unit Price Excl GST: ₹${quote19.unit_price_excl_gst}`);
console.log(`  - Annual Value: ₹${(quote19.annual_contract_value_excl_gst / 100000).toFixed(2)} Lakhs`);
assert.equal(quote19.requires_sales_head_approval, true, 'Annual value must exceed ₹25L');
console.log('✓ RFQ-2611-019 Math Passed');

console.log('\n============================================================');
console.log('ALL 4 COSTING ENGINE VERIFICATION TESTS PASSED EMPIRICALLY!');
console.log('============================================================\n');
