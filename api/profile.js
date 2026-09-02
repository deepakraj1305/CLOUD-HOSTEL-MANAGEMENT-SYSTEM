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
      if (actor.profile.id) return res.status(200).json(actor.profile);
      const { data, error } = await supabase.from('profiles').insert({ user_id: actor.user.id, email: actor.user.email, full_name: actor.profile.full_name, role: 'student', student_id: actor.profile.student_id, preferences: { emailNotifications: true, compactMode: false } }).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'PUT') {
      const allowed = ['full_name', 'phone', 'department', 'year', 'hostel_name', 'room_no', 'avatar_url', 'preferences'];
      const changes = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
      const { data, error } = await supabase.from('profiles').update({ ...changes, user_id: actor.user.id }).eq('email', actor.user.email).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { return handleApiError(res, error); }
}
