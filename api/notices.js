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
      const { data, error } = await supabase.from('notices').select('*').order('pinned', { ascending: false }).order('published_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }
    assertRole(actor, ['admin', 'warden']);
    if (req.method === 'POST') {
      const { title, content, category, audience = 'All', pinned = false, expires_at } = req.body;
      if (!title || !content || !category) return res.status(400).json({ error: 'Title, content, and category are required' });
      const { data, error } = await supabase.from('notices').insert({ title, content, category, audience, pinned, expires_at, author: actor.profile.full_name }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...changes } = req.body;
      const { data, error } = await supabase.from('notices').update(changes).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { error } = await supabase.from('notices').delete().eq('id', req.body.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { return handleApiError(res, error); }
}
