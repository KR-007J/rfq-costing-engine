import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { calculatePartCost } from '../lib/costing.ts';
import { db } from '../lib/db.ts';

console.log('============================================================');
console.log('AutoQuote AI - Cybersecurity & Production Hardening Verifier');
console.log('============================================================\n');

const seedFile = path.join(process.cwd(), 'data/seed_rfqs.json');
const originalSeedJson = fs.readFileSync(seedFile, 'utf8');

const mockRates = db.getRateMasters();

// TEST 1: Division by Zero & Arithmetic Boundary Hardening
console.log('[SEC 1] Division by Zero & Margin Edge Cases');
const boundaryCosting = calculatePartCost(
  {
    material_grade: 'EN8',
    gross_weight_kg: -10, // Negative input weight
    net_weight_kg: -20,
    routing_steps: [
      {
        step_no: 1,
        operation_name: 'Test',
        machine_code: 'CNC-TURN-01',
        cycle_time_minutes: -5, // Negative cycle time
        setup_time_minutes: -10,
      }
    ],
    volume_tier: {
      volume: -500, // Negative volume
      batch_size: 0, // Zero batch size (potential division by zero!)
      label: 'Zero Batch',
    },
    margin_pct: 100, // 100% margin (potential division by zero in 1 - margin/100!)
  },
  mockRates
);

assert.ok(Number.isFinite(boundaryCosting.unit_price_excl_gst), 'Unit price must remain finite');
assert.ok(boundaryCosting.gross_weight_kg >= 0, 'Gross weight must clamp to >= 0');
assert.ok(boundaryCosting.operations[0].cycle_time_minutes >= 0, 'Cycle time must clamp to >= 0');
assert.ok(boundaryCosting.batch_size > 0, 'Batch size must clamp to positive integer');
assert.ok(boundaryCosting.margin_pct <= 90, 'Margin must clamp to safe upper limit <= 90%');
console.log(`  - Clamped Margin: ${boundaryCosting.margin_pct}%`);
console.log(`  - Unit Price Excl GST: ₹${boundaryCosting.unit_price_excl_gst} (Finite: ${Number.isFinite(boundaryCosting.unit_price_excl_gst)})`);
console.log('✓ Division by zero and negative value boundaries hardened\n');

// TEST 2: Prototype Pollution Defense
console.log('[SEC 2] Prototype Pollution Defense');
const maliciousPayload = JSON.parse('{"__proto__": {"admin": true}, "part_name": "Injected Part", "customer_name": "Hacker Corp"}');
const created = db.createRFQ(maliciousPayload);
assert.equal(({}).admin, undefined, 'Global Object prototype must NOT be polluted');
assert.equal(created.customer_name, 'Hacker Corp');
console.log('✓ Object prototype pollution intercepted and neutralized\n');

// TEST 3: Stored XSS Script Tag Neutralization
console.log('[SEC 3] Stored XSS Script Tag Neutralization');
const xssPayload = {
  customer_name: '<script>alert("XSS")</script>Company B',
  part_name: '<img src=x onerror=alert(1)>Rear Wheel Spindle',
  drawing_number: 'DWG-9999<svg onload=alert(2)>',
  material_grade: 'EN8',
  gross_weight_kg: 1.0,
  net_weight_kg: 0.8,
  annual_volume: 50000,
  volume_tiers: [],
  routing_steps: [],
  status: 'estimating',
  assigned_estimator: 'Rajesh',
  assigned_sales_head: 'Vikram',
  created_date: '2026-11-02',
  due_date: '2026-11-10',
  currency: 'INR',
  gst_rate_percent: 18.0,
};
const sanitizedRfq = db.createRFQ(xssPayload);
assert.ok(!sanitizedRfq.customer_name.includes('<script>'), 'Script tag must be stripped from customer_name');
assert.ok(!sanitizedRfq.part_name.includes('<img'), 'Image tag must be stripped from part_name');
assert.ok(!sanitizedRfq.drawing_number.includes('<svg'), 'SVG tag must be stripped from drawing_number');
console.log(`  - Sanitized Customer: "${sanitizedRfq.customer_name}"`);
console.log(`  - Sanitized Part: "${sanitizedRfq.part_name}"`);
console.log('✓ HTML/Script tags stripped from persistent state\n');

// TEST 4: Immutable Key Tampering Defense
console.log('[SEC 4] Immutable Primary Key Defense');
const updated = db.updateRFQ(sanitizedRfq.id, {
  id: 'hacked-id-override',
  created_date: '1970-01-01',
  part_name: 'Legitimately Updated Part Name',
});
assert.equal(updated?.id, sanitizedRfq.id, 'RFQ ID must be immutable');
assert.notEqual(updated?.created_date, '1970-01-01', 'Created date must be immutable');
assert.equal(updated?.part_name, 'Legitimately Updated Part Name');
console.log('✓ Primary key and temporal creation date immutability verified\n');

// TEST 5: High-Value Approval Gate Threshold (> ₹25 Lakhs)
console.log('[SEC 5] High-Value Contract Gate Boundary');
// 10,000 pcs @ ₹200 = ₹20 Lakhs (< ₹25L) -> requires_sales_head_approval: false
const lowValueQuote = calculatePartCost(
  {
    material_grade: 'EN8',
    gross_weight_kg: 0.5,
    net_weight_kg: 0.4,
    routing_steps: [],
    volume_tier: { volume: 10000, batch_size: 1000, label: 'Low Val' },
    margin_pct: 10,
    factory_overhead_pct: 5,
    quality_inspection_pct: 0,
    packaging_inr: 0,
    freight_inr: 0,
  },
  mockRates
);
// 100,000 pcs @ ₹100 = ₹1 Crore (> ₹25L) -> requires_sales_head_approval: true
const highValueQuote = calculatePartCost(
  {
    material_grade: 'EN8',
    gross_weight_kg: 0.5,
    net_weight_kg: 0.4,
    routing_steps: [],
    volume_tier: { volume: 100000, batch_size: 1000, label: 'High Val' },
    margin_pct: 10,
    factory_overhead_pct: 5,
    quality_inspection_pct: 0,
    packaging_inr: 0,
    freight_inr: 0,
  },
  mockRates
);

console.log(`  - Low Value Contract: ₹${(lowValueQuote.annual_contract_value_excl_gst / 100000).toFixed(2)}L -> Approval Required: ${lowValueQuote.requires_sales_head_approval}`);
console.log(`  - High Value Contract: ₹${(highValueQuote.annual_contract_value_excl_gst / 100000).toFixed(2)}L -> Approval Required: ${highValueQuote.requires_sales_head_approval}`);
assert.equal(lowValueQuote.requires_sales_head_approval, false);
assert.equal(highValueQuote.requires_sales_head_approval, true);
console.log('✓ High-value governance threshold verified\n');

// Restore original seed JSON to preserve clean state
fs.writeFileSync(seedFile, originalSeedJson, 'utf8');

console.log('============================================================');
console.log('ALL 5 CYBERSECURITY & HARDENING VERIFICATION TESTS PASSED!');
console.log('============================================================\n');
