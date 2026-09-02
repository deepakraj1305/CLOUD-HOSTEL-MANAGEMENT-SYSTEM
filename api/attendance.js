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
      let query = supabase.from('attendance').select('*').order('date', { ascending: false }).order('name');
      if (actor.profile.role === 'student') query = query.eq('student_id', actor.profile.student_id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }
    assertRole(actor, ['admin', 'warden']);
    if (req.method === 'POST') {
      const { student_id, name, date, status, check_in } = req.body;
      if (!student_id || !name || !date || !status) return res.status(400).json({ error: 'Student, date, and status are required' });
      const { data, error } = await supabase.from('attendance').insert({ student_id, name, date, status, check_in, marked_by: actor.profile.full_name }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...changes } = req.body;
      changes.marked_by = actor.profile.full_name;
      const { data, error } = await supabase.from('attendance').update(changes).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { error } = await supabase.from('attendance').delete().eq('id', req.body.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { return handleApiError(res, error); }
}
