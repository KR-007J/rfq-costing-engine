import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const approvedBy = body.approved_by || 'Vikram Malhotra (VP Sales)';

    const approved = db.approveRFQ(params.id, approvedBy);
    if (!approved) {
      return NextResponse.json({ success: false, error: 'RFQ not found' }, { status: 404 });
    }

    const costResult = db.calculateRFQCost(params.id);
    return NextResponse.json({
      success: true,
      message: `RFQ ${approved.rfq_number} successfully approved by ${approvedBy}`,
      data: approved,
      costing: costResult ? {
        multiVolumeBreakdown: costResult.multiVolumeBreakdown,
        recommendedBreakdown: costResult.recommendedBreakdown,
      } : null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
