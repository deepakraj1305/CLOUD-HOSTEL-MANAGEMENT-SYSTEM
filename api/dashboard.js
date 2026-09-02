import supabase from './db-client.js';
import { getActor, handleApiError } from '../server/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const actor = await getActor(req, supabase);
    const isStudent = actor.profile.role === 'student';
    const studentId = actor.profile.student_id;

    let studentQuery = supabase.from('students').select('*').order('id');
    let attendanceQuery = supabase.from('attendance').select('*').order('date');
    let complaintsQuery = supabase.from('complaints').select('*').order('created_at', { ascending: false });
    let feesQuery = supabase.from('fees').select('*').order('due_date');
    let visitorsQuery = supabase.from('visitors').select('*').order('visit_date', { ascending: false });
    let leavesQuery = supabase.from('leave_requests').select('*').order('created_at', { ascending: false });

    if (isStudent && studentId) {
      studentQuery = studentQuery.eq('student_id', studentId);
      attendanceQuery = attendanceQuery.eq('student_id', studentId);
      complaintsQuery = complaintsQuery.eq('student_id', studentId);
      feesQuery = feesQuery.eq('student_id', studentId);
      visitorsQuery = visitorsQuery.eq('student_id', studentId);
      leavesQuery = leavesQuery.eq('student_id', studentId);
    }

    const [roomsResult, studentsResult, attendanceResult, complaintsResult, feesResult, visitorsResult, leavesResult, noticesResult, tasksResult] = await Promise.all([
      supabase.from('rooms').select('*').order('block').order('room_no'),
      studentQuery,
      attendanceQuery,
      complaintsQuery,
      feesQuery,
      visitorsQuery,
      leavesQuery,
      supabase.from('notices').select('*').order('pinned', { ascending: false }).order('published_at', { ascending: false }).limit(5),
      supabase.from('staff_tasks').select('*').order('due_date').limit(6),
    ]);

    const failed = [roomsResult, studentsResult, attendanceResult, complaintsResult, feesResult, visitorsResult, leavesResult, noticesResult, tasksResult].find((result) => result.error);
    if (failed?.error) throw failed.error;

    const rooms = roomsResult.data || [];
    const students = studentsResult.data || [];
    const attendance = attendanceResult.data || [];
    const complaints = complaintsResult.data || [];
    const fees = feesResult.data || [];
    const visitors = visitorsResult.data || [];
    const leaves = leavesResult.data || [];
    const totalCapacity = rooms.reduce((sum, room) => sum + Number(room.capacity || 0), 0);
    const totalOccupied = rooms.reduce((sum, room) => sum + Number(room.occupied || 0), 0);
    const paidFees = fees.filter((fee) => fee.status === 'Paid').reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
    const totalFees = fees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
    const latestDate = attendance.map((row) => row.date).sort().at(-1);
    const latestAttendance = attendance.filter((row) => row.date === latestDate);
    const presentToday = latestAttendance.filter((row) => row.status === 'Present' || row.status === 'Late').length;

    const attendanceTrend = Object.values(attendance.reduce((acc, row) => {
      if (!acc[row.date]) acc[row.date] = { date: row.date, present: 0, absent: 0 };
      if (row.status === 'Absent') acc[row.date].absent += 1;
      else acc[row.date].present += 1;
      return acc;
    }, {})).slice(-7);

    const complaintBreakdown = Object.values(complaints.reduce((acc, row) => {
      if (!acc[row.category]) acc[row.category] = { category: row.category, count: 0 };
      acc[row.category].count += 1;
      return acc;
    }, {}));

    const roomDistribution = Object.values(rooms.reduce((acc, room) => {
      if (!acc[room.block]) acc[room.block] = { block: room.block, occupied: 0, capacity: 0 };
      acc[room.block].occupied += Number(room.occupied || 0);
      acc[room.block].capacity += Number(room.capacity || 0);
      return acc;
    }, {}));

    const recentActivity = [
      ...complaints.slice(0, 3).map((item) => ({ id: `c-${item.id}`, title: item.title, detail: `${item.ticket_no} · ${item.status}`, type: 'complaint', time: item.updated_at || item.created_at })),
      ...leaves.slice(0, 2).map((item) => ({ id: `l-${item.id}`, title: `Leave request · ${item.student_name}`, detail: `${item.destination} · ${item.status}`, type: 'leave', time: item.created_at })),
      ...visitors.slice(0, 2).map((item) => ({ id: `v-${item.id}`, title: `Visitor · ${item.visitor_name}`, detail: `${item.student_name} · ${item.status}`, type: 'visitor', time: item.visit_date })),
    ].sort((a, b) => String(b.time).localeCompare(String(a.time))).slice(0, 6);

    return res.status(200).json({
      role: actor.profile.role,
      stats: {
        students: students.filter((student) => student.status === 'Active').length,
        occupied: totalOccupied,
        capacity: totalCapacity,
        occupancyRate: totalCapacity ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
        pendingComplaints: complaints.filter((item) => item.status !== 'Resolved').length,
        feeCollected: paidFees,
        feeTotal: totalFees,
        feeRate: totalFees ? Math.round((paidFees / totalFees) * 100) : 0,
        attendanceRate: latestAttendance.length ? Math.round((presentToday / latestAttendance.length) * 100) : 0,
        pendingLeaves: leaves.filter((item) => item.status === 'Pending').length,
      },
      attendanceTrend,
      complaintBreakdown,
      roomDistribution,
      recentActivity,
      notices: noticesResult.data || [],
      tasks: isStudent ? [] : tasksResult.data || [],
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
