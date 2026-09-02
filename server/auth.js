export async function getActor(req, supabase) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    const error = new Error('Invalid or expired session');
    error.status = 401;
    throw error;
  }

  const user = authData.user;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', user.email)
    .maybeSingle();

  return {
    user,
    profile: profile || {
      user_id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
      role: 'student',
      student_id: user.email?.split('@')[0]?.toUpperCase() || '',
    },
  };
}

export function assertRole(actor, roles) {
  if (!roles.includes(actor.profile.role)) {
    const error = new Error('You do not have permission to perform this action');
    error.status = 403;
    throw error;
  }
}

export function handleApiError(res, error) {
  console.error('API error:', error);
  return res.status(error.status || 500).json({ error: error.message || 'Unexpected server error' });
}
