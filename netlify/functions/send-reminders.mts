// netlify/functions/send-reminders.mts

import type { Config } from '@netlify/functions';
import { sendDailyReminders } from '../../src/lib/sms/reminder.js';

export default async function handler() {
  console.log('[send-reminders] scheduled function triggered at', new Date().toISOString());

  try {
    const result = await sendDailyReminders();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (err) {
    console.error('[send-reminders] unhandled error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: String(err) }),
    };
  }
}

export const config: Config = {
  schedule: '0 12 * * *', // 7:00 AM CT daily
};