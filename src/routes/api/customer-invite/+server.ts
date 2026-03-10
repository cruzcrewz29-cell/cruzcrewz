// src/routes/api/customer-invite/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, SENDGRID_API_KEY, FROM_EMAIL } from '$env/static/private';
import { PUBLIC_SUPABASE_URL, PUBLIC_SITE_URL } from '$env/static/public';
import crypto from 'crypto';

const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { customerId } = await request.json();
    if (!customerId) return json({ error: 'customerId required' }, { status: 400 });

    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('id', customerId)
      .single();

    if (!customer) return json({ error: 'Customer not found' }, { status: 404 });
    if (!customer.email) return json({ error: 'Customer has no email address' }, { status: 400 });

    // Generate session token — 7 day expiry for invite links
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('customer_sessions').insert({
      customer_id: customer.id,
      token,
      expires_at: expiresAt,
    });

    const firstName = customer.name.split(' ')[0];
    const portalUrl = `${PUBLIC_SITE_URL}/my/dashboard?token=${token}`;

    const emailBody = {
      personalizations: [{ to: [{ email: customer.email }] }],
      from: { email: FROM_EMAIL, name: 'Cruz Crewz' },
      subject: 'Your Cruz Crewz Customer Portal Invitation',
      content: [{
        type: 'text/html',
        value: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;padding:0 16px;">
    <div style="background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
      <div style="background:#059669;padding:32px;text-align:center;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;margin-bottom:12px;">
          <span style="color:#fff;font-size:16px;font-weight:800;">CC</span>
        </div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Cruz Crewz</h1>
        <p style="margin:6px 0 0;color:#a7f3d0;font-size:13px;">Customer Portal</p>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#111827;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;">
          You're invited to access your Cruz Crewz customer portal. Here you can view your service history, upcoming jobs, invoices, and sign your service agreement — all in one place.
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
          Click below to get started. This link is valid for 7 days.
        </p>
        <a href="${portalUrl}" style="display:block;background:#059669;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:12px;font-size:15px;font-weight:700;">
          Access My Account
        </a>
        <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
          Questions? Reply to this email or call us directly.
        </p>
        <div style="margin-top:24px;padding-top:20px;border-top:1px solid #f3f4f6;text-align:center;">
          <p style="margin:0;font-size:11px;color:#d1d5db;">Cruz Crewz LLC · Chicago Metro &amp; NW Indiana</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
        `.trim(),
      }],
    };

    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailBody),
    });

    if (!sgRes.ok) {
      console.error('[customer-invite] SendGrid error:', await sgRes.text());
      return json({ error: 'Failed to send invite email' }, { status: 500 });
    }

    return json({ success: true });
  } catch (err) {
    console.error('[customer-invite]', err);
    return json({ error: 'Server error' }, { status: 500 });
  }
};