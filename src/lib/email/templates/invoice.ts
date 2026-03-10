type InvoiceParams = {
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  serviceType: string;
  scheduledDate: string;
  completedDate: string;
  price: number;
  jobId: string;
};

export function invoiceTemplate(p: InvoiceParams): { html: string; text: string } {
  const date = new Date(p.scheduledDate.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.price);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#111;padding:24px 32px;display:flex;align-items:center;gap:12px;">
      <div style="background:#059669;color:#fff;font-weight:900;font-size:1rem;width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;">CC</div>
      <div>
        <div style="color:#fff;font-weight:700;font-size:1.1rem;">Cruz Crewz</div>
        <div style="color:#9ca3af;font-size:0.75rem;">Professional Lawn Care</div>
      </div>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 4px;font-size:1.25rem;color:#111;">Invoice</h1>
      <p style="margin:0 0 24px;font-size:0.85rem;color:#6b7280;">${p.invoiceNumber}</p>

      <p style="margin:0 0 16px;font-size:0.95rem;color:#374151;">Hi ${p.customerName},</p>
      <p style="margin:0 0 24px;font-size:0.95rem;color:#374151;">Thank you for choosing Cruz Crewz. Here is your invoice for the completed service.</p>

      <div style="background:#f9fafb;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-size:0.85rem;color:#6b7280;">Service</td>
            <td style="padding:6px 0;font-size:0.85rem;color:#111;text-align:right;">${p.serviceType}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:0.85rem;color:#6b7280;">Date</td>
            <td style="padding:6px 0;font-size:0.85rem;color:#111;text-align:right;">${date}</td>
          </tr>
          <tr style="border-top:1px solid #e5e7eb;">
            <td style="padding:12px 0 6px;font-size:1rem;font-weight:700;color:#111;">Total</td>
            <td style="padding:12px 0 6px;font-size:1rem;font-weight:700;color:#059669;text-align:right;">${amount}</td>
          </tr>
        </table>
      </div>

      <p style="margin:0 0 8px;font-size:0.85rem;color:#6b7280;">Questions? Reply to this email or call us anytime.</p>
      <p style="margin:0;font-size:0.85rem;color:#6b7280;">Thank you for your business!</p>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:0.75rem;color:#9ca3af;text-align:center;">Cruz Crewz · Chicago Metro & Northwest Indiana · cruzcrewz.com</p>
    </div>
  </div>
</body>
</html>`;

  const text = `CRUZ CREWZ — INVOICE
${p.invoiceNumber}

Hi ${p.customerName},

Thank you for choosing Cruz Crewz.

Service: ${p.serviceType}
Date: ${date}
Total: ${amount}

Questions? Reply to this email or call us anytime.

Cruz Crewz · cruzcrewz.com`;

  return { html, text };
}
