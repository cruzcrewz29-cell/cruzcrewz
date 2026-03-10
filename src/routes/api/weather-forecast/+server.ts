// src/routes/api/weather-forecast/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const lat = url.searchParams.get('lat') ?? '41.8827';
    const lng = url.searchParams.get('lng') ?? '-87.6233';

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&daily=precipitation_probability_max,temperature_2m_min,temperature_2m_max,weathercode` +
      `&temperature_unit=fahrenheit&timezone=America%2FChicago&forecast_days=7`
    );

    if (!res.ok) throw new Error('Open-Meteo fetch failed');
    const data = await res.json();

    const days = data.daily.time.map((date: string, i: number) => ({
      date,
      precipProbability: data.daily.precipitation_probability_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      tempMax: data.daily.temperature_2m_max[i],
      weatherCode: data.daily.weathercode[i],
    }));

    return json({ days });
  } catch (err) {
    console.error('[weather-forecast]', err);
    return json({ error: 'Failed to fetch weather' }, { status: 500 });
  }
};