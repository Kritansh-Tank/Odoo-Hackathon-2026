import Groq from 'groq-sdk';
import type { DispatchRiskAssessment } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

// ─── DISPATCH RISK ADVISOR ────────────────────────────────────

export interface DispatchAdvisorInput {
  driver_name: string;
  driver_safety_score: number;
  license_expiry_date: string;
  vehicle_name: string;
  vehicle_registration: string;
  vehicle_odometer: number;
  cargo_weight: number;
  max_load_capacity: number;
  planned_distance: number;
  source: string;
  destination: string;
}

export async function getDispatchRiskAssessment(
  input: DispatchAdvisorInput
): Promise<DispatchRiskAssessment> {
  const loadPercentage = Math.round((input.cargo_weight / input.max_load_capacity) * 100);
  const daysToExpiry = Math.ceil(
    (new Date(input.license_expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const prompt = `You are a fleet safety AI for TransitOps. Analyze this trip dispatch request and provide a risk assessment.

TRIP DETAILS:
- Route: ${input.source} → ${input.destination}
- Planned Distance: ${input.planned_distance} km

DRIVER:
- Name: ${input.driver_name}
- Safety Score: ${input.driver_safety_score}/100 ${input.driver_safety_score < 60 ? '(POOR)' : input.driver_safety_score < 80 ? '(FAIR)' : '(GOOD)'}
- License Expires: ${input.license_expiry_date} (${daysToExpiry > 0 ? `${daysToExpiry} days remaining` : 'EXPIRED'})

VEHICLE:
- Name: ${input.vehicle_name} (${input.vehicle_registration})
- Odometer: ${input.vehicle_odometer.toLocaleString()} km ${input.vehicle_odometer > 150000 ? '(HIGH MILEAGE)' : ''}

CARGO:
- Weight: ${input.cargo_weight} kg / ${input.max_load_capacity} kg max (${loadPercentage}% loaded)

Risk factors to consider:
- Driver safety score below 70 = higher risk
- Load above 85% capacity = higher risk
- License expiring within 15 days = higher risk
- Odometer above 150,000 km = moderate risk
- Distance above 500 km = moderate risk

Respond ONLY with valid JSON in this exact format:
{
  "risk": "Low" | "Medium" | "High",
  "score": <number 0-100>,
  "summary": "<2-3 sentence assessment>",
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from Groq');

    const parsed = JSON.parse(content) as DispatchRiskAssessment;
    return parsed;
  } catch (error) {
    console.error('Groq dispatch advisor error:', error);
    // Fallback assessment
    return {
      risk: loadPercentage > 85 || input.driver_safety_score < 60 ? 'High' : 'Low',
      score: input.driver_safety_score,
      summary: 'AI assessment unavailable. Review manually before dispatching.',
      recommendations: ['Verify vehicle condition', 'Check driver availability', 'Confirm route safety'],
    };
  }
}

// ─── MAINTENANCE SUMMARY ──────────────────────────────────────

export interface MaintenanceSummaryInput {
  vehicle_name: string;
  registration_number: string;
  maintenance_type: string;
  description: string;
  technician: string;
  start_date: string;
  end_date: string;
  cost: number;
}

export async function getMaintenanceSummary(input: MaintenanceSummaryInput): Promise<string> {
  const startDate = new Date(input.start_date);
  const endDate = new Date(input.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const prompt = `Generate a professional maintenance completion report for fleet records.

MAINTENANCE DETAILS:
- Vehicle: ${input.vehicle_name} (${input.registration_number})
- Work Type: ${input.maintenance_type}
- Description: ${input.description}
- Technician: ${input.technician || 'Not specified'}
- Duration: ${input.start_date} to ${input.end_date} (${days} day${days !== 1 ? 's' : ''})
- Total Cost: ₹${input.cost.toLocaleString()}

Write a professional 3-paragraph maintenance summary suitable for fleet management records. 
Include: work performed, outcome/condition assessment, and maintenance recommendations.
Keep it factual, professional, and under 200 words total.`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || 'Maintenance completed successfully.';
  } catch (error) {
    console.error('Groq maintenance summary error:', error);
    return `Maintenance work of type "${input.maintenance_type}" was completed for vehicle ${input.vehicle_name} (${input.registration_number}). Work was performed by ${input.technician || 'assigned technician'} over ${days} day(s) at a cost of ₹${input.cost.toLocaleString()}.`;
  }
}

// ─── LICENSE EXPIRY EMAIL ─────────────────────────────────────

export interface LicenseReminderInput {
  driver_name: string;
  license_number: string;
  expiry_date: string;
  days_until_expiry: number;
  company_name?: string;
}

export async function getLicenseReminderEmail(input: LicenseReminderInput): Promise<{
  subject: string;
  body: string;
}> {
  const prompt = `Write a professional, friendly license renewal reminder email.

CONTEXT:
- Driver Name: ${input.driver_name}
- License Number: ${input.license_number}
- Expiry Date: ${input.expiry_date}
- Days Until Expiry: ${input.days_until_expiry}
- Company: ${input.company_name || 'TransitOps'}

Requirements:
- Professional but warm tone
- Clear urgency without being alarming
- Mention the specific expiry date
- Include next steps (visit RTO, gather documents)
- Under 150 words for the body
- Subject line should be clear and action-oriented

Respond ONLY with valid JSON:
{
  "subject": "<email subject>",
  "body": "<email body with line breaks as \\n>"
}`;

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response');

    return JSON.parse(content) as { subject: string; body: string };
  } catch (error) {
    console.error('Groq license reminder error:', error);
    return {
      subject: `Action Required: License Renewal Due in ${input.days_until_expiry} Days`,
      body: `Dear ${input.driver_name},\n\nThis is a reminder that your driving license (${input.license_number}) is expiring on ${input.expiry_date} — ${input.days_until_expiry} days from now.\n\nPlease visit your nearest RTO to renew your license before the expiry date to continue driving.\n\nBest regards,\n${input.company_name || 'TransitOps'} Fleet Management`,
    };
  }
}
