import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

const supabase = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET({ url }) {
  const token = url.searchParams.get('token');
  const jobId = url.searchParams.get('jobId');

  if (!token) return json({ error: 'No token' }, { status: 401 });

  // Validate session
  const { data: session } = await supabase
    .from('customer_sessions')
    .select('customer_id, expires_at')
    .eq('token', token)
    .single();

  if (!session) return json({ error: 'Invalid token' }, { status: 401 });
  if (new Date(session.expires_at) < new Date()) return json({ error: 'Token expired' }, { status: 401 });

  const customerId = session.customer_id;

  // Single job request
  if (jobId) {
    const { data: job } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('customer_id', customerId)
      .single();

    if (!job) return json({ error: 'Not found' }, { status: 404 });
    return json({ job });
  }

  // Full dashboard request
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, email, address, phone, contract_signed')
    .eq('id', customerId)
    .single();

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, service_type, status, scheduled_date, price, invoice_number, invoice_sent, reschedule_requested, description, photos')
    .eq('customer_id', customerId)
    .order('scheduled_date', { ascending: false });

  return json({ customer, jobs: jobs ?? [] });
}
