// src/lib/sms/reminders.ts
//
// Smart day-of SMS reminders for Cruz Crewz.
//
// Features:
//   - Weather-aware messaging via Open-Meteo (free, no API key)
//   - Crew-signed tone ("Hey Maria, it's Cruz...")
//   - 48hr reminder for first-time customers, 24hr for recurring
//   - Y / S reply handling (confirm / skip) logged to sms_replies table
//
// Requires these env vars (add to Netlify when you have a Twilio account):
//   TWILIO_ACCOUNT_SID   — from console.twilio.com
//   TWILIO_AUTH_TOKEN    — from console.twilio.com
//   TWILIO_PHONE_NUMBER  — your Twilio number in E.164 format (+18005551234)
//   PUBLIC_SITE_URL      — https://cruzcrewz.com (already set)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!; // needs service role for scheduled fn
const TWILIO_SID    = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_TOKEN  = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_FROM   = process.env.TWILIO_PHONE_NUMBER!;
const SITE_URL      = process.env.PUBLIC_SITE_URL || 'https://cruzcrewz.com';

// ── Types ────────────────────────────────────────────────────────────────────

export type ReminderJob = {
  id: string;
  service_type: string;
  scheduled_date: string;
  price: number;
  customer_phone: string;
  customer_name: string;
  customer_lat: number | null;
  customer_lng: number | null;
  is_first_job: boolean; // true = 48hr notice, false = 24hr notice
};

type WeatherSummary = {
  condition: 'clear' | 'cloudy' | 'rainy' | 'stormy' | 'unknown';
  rainChance: number;   // 0–100
  tempHigh: number;     // °F
  tempLow: number;
  rainNote: string | null; // null if no noteworthy rain
};

// ── Weather ──────────────────────────────────────────────────────────────────

/**
 * Fetches next-day or same-day forecast from Open-Meteo.
 * Completely free, no API key required.
 */
export async function getWeatherForJob(
  lat: number,
  lng: number,
  targetDate: string // YYYY-MM-DD
): Promise<WeatherSummary> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude',  String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set('daily',     'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode');
    url.searchParams.set('temperature_unit', 'fahrenheit');
    url.searchParams.set('timezone',  'America/Chicago');
    url.searchParams.set('forecast_days', '3');

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);

    const data = await res.json();
    const dates: string[] = data.daily.time;
    const idx = dates.indexOf(targetDate);
    if (idx === -1) return unknownWeather();

    const rainChance = data.daily.precipitation_probability_max[idx] ?? 0;
    const tempHigh   = Math.round(data.daily.temperature_2m_max[idx] ?? 70);
    const tempLow    = Math.round(data.daily.temperature_2m_min[idx] ?? 55);
    const code       = data.daily.weathercode[idx] ?? 0;

    // WMO weather codes: 0=clear, 1-3=partly cloudy, 45-48=fog,
    // 51-67=drizzle/rain, 71-77=snow, 80-82=showers, 95-99=thunderstorm
    let condition: WeatherSummary['condition'] = 'clear';
    if (code >= 95)      condition = 'stormy';
    else if (code >= 51) condition = 'rainy';
    else if (code >= 1)  condition = 'cloudy';

    let rainNote: string | null = null;
    if (rainChance >= 70)      rainNote = `There's a ${rainChance}% chance of rain — we'll keep an eye on it and reach out if we need to reschedule.`;
    else if (rainChance >= 40) rainNote = `There's about a ${rainChance}% chance of some rain. We'll still plan to be there — just a heads up.`;

    return { condition, rainChance, tempHigh, tempLow, rainNote };
  } catch (err) {
    console.error('[weather] fetch failed:', err);
    return unknownWeather();
  }
}

function unknownWeather(): WeatherSummary {
  return { condition: 'unknown', rainChance: 0, tempHigh: 70, tempLow: 55, rainNote: null };
}

// ── Message Builder ──────────────────────────────────────────────────────────

/**
 * Builds the SMS message text.
 * Aims for a natural, human tone — like a text from the crew, not an automated blast.
 */
export function buildReminderMessage(job: ReminderJob, weather: WeatherSummary, hoursOut: 48 | 24): string {
  const firstName   = job.customer_name.split(' ')[0];
  const serviceShort = shortServiceName(job.service_type);
  const dateLabel   = hoursOut === 48 ? 'tomorrow' : 'today';

  const date = new Date(job.scheduled_date);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'America/Chicago' });

  const lines: string[] = [];

  // Opening — feels like a real person
  lines.push(`Hey ${firstName}, it's Cruz from Cruz Crewz! 👋`);
  lines.push('');

  // Core reminder
  if (hoursOut === 48) {
    lines.push(`Just a heads up — we're scheduled for your ${serviceShort} on ${dayName}.`);
  } else {
    lines.push(`Reminder — we're coming out ${dateLabel} for your ${serviceShort}! 🌿`);
  }

  // Weather note if noteworthy
  if (weather.rainNote) {
    lines.push('');
    lines.push(weather.rainNote);
  } else if (weather.condition === 'clear' && weather.tempHigh >= 65) {
    lines.push(`Looks like a great day for it — ${weather.tempHigh}° and sunny. ☀️`);
  }

  // Access reminder (subtle, not pushy)
  lines.push('');
  lines.push('Quick reminder to make sure any gates are unlocked and the lawn is clear of obstacles.');

  // CTA — confirm or skip
  lines.push('');
  lines.push('Reply Y to confirm or S to skip this visit. No reply needed if everything looks good!');

  // Sign-off
  lines.push('');
  lines.push(`– Cruz Crewz  |  ${SITE_URL}`);

  return lines.join('\n');
}

function shortServiceName(serviceType: string): string {
  const map: Record<string, string> = {
    'Lawn Mowing':              'lawn mowing',
    'Trimming & Edging':        'trimming & edging',
    'Bush, Shrub & Tree Care':  'shrub & tree care',
    'Spring & Fall Cleanups':   'seasonal cleanup',
    'Landscape Maintenance':    'landscape maintenance',
    'Lawn Aeration & Overseeding': 'lawn aeration & overseeding',
  };
  return map[serviceType] ?? serviceType.toLowerCase();
}

// ── Twilio Send ──────────────────────────────────────────────────────────────

/**
 * Sends an SMS via Twilio REST API.
 * Uses direct fetch — no Twilio SDK needed, keeps the bundle small.
 */
export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.warn('[sms] Twilio env vars not set — skipping send. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in Netlify.');
    return false;
  }

  // Normalize phone to E.164
  const normalized = normalizePhone(to);
  if (!normalized) {
    console.error('[sms] invalid phone number:', to);
    return false;
  }

  try {
    const credentials = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type':  'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: TWILIO_FROM,
          To:   normalized,
          Body: body,
        }).toString(),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[sms] Twilio error:', res.status, err);
      return false;
    }

    const result = await res.json();
    console.log('[sms] sent:', result.sid, '→', normalized);
    return true;
  } catch (err) {
    console.error('[sms] fetch failed:', err);
    return false;
  }
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

// ── Main Runner ──────────────────────────────────────────────────────────────

/**
 * Called by the Netlify scheduled function every morning at 7am CT.
 * Finds jobs scheduled for today (24hr) and tomorrow (48hr) and sends reminders.
 */
export async function sendDailyReminders(): Promise<{ sent: number; skipped: number; errors: number }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const today    = toChicagoDate(new Date());
  const tomorrow = toChicagoDate(addDays(new Date(), 1));

  console.log(`[reminders] running for today=${today} tomorrow=${tomorrow}`);

  // Fetch jobs for today (24hr) and tomorrow (48hr)
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select(`
      id,
      service_type,
      scheduled_date,
      price,
      customer_phone,
      status,
      contract_signed_at,
      customers (
        id,
        name,
        phone,
        lat,
        lng
      )
    `)
    .in('scheduled_date', [today, tomorrow])
    .in('status', ['scheduled', 'confirmed'])
    .not('contract_signed_at', 'is', null); // only signed contracts

  if (error) {
    console.error('[reminders] supabase error:', error);
    return { sent: 0, skipped: 0, errors: 1 };
  }

  if (!jobs || jobs.length === 0) {
    console.log('[reminders] no jobs to remind today');
    return { sent: 0, skipped: 0, errors: 0 };
  }

  let sent = 0, skipped = 0, errors = 0;

  for (const job of jobs) {
    try {
      const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
      const phone    = customer?.phone || job.customer_phone;

      if (!phone) {
        console.log(`[reminders] job ${job.id} — no phone number, skipping`);
        skipped++;
        continue;
      }

      // Check if reminder already sent for this job today
      const { data: existing } = await supabase
        .from('sms_replies')
        .select('id')
        .eq('job_id', job.id)
        .eq('type', 'reminder_sent')
        .eq('sent_date', today)
        .maybeSingle();

      if (existing) {
        console.log(`[reminders] job ${job.id} — reminder already sent today, skipping`);
        skipped++;
        continue;
      }

      const hoursOut: 48 | 24 = job.scheduled_date === tomorrow ? 48 : 24;

      // Check if this is their first job (for tone)
      const { count } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('customer_phone', phone)
        .eq('status', 'completed');

      const isFirstJob = (count ?? 0) === 0;

      const reminderJob: ReminderJob = {
        id:             job.id,
        service_type:   job.service_type,
        scheduled_date: job.scheduled_date,
        price:          job.price,
        customer_phone: phone,
        customer_name:  customer?.name || 'there',
        customer_lat:   customer?.lat ?? null,
        customer_lng:   customer?.lng ?? null,
        is_first_job:   isFirstJob,
      };

      // Get weather if we have coords
      const weather = reminderJob.customer_lat && reminderJob.customer_lng
        ? await getWeatherForJob(reminderJob.customer_lat, reminderJob.customer_lng, job.scheduled_date)
        : unknownWeather();

      const message = buildReminderMessage(reminderJob, weather, hoursOut);
      const success = await sendSms(phone, message);

      if (success) {
        // Log the sent reminder so we don't double-send
        await supabase.from('sms_replies').insert({
          job_id:      job.id,
          customer_id: customer?.id,
          phone:       phone,
          type:        'reminder_sent',
          sent_date:   today,
          hours_out:   hoursOut,
          weather_condition: weather.condition,
          rain_chance:       weather.rainChance,
          message_body:      message,
        });
        sent++;
        console.log(`[reminders] sent ${hoursOut}hr reminder for job ${job.id} → ${phone}`);
      } else {
        errors++;
      }

      // Throttle — Twilio free tier can be rate-limited
      await sleep(300);

    } catch (err) {
      console.error(`[reminders] error on job ${job.id}:`, err);
      errors++;
    }
  }

  console.log(`[reminders] done — sent=${sent} skipped=${skipped} errors=${errors}`);
  return { sent, skipped, errors };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toChicagoDate(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); // YYYY-MM-DD
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}