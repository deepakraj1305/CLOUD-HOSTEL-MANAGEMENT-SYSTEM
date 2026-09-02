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
      let query = supabase.from('fees').select('*').order('due_date', { ascending: false });
      if (actor.profile.role === 'student') query = query.eq('student_id', actor.profile.student_id);
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }
    assertRole(actor, ['admin', 'warden']);
    if (req.method === 'POST') {
      const body = req.body;
      if (!body.student_id || !body.student_name || !body.amount || !body.due_date) return res.status(400).json({ error: 'Student, amount, and due date are required' });
      const { data, error } = await supabase.from('fees').insert({ ...body, amount: Number(body.amount), receipt_no: body.receipt_no || `RCT-${Date.now().toString().slice(-6)}` }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...changes } = req.body;
      if (changes.amount) changes.amount = Number(changes.amount);
      const { data, error } = await supabase.from('fees').update(changes).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      assertRole(actor, ['admin']);
      const { error } = await supabase.from('fees').delete().eq('id', req.body.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { return handleApiError(res, error); }
}
