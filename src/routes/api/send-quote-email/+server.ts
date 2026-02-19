import { json } from '@sveltejs/kit';
import { sendEmail } from '$lib/email/service';
import { getQuoteEmail } from '$lib/email/templates';

export async function POST({ request }) {
	try {
		const body = await request.json();
		const { customerEmail, customerName, services, schedule, totalPrice, jobId } = body;

		if (!customerEmail || !customerName) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const emailContent = getQuoteEmail({
			customerName,
			services,
			schedule,
			totalPrice,
			jobId
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
			console.error('Email send failed:', result.error);
			return json({ error: 'Failed to send email' }, { status: 500 });
		}
	} catch (error) {
		console.error('API error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}