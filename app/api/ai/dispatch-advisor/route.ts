import { NextRequest, NextResponse } from 'next/server';
import { getDispatchRiskAssessment } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const assessment = await getDispatchRiskAssessment(body);
    return NextResponse.json({ assessment });
  } catch (error) {
    console.error('Dispatch advisor error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI assessment' },
      { status: 500 }
    );
  }
}
