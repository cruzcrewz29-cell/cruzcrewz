// src/routes/api/generate-digest/+server.ts
import { json } from '@sveltejs/kit';
import { GROQ_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { weekJobs, allJobs, pendingQuotes, customers } = await request.json();

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    // Aggregate week stats
    const completed = weekJobs.filter((j: any) => j.status === 'completed');
    const weekRevenue = completed.reduce((s: number, j: any) => s + (j.price ?? 0), 0);
    const outstanding = allJobs.filter((j: any) => !['completed', 'cancelled'].includes(j.status));
    const outstandingTotal = outstanding.reduce((s: number, j: any) => s + (j.price ?? 0), 0);

    // Service breakdown this week
    const serviceCount: Record<string, number> = {};
    for (const j of weekJobs) {
      serviceCount[j.service_type] = (serviceCount[j.service_type] ?? 0) + 1;
    }
    const topService = Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0];

    // Neighborhood clusters from all jobs
    const neighborhoodCount: Record<string, number> = {};
    for (const j of allJobs) {
      if (j.customers?.address) {
        // Extract city/suburb from address
        const parts = j.customers.address.split(',');
        const city = parts[parts.length - 2]?.trim();
        if (city) neighborhoodCount[city] = (neighborhoodCount[city] ?? 0) + 1;
      }
    }
    const topNeighborhoods = Object.entries(neighborhoodCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([n, c]) => `${n} (${c} jobs)`);

    // Sparse neighborhoods — areas with only 1 job (expansion opportunities)
    const sparseNeighborhoods = Object.entries(neighborhoodCount)
      .filter(([, c]) => c === 1)
      .map(([n]) => n)
      .slice(0, 5);

    // Customers with no recent jobs (churn risk)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCustomerIds = new Set(
      allJobs
        .filter((j: any) => new Date(j.scheduled_date) > thirtyDaysAgo)
        .map((j: any) => j.customer_id)
    );
    const inactiveCount = customers.filter((c: any) => !recentCustomerIds.has(c.id)).length;

    const season = (() => {
      const m = new Date().getMonth();
      if (m >= 2 && m <= 4) return 'spring';
      if (m >= 5 && m <= 7) return 'summer';
      if (m >= 8 && m <= 10) return 'fall';
      return 'winter';
    })();

    const prompt = `You are a sharp business advisor for Cruz Crewz, a lawn care company in the Chicago metro and northwest Indiana.

Generate a weekly business digest for the week of ${weekLabel}.

WEEK IN NUMBERS:
- Jobs this week: ${weekJobs.length} total, ${completed.length} completed
- Revenue collected this week: $${weekRevenue}
- Outstanding (all open jobs): $${outstandingTotal} across ${outstanding.length} jobs
- Pending quotes waiting for response: ${pendingQuotes}
- Top service this week: ${topService ? `${topService[0]} (${topService[1]} jobs)` : 'none'}

BUSINESS CONTEXT:
- Total active customers: ${customers.length}
- Customers with no jobs in 30 days: ${inactiveCount}
- Current season: ${season}
- Strongest neighborhoods by job density: ${topNeighborhoods.join(', ') || 'not enough data'}
- Neighborhoods with only 1 customer (expansion opportunity): ${sparseNeighborhoods.join(', ') || 'none identified'}

Write a digest with these exact sections. Be direct, specific, and genuinely useful — like a sharp business partner, not a generic AI. Use real numbers. No fluff.

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "headline": "one punchy sentence summarizing the week",
  "weekSummary": "2-3 sentences on how the week went — revenue, jobs, anything notable",
  "wins": ["specific win 1", "specific win 2"],
  "watchouts": ["specific thing to watch 1", "specific thing to watch 2"],
  "proactiveInsights": [
    {
      "title": "short insight title",
      "body": "2-3 sentence actionable insight — be specific about neighborhoods, services, customer segments, or seasonal timing",
      "priority": "high|medium|low"
    }
  ],
  "targetingRecommendations": [
    {
      "area": "neighborhood or area name",
      "reason": "why to target this area specifically",
      "action": "concrete suggested action"
    }
  ],
  "weekScore": <number 1-10 rating of the week>,
  "weekScoreReason": "one sentence explaining the score"
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        temperature: 0.4,
        max_tokens:  2048,
        messages: [
          {
            role:    'system',
            content: 'You are a business intelligence assistant. Always respond with valid JSON only — no markdown, no preamble.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[generate-digest] Groq error:', err);
      return json({ error: 'AI generation failed' }, { status: 500 });
    }

    const aiData = await response.json();
    const rawText = aiData.choices?.[0]?.message?.content ?? '';
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return json({ success: true, digest: parsed });
  } catch (err) {
    console.error('[generate-digest] error:', err);
    return json({ error: 'Failed to generate digest' }, { status: 500 });
  }
};