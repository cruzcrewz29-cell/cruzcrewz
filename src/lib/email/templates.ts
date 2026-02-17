export function getContractConfirmationEmail(data: {
	customerName: string;
	services: string[];
	schedule: string;
	totalPrice: number;
	signedAt: string;
}) {
	return {
		subject: 'Service Agreement Confirmation - Cruz Crewz',
		html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Agreement Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Cruz Crewz</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Professional Lawn Care Services</p>
  </div>

  <!-- Content -->
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    
    <h2 style="color: #16a34a; margin-top: 0;">Thank You, ${data.customerName}!</h2>
    
    <p>Your service agreement has been successfully signed and confirmed. We're excited to help keep your lawn looking its best!</p>

    <div style="background: #f9fafb; border-left: 4px solid #16a34a; padding: 20px; margin: 25px 0; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #374151;">Agreement Details</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Services:</td>
          <td style="padding: 8px 0; color: #111827;">${data.services.join(', ')}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Schedule:</td>
          <td style="padding: 8px 0; color: #111827;">${data.schedule}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Total Price:</td>
          <td style="padding: 8px 0; color: #16a34a; font-weight: 700; font-size: 18px;">$${data.totalPrice.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Signed On:</td>
          <td style="padding: 8px 0; color: #111827;">${new Date(data.signedAt).toLocaleDateString('en-US', { 
						weekday: 'long', 
						year: 'numeric', 
						month: 'long', 
						day: 'numeric',
						hour: '2-digit',
						minute: '2-digit'
					})}</td>
        </tr>
      </table>
    </div>

    <h3 style="color: #374151;">What Happens Next?</h3>
    <ol style="padding-left: 20px; color: #4b5563;">
      <li style="margin-bottom: 10px;">Our team will contact you within 24 hours to confirm your first appointment</li>
      <li style="margin-bottom: 10px;">We'll send you a reminder before each scheduled service</li>
      <li style="margin-bottom: 10px;">After each visit, you'll receive a service completion notification</li>
    </ol>

    <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; margin: 25px 0; border-radius: 8px;">
      <p style="margin: 0; color: #92400e;">
        <strong>📱 Questions?</strong><br>
        Call us at <a href="tel:555-123-4567" style="color: #16a34a; text-decoration: none;">(555) 123-4567</a> or reply to this email.
      </p>
    </div>

    <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      A copy of your signed agreement has been saved to your account. You can view it anytime by logging into your customer portal.
    </p>

  </div>

  <!-- Footer -->
  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p style="margin: 5px 0;">Cruz Crewz Lawn Care</p>
    <p style="margin: 5px 0;">Professional Lawn Care Services</p>
    <p style="margin: 5px 0;">
      <a href="https://cruzcrewz.com" style="color: #16a34a; text-decoration: none;">cruzcrewz.com</a> | 
      <a href="tel:555-123-4567" style="color: #16a34a; text-decoration: none;">(555) 123-4567</a>
    </p>
  </div>

</body>
</html>
		`,
		text: `
Cruz Crewz - Service Agreement Confirmation

Thank You, ${data.customerName}!

Your service agreement has been successfully signed and confirmed. We're excited to help keep your lawn looking its best!

Agreement Details:
- Services: ${data.services.join(', ')}
- Schedule: ${data.schedule}
- Total Price: $${data.totalPrice.toFixed(2)}
- Signed On: ${new Date(data.signedAt).toLocaleString()}

What Happens Next?
1. Our team will contact you within 24 hours to confirm your first appointment
2. We'll send you a reminder before each scheduled service
3. After each visit, you'll receive a service completion notification

Questions? Call us at (555) 123-4567 or reply to this email.

---
Cruz Crewz Lawn Care
https://cruzcrewz.com | (555) 123-4567
		`
	};
}