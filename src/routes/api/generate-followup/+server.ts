// src/routes/api/generate-followup/+server.ts
import { json } from '@sveltejs/kit';
import { GROQ_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { job, season, days } = await request.json();

    const customer = job.customers;
    const isRepeat = job.jobHistory?.some((h: any) => h.status === 'completed');
    const completedJobs = job.jobHistory?.filter((h: any) => h.status === 'completed') ?? [];
    const totalSpend = completedJobs.reduce((s: number, j: any) => s + (j.price ?? 0), 0);

    const seasonContext: Record<string, string> = {
      spring: 'Spring is the busiest season — yards are waking up and customers want to get ahead of growth.',
      summer: 'Summer heat means lawns need consistent care to stay healthy and green.',
      fall:   'Fall cleanup season — leaves are falling and customers want their yards ready for winter.',
      winter: 'Winter is slow — a friendly check-in can lock in spring bookings early.',
    };

    const prompt = `You are writing a follow-up email for Cruz Crewz, a professional lawn care company serving the Chicago metro area and northwest Indiana. Cruz Crewz is known for quality work, reliability, and friendly service.

Write a follow-up email to a customer who received a quote but hasn't responded yet.

CUSTOMER INFO:
- Name: ${customer?.name ?? 'there'}
- Address: ${customer?.address ?? 'not provided'}
- Repeat customer: ${isRepeat ? `Yes — ${completedJobs.length} previous job(s), $${totalSpend} total spent` : 'No — this is a new customer'}

QUOTE DETAILS:
- Service: ${job.service_type}
- Quoted price: ${job.price ? `$${job.price}` : 'custom quote'}
- Quote sent: ${days} day${days !== 1 ? 's' : ''} ago
- Scheduled for: ${new Date(job.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
${job.description ? `- Notes: ${job.description}` : ''}

CONTEXT:
- Current season: ${season}
- ${seasonContext[season] ?? ''}

TONE GUIDELINES:
- Warm, professional, and genuinely helpful — not pushy or salesy
- Short and easy to read — 3-4 short paragraphs max
- Use the customer's first name only
- If they're a repeat customer, briefly acknowledge the relationship
- Include a clear, low-pressure call to action (reply, call, or click to sign)
- Sign off as "Cruz" from Cruz Crewz
- Do NOT use generic filler like "I hope this email finds you well"
- Do NOT mention competitors
- ${days >= 7 ? 'The quote has been sitting over a week — you can mention you want to make sure it did not get lost.' : 'Do NOT offer discounts — quote is still fresh.'}

Respond ONLY with valid JSON, no markdown, no preamble:
{"subject": "email subject line here", "body": "full email body here with \\n for line breaks"}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens:  1024,
        messages: [
          {
            role:    'system',
            content: 'You are an email copywriter. You always respond with valid JSON only — no markdown fences, no explanation, no preamble.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[generate-followup] Groq error:', err);
      return json({ error: 'AI generation failed' }, { status: 500 });
    }

    const aiData = await response.json();
    const rawText = aiData.choices?.[0]?.message?.content ?? '';
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return json({ success: true, subject: parsed.subject, body: parsed.body });
  } catch (err) {
    console.error('[generate-followup] error:', err);
    return json({ error: 'Failed to generate follow-up' }, { status: 500 });
  }
};