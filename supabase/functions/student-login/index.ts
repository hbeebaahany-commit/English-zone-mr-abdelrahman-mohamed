import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { code } = await request.json()
  if (!code) return new Response(JSON.stringify({ error: 'Enter your student access code.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const { data: accessCode, error } = await adminClient.from('access_codes').select('student_id, status, expires_at').eq('code', String(code).trim()).eq('status', 'available').maybeSingle()
  if (error || !accessCode?.student_id || (accessCode.expires_at && new Date(accessCode.expires_at) < new Date())) return new Response(JSON.stringify({ error: 'Invalid or expired student access code.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  const { data: student, error: studentError } = await adminClient.from('profiles').select('email,status,role').eq('id', accessCode.student_id).single()
  if (studentError || student.role !== 'student' || student.status !== 'active') return new Response(JSON.stringify({ error: 'This student account is not active.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  return new Response(JSON.stringify({ email: student.email }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})