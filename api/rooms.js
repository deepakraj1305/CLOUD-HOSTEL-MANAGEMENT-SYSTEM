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
      const { data, error } = await supabase.from('rooms').select('*').order('block').order('room_no');
      if (error) throw error;
      return res.status(200).json(data);
    }
    assertRole(actor, ['admin', 'warden']);
    if (req.method === 'POST') {
      const { block, room_no, floor, type, capacity, occupied = 0, status, monthly_fee, amenities = [] } = req.body;
      if (!block || !room_no || !capacity) return res.status(400).json({ error: 'Block, room number, and capacity are required' });
      const { data, error } = await supabase.from('rooms').insert({ block, room_no, floor: Number(floor), type, capacity: Number(capacity), occupied: Number(occupied), status, monthly_fee: Number(monthly_fee), amenities }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...changes } = req.body;
      if (!id) return res.status(400).json({ error: 'Room id is required' });
      ['floor', 'capacity', 'occupied', 'monthly_fee'].forEach((key) => { if (changes[key] !== undefined) changes[key] = Number(changes[key]); });
      const { data, error } = await supabase.from('rooms').update(changes).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { error } = await supabase.from('rooms').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { return handleApiError(res, error); }
}
