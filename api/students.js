import supabase from './db-client.js';
import { getActor, assertRole, handleApiError } from '../server/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const actor = await getActor(req, supabase);
    assertRole(actor, ['admin', 'warden']);
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('students').select('*').order('name');
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const body = req.body;
      if (!body.student_id || !body.name || !body.email) return res.status(400).json({ error: 'Student ID, name, and email are required' });
      const { data, error } = await supabase.from('students').insert(body).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...changes } = req.body;
      const { data, error } = await supabase.from('students').update(changes).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      assertRole(actor, ['admin']);
      const { error } = await supabase.from('students').delete().eq('id', req.body.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { return handleApiError(res, error); }
}
