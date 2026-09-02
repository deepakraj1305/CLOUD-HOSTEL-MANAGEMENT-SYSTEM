import supabase from './db-client.js';
import { getActor, handleApiError } from '../server/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const actor = await getActor(req, supabase);
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('notifications').select('*').in('recipient_role', ['all', actor.profile.role]).order('created_at', { ascending: false }).limit(12);
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'PUT') {
      const { id, read } = req.body;
      const { data, error } = await supabase.from('notifications').update({ read }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { return handleApiError(res, error); }
}
