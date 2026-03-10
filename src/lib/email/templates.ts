// src/lib/email/templates.ts

export function getQuoteEmail({
  customerName,
  services,
  schedule,
  totalPrice,
  jobId,
}: {
  customerName: string;
  services: string[];
  schedule: string;
  totalPrice: number;
  jobId: string;
}) {
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalPrice);

  const serviceList = services.join(', ');
  const contractUrl = `https://cruzcrewz.com/sign/${jobId}`;

  const subject = `Your Cruz Crewz Quote — ${serviceList}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Cruz Crewz Quote</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#15803d,#16a34a);padding:40px 40px 32px;color:#ffffff;">
      <div style="font-size:24px;font-weight:800;letter-spacing:-0.5px;">Cruz Crewz</div>
      <div style="font-size:13px;color:#bbf7d0;margin-top:4px;">Professional Lawn Care</div>
      <div style="margin-top:20px;font-size:22px;font-weight:700;">Your Quote is Ready</div>
    </div>

    <!-- Body -->
    <div style="padding:40px;">
      <p style="margin:0 0 24px;font-size:15px;color:#374151;">Hi ${customerName},</p>
      <p style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.6;">
        Thank you for requesting a quote from Cruz Crewz. Here are your quote details — review and sign your service agreement below to get started.
      </p>

      <!-- Quote details -->
      <div style="background:#f9fafb;border-radius:12px;overflow:hidden;margin-bottom:32px;">
        <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Service</span>
            <span style="font-size:14px;color:#111827;font-weight:600;">${serviceList}</span>
          </div>
        </div>
        <div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Schedule</span>
            <span style="font-size:14px;color:#111827;">${schedule}</span>
          </div>
        </div>
        <div style="padding:20px;background:#f0fdf4;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:15px;color:#111827;font-weight:700;">Estimated Price</span>
            <span style="font-size:26px;color:#15803d;font-weight:800;">${formattedPrice}</span>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:32px;">
        <a href="${contractUrl}"
          style="display:inline-block;background:#15803d;color:#ffffff;font-size:15px;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;">
          Review &amp; Sign Agreement
        </a>
        <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
          Or copy this link: ${contractUrl}
        </p>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #e5e7eb;padding-top:24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Cruz Crewz LLC · Chicago Metro &amp; Northwest Indiana</p>
        <p style="margin:0;font-size:13px;color:#6b7280;">hello@cruzcrewz.com</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `
Cruz Crewz — Your Quote is Ready

Hi ${customerName},

Thank you for requesting a quote from Cruz Crewz. Here are your details:

Service: ${serviceList}
Schedule: ${schedule}
Estimated Price: ${formattedPrice}

Sign your service agreement here:
${contractUrl}

Cruz Crewz LLC
Chicago Metro & Northwest Indiana
hello@cruzcrewz.com
`.trim();

  return { subject, html, text };
}