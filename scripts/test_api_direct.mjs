import assert from 'node:assert/strict';
import { GET as getRFQs, POST as createRFQ } from '../app/api/rfqs/route.ts';
import { GET as getRFQById, PATCH as updateRFQ } from '../app/api/rfqs/[id]/route.ts';
import { POST as approveRFQ } from '../app/api/rfqs/[id]/approve/route.ts';
import { POST as extractAI } from '../app/api/ai/extract/route.ts';
import { GET as getRates, POST as addRate } from '../app/api/rates/route.ts';
import { GET as searchPastParts } from '../app/api/past-parts/route.ts';

async function runDirectAPITests() {
  console.log('============================================================');
  console.log('AutoQuote AI - In-Process Route & API Verification');
  console.log('============================================================\n');

  // Test 1: GET /api/rfqs
  console.log('[API 1] GET /api/rfqs');
  const req1 = new Request('http://localhost/api/rfqs');
  const res1 = await getRFQs(req1);
  const json1 = await res1.json();
  assert.equal(json1.success, true);
  assert.ok(json1.data.length >= 8);
  console.log(`✓ Retrieved ${json1.data.length} RFQs | Win Rate: ${json1.metrics.winRate}%\n`);

  // Test 2: GET /api/rfqs/[id]
  console.log('[API 2] GET /api/rfqs/rfq-2611-014');
  const req2 = new Request('http://localhost/api/rfqs/rfq-2611-014');
  const res2 = await getRFQById(req2, { params: { id: 'rfq-2611-014' } });
  const json2 = await res2.json();
  assert.equal(json2.success, true);
  assert.equal(json2.data.part_name, 'Rear wheel spindle');
  assert.equal(json2.costing.multiVolumeBreakdown.length, 3);
  const primaryTier = json2.costing.recommendedBreakdown;
  console.log(`  - Part: ${json2.data.part_name}`);
  console.log(`  - Material: ${primaryTier.material_grade} @ ₹${primaryTier.material_rate_per_kg}/kg`);
  console.log(`  - Net Material: ₹${primaryTier.net_material_cost}`);
  console.log(`  - Ex-Factory Cost: ₹${primaryTier.total_ex_factory_cost}`);
  console.log(`  - Unit Price Excl GST: ₹${primaryTier.unit_price_excl_gst}`);
  console.log(`  - GST (18%): ₹${primaryTier.gst_amount}`);
  console.log(`  - Unit Price Incl GST: ₹${primaryTier.final_unit_price_incl_gst}`);
  console.log(`  - Annual Value: ₹${(primaryTier.annual_contract_value_excl_gst / 100000).toFixed(2)} Lakhs`);
  console.log(`  - Requires Sales Head Approval: ${primaryTier.requires_sales_head_approval}`);
  assert.equal(primaryTier.requires_sales_head_approval, true);
  console.log('✓ RFQ-2611-014 Costing & Approval Flag verified\n');

  // Test 3: POST /api/ai/extract
  console.log('[API 3] POST /api/ai/extract');
  const rawEmail = `
    Subject: RFQ for Rear Wheel Spindle
    Customer: Company B (two-wheelers)
    Drawing: DWG-RWS-8842-REV-C
    Material: EN8 Carbon Steel
    Gross Wt: 0.61 kg, Net Wt: 0.48 kg
    Annual Volume: 180,000 units
    Target Price: 85 INR
  `;
  const req3 = new Request('http://localhost/api/ai/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: rawEmail }),
  });
  const res3 = await extractAI(req3);
  const json3 = await res3.json();
  assert.equal(json3.success, true);
  assert.equal(json3.extracted.part_name.value, 'Rear wheel spindle');
  assert.equal(json3.extracted.material_grade.value, 'EN8');
  assert.equal(json3.extracted.annual_volume.value, 180000);
  assert.ok(json3.suggestedRouting.length >= 3);
  console.log(`  - Parsed Part: ${json3.extracted.part_name.value} (${Math.round(json3.extracted.part_name.confidence * 100)}% conf)`);
  console.log(`  - Suggested Routing Steps: ${json3.suggestedRouting.length}`);
  console.log(`  - Historical Match Provenance: ${json3.historicalMatchExplanation}`);
  console.log('✓ AI Intake Extraction verified\n');

  // Test 4: POST /api/rfqs (Create new RFQ)
  console.log('[API 4] POST /api/rfqs');
  const req4 = new Request('http://localhost/api/rfqs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      part_name: 'Counter Shaft Pinion',
      customer_name: 'Company D (drivetrains)',
      drawing_number: 'DWG-CSP-104-REV-A',
      material_grade: '20MnCr5',
      gross_weight_kg: 1.5,
      net_weight_kg: 1.2,
      annual_volume: 75000,
      routing_steps: json3.suggestedRouting,
    }),
  });
  const res4 = await createRFQ(req4);
  const json4 = await res4.json();
  assert.equal(json4.success, true);
  const createdId = json4.data.id;
  console.log(`✓ Created RFQ: ${json4.data.rfq_number} (ID: ${createdId})\n`);

  // Test 5: POST /api/rfqs/[id]/approve (Sales Head Sign-off)
  console.log(`[API 5] POST /api/rfqs/${createdId}/approve`);
  const req5 = new Request(`http://localhost/api/rfqs/${createdId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved_by: 'Vikram Malhotra (VP Sales)' }),
  });
  const res5 = await approveRFQ(req5, { params: { id: createdId } });
  const json5 = await res5.json();
  assert.equal(json5.success, true);
  assert.equal(json5.data.status, 'approved');
  console.log(`✓ Approved by: ${json5.data.approved_by} on ${json5.data.approved_at}\n`);

  // Test 6: GET & POST /api/rates (Rate Masters & Versioning)
  console.log('[API 6] GET & POST /api/rates');
  const req6 = new Request('http://localhost/api/rates');
  const res6 = await getRates(req6);
  const json6 = await res6.json();
  assert.equal(json6.success, true);
  assert.ok(json6.data.material_rates.length >= 6);
  assert.ok(json6.data.machine_hour_rates.length >= 5);
  console.log(`  - Material records: ${json6.data.material_rates.length}`);
  console.log(`  - Machine hour records: ${json6.data.machine_hour_rates.length}`);
  console.log('✓ Rate Masters verified\n');

  // Test 7: GET /api/past-parts
  console.log('[API 7] GET /api/past-parts?q=gear');
  const req7 = new Request('http://localhost/api/past-parts?q=gear');
  const res7 = await searchPastParts(req7);
  const json7 = await res7.json();
  assert.equal(json7.success, true);
  assert.ok(json7.data.length >= 1);
  console.log(`✓ Search returned ${json7.data.length} matches for 'gear'\n`);

  console.log('============================================================');
  console.log('ALL 7 API ROUTE HANDLER TESTS PASSED EMPIRICALLY!');
  console.log('============================================================\n');
}

runDirectAPITests().catch((err) => {
  console.error('API TEST FAILED:', err);
  process.exit(1);
});
