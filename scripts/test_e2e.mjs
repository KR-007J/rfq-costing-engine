import assert from 'node:assert/strict';

const BASE = 'http://localhost:3000';

async function runE2ETests() {
  console.log('============================================================');
  console.log('AutoQuote AI - End-to-End System & API Verification');
  console.log('============================================================\n');

  // Test 1: RFQ Register API
  console.log('[E2E 1] GET /api/rfqs');
  const res1 = await fetch(`${BASE}/api/rfqs`);
  assert.equal(res1.status, 200);
  const data1 = await res1.json();
  assert.equal(data1.success, true);
  assert.ok(data1.data.length >= 8, 'Expected at least 8 RFQs in pipeline');
  assert.equal(typeof data1.metrics.winRate, 'number');
  console.log(`✓ Fetched ${data1.data.length} RFQs, Pipeline Win Rate: ${data1.metrics.winRate}%\n`);

  // Test 2: Part Costing API on RFQ-2611-014
  console.log('[E2E 2] GET /api/rfqs/rfq-2611-014');
  const res2 = await fetch(`${BASE}/api/rfqs/rfq-2611-014`);
  assert.equal(res2.status, 200);
  const data2 = await res2.json();
  assert.equal(data2.success, true);
  assert.equal(data2.data.part_name, 'Rear wheel spindle');
  assert.equal(data2.costing.multiVolumeBreakdown.length, 3);
  const contractTier = data2.costing.recommendedBreakdown;
  console.log(`  - Part: ${data2.data.part_name}`);
  console.log(`  - Ex-Factory Cost: ₹${contractTier.total_ex_factory_cost}`);
  console.log(`  - Quoted Unit Price (Excl GST): ₹${contractTier.unit_price_excl_gst}`);
  console.log(`  - GST (18%): ₹${contractTier.gst_amount}`);
  console.log(`  - Final Price (Incl GST): ₹${contractTier.final_unit_price_incl_gst}`);
  console.log(`  - High-Value Approval Required: ${contractTier.requires_sales_head_approval}`);
  assert.equal(contractTier.requires_sales_head_approval, true);
  console.log('✓ Part Costing & Approval Flag verified\n');

  // Test 3: AI Extraction Endpoint
  console.log('[E2E 3] POST /api/ai/extract');
  const sampleEmail = `
    RFQ for Rear Axle Pin Shaft.
    Customer: Company B (two-wheelers)
    Drawing: DWG-RAP-9912-REV-A
    Material: EN8 Carbon Steel
    Gross Wt: 0.75 kg, Net Wt: 0.58 kg
    Annual Volume: 120,000 units
  `;
  const res3 = await fetch(`${BASE}/api/ai/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: sampleEmail }),
  });
  assert.equal(res3.status, 200);
  const data3 = await res3.json();
  assert.equal(data3.success, true);
  assert.ok(data3.overallConfidenceScore >= 0.85);
  assert.ok(data3.suggestedRouting.length >= 3);
  console.log(`  - Confidence: ${Math.round(data3.overallConfidenceScore * 100)}%`);
  console.log(`  - Suggested Routing: ${data3.suggestedRouting.length} operations`);
  console.log(`  - Match: ${data3.historicalMatchExplanation}`);
  console.log('✓ AI Intake & Historical Routing Suggestion passed\n');

  // Test 4: Create RFQ from AI Intake
  console.log('[E2E 4] POST /api/rfqs (Creating new RFQ)');
  const res4 = await fetch(`${BASE}/api/rfqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      part_name: data3.extracted.part_name.value,
      customer_name: data3.extracted.customer_name.value,
      drawing_number: data3.extracted.drawing_number.value,
      material_grade: data3.extracted.material_grade.value,
      gross_weight_kg: data3.extracted.gross_weight_kg.value,
      net_weight_kg: data3.extracted.net_weight_kg.value,
      annual_volume: data3.extracted.annual_volume.value,
      routing_steps: data3.suggestedRouting,
    }),
  });
  assert.equal(res4.status, 200);
  const data4 = await res4.json();
  assert.equal(data4.success, true);
  const newRfqId = data4.data.id;
  console.log(`✓ New RFQ Created: ${data4.data.rfq_number} (ID: ${newRfqId})\n`);

  // Test 5: Sales Head Approval on High-Value Quote
  console.log(`[E2E 5] POST /api/rfqs/${newRfqId}/approve (Sales Head Sign-off)`);
  const res5 = await fetch(`${BASE}/api/rfqs/${newRfqId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved_by: 'Vikram Malhotra (VP Sales)' }),
  });
  assert.equal(res5.status, 200);
  const data5 = await res5.json();
  assert.equal(data5.success, true);
  assert.equal(data5.data.status, 'approved');
  console.log(`✓ Approved by: ${data5.data.approved_by} on ${data5.data.approved_at}\n`);

  // Test 6: Rate Masters
  console.log('[E2E 6] GET /api/rates');
  const res6 = await fetch(`${BASE}/api/rates`);
  assert.equal(res6.status, 200);
  const data6 = await res6.json();
  assert.equal(data6.success, true);
  assert.ok(data6.data.material_rates.length >= 6);
  assert.ok(data6.data.machine_hour_rates.length >= 5);
  console.log(`✓ Rate Masters verified: ${data6.data.material_rates.length} materials, ${data6.data.machine_hour_rates.length} machines\n`);

  // Test 7: Past Quotes Search
  console.log('[E2E 7] GET /api/past-parts?q=spindle');
  const res7 = await fetch(`${BASE}/api/past-parts?q=spindle`);
  assert.equal(res7.status, 200);
  const data7 = await res7.json();
  assert.equal(data7.success, true);
  assert.ok(data7.data.length >= 1);
  console.log(`✓ Past parts search returned ${data7.data.length} matches for 'spindle'\n`);

  // Test 8: Frontend Pages Health Checks
  console.log('[E2E 8] HTML Frontend Health Checks');
  const pages = ['/', '/rfqs/new', '/rate-masters', '/past-quotes', '/rfqs/rfq-2611-014', '/rfqs/rfq-2611-014/quote'];
  for (const page of pages) {
    const res = await fetch(`${BASE}${page}`);
    assert.equal(res.status, 200, `Expected 200 for ${page}`);
    console.log(`  ✓ ${page} -> HTTP 200 OK`);
  }

  console.log('\n============================================================');
  console.log('ALL 8 END-TO-END VERIFICATION CHECKS PASSED EMPIRICALLY!');
  console.log('============================================================\n');
}

runE2ETests().catch((err) => {
  console.error('E2E TEST FAILURE:', err);
  process.exit(1);
});
