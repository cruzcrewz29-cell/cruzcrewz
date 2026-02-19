import { Resend } from 'resend';
import { RESEND_API_KEY } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

export async function sendEmail({
	to,
	subject,
	html,
	text
}: {
	to: string;
	subject: string;
	html: string;
	text: string;
}) {
	try {
		const { data, error } = await resend.emails.send({
			from: 'onboarding@resend.dev',
			to,
			subject,
			html,
			text
		});

		if (error) {
			console.error('Resend error:', error);
			return { success: false, error };
		}

		return { success: true, data };
	} catch (error) {
		console.error('Email send error:', error);
		return { success: false, error };
	}
}