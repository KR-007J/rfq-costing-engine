import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const rates = db.getRateMasters();
    return NextResponse.json({ success: true, data: rates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const type = body.type; // 'material' | 'machine'

    if (type === 'material') {
      if (!body.material_grade || !body.base_rate_per_kg || !body.effective_from) {
        return NextResponse.json(
          { success: false, error: 'Missing material_grade, base_rate_per_kg, or effective_from' },
          { status: 400 }
        );
      }
      const newRate = db.addMaterialRate({
        material_grade: body.material_grade,
        material_type: body.material_type || 'Steel Alloy',
        density_kg_dm3: Number(body.density_kg_dm3) || 7.85,
        base_rate_per_kg: Number(body.base_rate_per_kg),
        effective_from: body.effective_from,
        effective_to: null,
        version: body.version || `v${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
      });
      return NextResponse.json({ success: true, data: newRate });
    } else if (type === 'machine') {
      if (!body.machine_code || !body.hour_rate_inr || !body.effective_from) {
        return NextResponse.json(
          { success: false, error: 'Missing machine_code, hour_rate_inr, or effective_from' },
          { status: 400 }
        );
      }
      const newRate = db.addMachineHourRate({
        machine_code: body.machine_code,
        machine_name: body.machine_name || body.machine_code,
        hour_rate_inr: Number(body.hour_rate_inr),
        setup_rate_inr: Number(body.setup_rate_inr) || 450,
        effective_from: body.effective_from,
        effective_to: null,
        version: body.version || `v${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`,
      });
      return NextResponse.json({ success: true, data: newRate });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid rate type. Must be "material" or "machine"' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
