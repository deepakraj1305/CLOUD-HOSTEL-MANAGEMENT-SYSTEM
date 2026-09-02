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
      let query = supabase.from('complaints').select('*').order('created_at', { ascending: false });
      if (actor.profile.role === 'student') query = query.eq('student_id', actor.profile.student_id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const { category, title, description, priority = 'Medium' } = req.body;
      if (!category || !title || !description) return res.status(400).json({ error: 'Category, title, and description are required' });
      const ticket_no = `CMP-${Date.now().toString().slice(-6)}`;
      const record = { ticket_no, student_id: req.body.student_id || actor.profile.student_id || 'STAFF', student_name: req.body.student_name || actor.profile.full_name, category, title, description, priority, status: 'Open', assigned_to: 'Hostel Operations', updated_at: new Date().toISOString() };
      const { data, error } = await supabase.from('complaints').insert(record).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      assertRole(actor, ['admin', 'warden']);
      const { id, ...changes } = req.body;
      changes.updated_at = new Date().toISOString();
      const { data, error } = await supabase.from('complaints').update(changes).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      if (actor.profile.role === 'student') {
        const { data: complaint } = await supabase.from('complaints').select('student_id').eq('id', req.body.id).single();
        if (complaint?.student_id !== actor.profile.student_id) return res.status(403).json({ error: 'Not allowed' });
      }
      const { error } = await supabase.from('complaints').delete().eq('id', req.body.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { return handleApiError(res, error); }
}
