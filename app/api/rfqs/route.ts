import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const rfqs = db.getRFQs({ status, search });
    
    // Compute pipeline metrics
    const all = db.getRFQs();
    const totalCount = all.length;
    const estimatingCount = all.filter((r) => r.status === 'estimating').length;
    const pendingApprovalCount = all.filter((r) => r.status === 'pending_approval').length;
    const sentCount = all.filter((r) => r.status === 'sent').length;
    const wonCount = all.filter((r) => r.status === 'won').length;
    const lostCount = all.filter((r) => r.status === 'lost').length;
    const closedCount = wonCount + lostCount;
    const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: rfqs,
      metrics: {
        totalCount,
        estimatingCount,
        pendingApprovalCount,
        sentCount,
        wonCount,
        lostCount,
        winRate,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.part_name || !body.customer_name || !body.material_grade) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (part_name, customer_name, material_grade)' },
        { status: 400 }
      );
    }

    const created = db.createRFQ({
      rfq_number: body.rfq_number || `RFQ-${new Date().getFullYear().toString().slice(2)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(100 + Math.random() * 900))}`,
      customer_name: body.customer_name,
      customer_tier: body.customer_tier || 'Tier-1 OEM',
      plant_location: body.plant_location || 'Chakan, Pune',
      part_name: body.part_name,
      drawing_number: body.drawing_number || `DWG-${Math.floor(1000 + Math.random() * 9000)}-REV-A`,
      material_grade: body.material_grade,
      gross_weight_kg: Number(body.gross_weight_kg) || 1.0,
      net_weight_kg: Number(body.net_weight_kg) || 0.8,
      scrap_weight_kg: Math.max(0, (Number(body.gross_weight_kg) || 1.0) - (Number(body.net_weight_kg) || 0.8)),
      annual_volume: Number(body.annual_volume) || 50000,
      target_price_inr: body.target_price_inr ? Number(body.target_price_inr) : undefined,
      status: body.status || 'estimating',
      assigned_estimator: body.assigned_estimator || 'Rajesh Sharma (Senior Estimator)',
      assigned_sales_head: body.assigned_sales_head || 'Vikram Malhotra (VP Sales)',
      created_date: new Date().toISOString().split('T')[0],
      due_date: body.due_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      currency: 'INR',
      gst_rate_percent: 18.0,
      volume_tiers: body.volume_tiers || [
        { volume: Math.round(body.annual_volume * 0.33), batch_size: 2500, label: 'Batch Low' },
        { volume: Math.round(body.annual_volume * 0.66), batch_size: 5000, label: 'Batch Mid' },
        { volume: Number(body.annual_volume), batch_size: 10000, label: 'Full Commitment' },
      ],
      routing_steps: body.routing_steps || [
        { step_no: 10, operation_name: 'CNC Turning Rough & Finish', machine_code: 'CNC-TURN-01', cycle_time_minutes: 3.5, setup_time_minutes: 30, machine_hour_rate_inr: 850 },
        { step_no: 20, operation_name: 'VMC Drilling & Tapping', machine_code: 'VMC-4AX-02', cycle_time_minutes: 2.0, setup_time_minutes: 25, machine_hour_rate_inr: 950 },
      ],
      ai_extraction_provenance: body.ai_extraction_provenance,
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
