import { NextRequest, NextResponse } from 'next/server';
import { getMaintenanceSummary } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const summary = await getMaintenanceSummary(body);
    return NextResponse.json({ summary });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
