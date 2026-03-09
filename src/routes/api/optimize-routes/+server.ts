// src/routes/api/optimize-routes/+server.ts
//
// Uses Groq (llama-3.3-70b-versatile) for route optimization.
// Groq is free tier friendly and fast for structured JSON output.
//
// Add to Netlify env vars:
//   GROQ_API_KEY — from console.groq.com (free account)

import { json } from '@sveltejs/kit';
import { GROQ_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { crews, date, weatherData, startTime = '8:00 AM' } = await request.json();

    if (!crews || crews.length === 0)
      return json({ error: 'No crews provided' }, { status: 400 });

    const totalJobs = crews.reduce((sum: number, c: any) => sum + c.stops.length, 0);
    if (totalJobs === 0)
      return json({ error: 'No jobs to optimize' }, { status: 400 });

    // Pull live business context so AI reasons with real data
    const bizContext = ''; // business context injected once job_outcomes table has data
    
    const weatherContext = weatherData
      ? `Weather for ${date}: ${weatherData.condition}, high ${weatherData.tempHigh}°F, low ${weatherData.tempLow}°F, ${weatherData.rainChance}% chance of rain.`
      : `No weather data available for ${date}.`;

    const crewDescriptions = crews.map((crew: any) => {
      const stopList = crew.stops.map((s: any, i: number) =>
        `  ${i + 1}. ${s.customerName} — ${s.address} (${s.serviceType}, ~${s.estimatedMinutes} min)`
      ).join('\n');
      return `Crew: ${crew.crewName}\nAssigned jobs:\n${stopList}`;
    }).join('\n\n');

    const prompt = `You are a route optimizer for Cruz Crewz, a lawn care company serving Chicago and Northwest Indiana.

Date: ${date}
Start time for all crews: ${startTime}
${weatherContext}

${bizContext ? `Business context from past operations:\n${bizContext}\n` : ''}

Here are the crews and their assigned jobs for today:

${crewDescriptions}

Your task:
1. For each crew, reorder their stops to minimize total drive time (group by neighborhood, avoid backtracking).
2. Estimate realistic drive time in minutes between each consecutive stop (Chicago/suburban traffic).
3. Estimate arrival time at each stop based on ${startTime} start, drive times, and job durations.
4. Write a 1-2 sentence plain-English route summary per crew.
5. Note any weather warnings that could affect the schedule.

Respond ONLY with valid JSON — no markdown, no preamble, no explanation:

{
  "crews": [
    {
      "crewId": "<same crewId from input>",
      "crewName": "<same crewName>",
      "color": "<same color>",
      "summary": "<1-2 sentence route summary>",
      "totalDriveMinutes": <number>,
      "totalJobMinutes": <number>,
      "startTime": "${startTime}",
      "stops": [
        {
          "jobId": "<same jobId>",
          "address": "<same address>",
          "customerName": "<same>",
          "serviceType": "<same>",
          "estimatedMinutes": <same>,
          "lat": <same or null>,
          "lng": <same or null>,
          "notes": <same or null>,
          "order": <1-based position>,
          "driveMinutesFromPrev": <0 for first stop, else estimated minutes>,
          "driveDistanceMiles": <0 for first stop, else estimated miles>,
          "arrivalTime": "<estimated HH:MM AM/PM>"
        }
      ]
    }
  ],
  "weatherBriefing": "<1-2 sentence weather summary for outdoor work>",
  "weatherWarnings": ["<specific warnings, or empty array>"]
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        temperature: 0.2, // low temp for consistent JSON
        max_tokens:  4096,
        messages: [
          {
            role: 'system',
            content: 'You are a route optimization assistant. You always respond with valid JSON only — no markdown fences, no explanation, no preamble.'
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[optimize-routes] Groq error:', err);
      return json({ error: 'AI optimization failed' }, { status: 500 });
    }

    const aiData = await response.json();
    const rawText = aiData.choices?.[0]?.message?.content ?? '';

    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    result.date = date;

    return json({ success: true, result });
  } catch (err) {
    console.error('[optimize-routes] error:', err);
    return json({ error: 'Failed to optimize routes' }, { status: 500 });
  }
};