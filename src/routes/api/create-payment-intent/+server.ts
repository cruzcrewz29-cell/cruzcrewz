import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
  return json(
    {
      error: 'Stripe is not configured yet.'
    },
    { status: 501 }
  );
};
