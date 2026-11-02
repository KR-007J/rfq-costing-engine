import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const costResult = db.calculateRFQCost(params.id);
    if (!costResult) {
      return NextResponse.json({ success: false, error: 'RFQ not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: costResult.rfq,
      costing: {
        multiVolumeBreakdown: costResult.multiVolumeBreakdown,
        recommendedBreakdown: costResult.recommendedBreakdown,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = db.updateRFQ(params.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'RFQ not found' }, { status: 404 });
    }

    const costResult = db.calculateRFQCost(params.id);
    return NextResponse.json({
      success: true,
      data: updated,
      costing: costResult ? {
        multiVolumeBreakdown: costResult.multiVolumeBreakdown,
        recommendedBreakdown: costResult.recommendedBreakdown,
      } : null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
