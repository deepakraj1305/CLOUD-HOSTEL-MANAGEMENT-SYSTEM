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
      let query = supabase.from('leave_requests').select('*').order('created_at', { ascending: false });
      if (actor.profile.role === 'student') query = query.eq('student_id', actor.profile.student_id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const { reason, destination, from_date, to_date, emergency_contact } = req.body;
      if (!reason || !destination || !from_date || !to_date) return res.status(400).json({ error: 'Reason, destination, and dates are required' });
      const record = { student_id: req.body.student_id || actor.profile.student_id, student_name: req.body.student_name || actor.profile.full_name, reason, destination, from_date, to_date, emergency_contact, status: 'Pending' };
      const { data, error } = await supabase.from('leave_requests').insert(record).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      assertRole(actor, ['admin', 'warden']);
      const { id, ...changes } = req.body;
      changes.approved_by = actor.profile.full_name;
      const { data, error } = await supabase.from('leave_requests').update(changes).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { data: leave } = await supabase.from('leave_requests').select('student_id,status').eq('id', req.body.id).single();
      if (actor.profile.role === 'student' && (leave?.student_id !== actor.profile.student_id || leave?.status !== 'Pending')) return res.status(403).json({ error: 'Only your pending requests can be withdrawn' });
      const { error } = await supabase.from('leave_requests').delete().eq('id', req.body.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { return handleApiError(res, error); }
}
