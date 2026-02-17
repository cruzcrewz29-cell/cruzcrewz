import { json } from '@sveltejs/kit';
import { sendEmail } from '$lib/email/service';
import { getContractConfirmationEmail } from '$lib/email/templates';

export async function POST({ request }) {
	try {
		const body = await request.json();
		const { customerEmail, customerName, services, schedule, totalPrice, signedAt } = body;

		if (!customerEmail || !customerName) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const emailContent = getContractConfirmationEmail({
			customerName,
			services,
			schedule,
			totalPrice,
			signedAt
		});

		const result = await sendEmail({
			to: customerEmail,
			subject: emailContent.subject,
			html: emailContent.html,
			text: emailContent.text
		});

		if (result.success) {
			return json({ success: true });
		} else {
			return json({ error: 'Failed to send email' }, { status: 500 });
		}
	} catch (error) {
		console.error('API error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}