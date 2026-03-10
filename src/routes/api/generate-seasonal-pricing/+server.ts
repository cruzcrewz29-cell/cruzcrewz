// src/routes/api/generate-seasonal-pricing/+server.ts
import { json } from '@sveltejs/kit';
import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '$env/static/private';

export async function POST({ request }) {
  const { region } = await request.json();
  const groq = new Groq({ apiKey: GROQ_API_KEY });

  const chat = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `You are a lawn care pricing expert. Suggest monthly pricing multipliers for a lawn care business serving ${region}. Return ONLY valid JSON array of 12 objects with fields: month (1-12), multiplier (0.70-1.30), note (short label like "Peak season"). No explanation, no markdown.`
    }],
    max_tokens: 600,
  });

  try {
    const text = chat.choices[0].message.content ?? '[]';
    const clean = text.replace(/```json|```/g, '').trim();
    const multipliers = JSON.parse(clean);
    return json({ multipliers });
  } catch {
    return json({ error: 'Failed to parse AI response' }, { status: 500 });
  }
}