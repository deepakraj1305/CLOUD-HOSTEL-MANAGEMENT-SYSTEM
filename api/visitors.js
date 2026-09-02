import supabase from './db-client.js';
import { getActor, assertRole, handleApiError } from '../server/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const actor = await getActor(req, supabase);
    if (req.method === 'GET') {
      let query = supabase.from('visitors').select('*').order('visit_date', { ascending: false });
      if (actor.profile.role === 'student') query = query.eq('student_id', actor.profile.student_id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const body = req.body;
      if (!body.visitor_name || !body.phone || !body.visit_date) return res.status(400).json({ error: 'Visitor name, phone, and date are required' });
      const record = { ...body, student_id: body.student_id || actor.profile.student_id, student_name: body.student_name || actor.profile.full_name, status: body.status || 'Expected' };
      const { data, error } = await supabase.from('visitors').insert(record).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      assertRole(actor, ['admin', 'warden']);
      const { id, ...changes } = req.body;
      const { data, error } = await supabase.from('visitors').update(changes).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      assertRole(actor, ['admin', 'warden']);
      const { error } = await supabase.from('visitors').delete().eq('id', req.body.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { return handleApiError(res, error); }
}
