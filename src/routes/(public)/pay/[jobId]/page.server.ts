// src/routes/(public)/pay/[jobId]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const { jobId } = params;

  if (!jobId) {
    throw error(404, 'Invoice not found.');
  }

  // Just pass the jobId — the page fetches job details client-side via supabase
  return { jobId };
};