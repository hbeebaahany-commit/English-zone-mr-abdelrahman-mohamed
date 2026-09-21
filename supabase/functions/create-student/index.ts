import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (body: Record<string, unknown>, status: number) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error)
const operationError = (operation: string, error: unknown) => {
  const message = getErrorMessage(error)
  console.error(`[create-student] ${operation} failed`, { message })
  return new Error(`${operation} failed: ${message}`)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let adminClient: ReturnType<typeof createClient> | null = null
  let createdUserId: string | null = null

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) {
      console.warn('[create-student] rejected request without authorization')
      return jsonResponse({ error: 'Authentication required.' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error('Supabase server configuration is incomplete.')

    let caller: { id: string } | null = null
    try {
      const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
      const { data, error } = await callerClient.auth.getUser()
      if (error || !data.user) return jsonResponse({ error: `Authentication lookup failed: ${error?.message || 'Invalid teacher session.'}` }, 401)
      caller = data.user
    } catch (error) {
      throw operationError('Authentication lookup', error)
    }

    try {
      adminClient = createClient(supabaseUrl, serviceRoleKey)
      const { data: teacher, error } = await adminClient.from('profiles').select('role').eq('id', caller.id).single()
      if (error) throw error
      if (teacher?.role !== 'teacher') return jsonResponse({ error: 'Teacher authorization failed: caller is not a teacher.' }, 403)
    } catch (error) {
      throw operationError('Teacher authorization', error)
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch (error) {
      throw operationError('Request parsing', error)
    }
    const { email, full_name, stage, system, phone, parent_phone } = body
    const normalizedEmail = String(email ?? '').trim()
    const normalizedName = String(full_name ?? '').trim()
    if (!normalizedEmail || !normalizedName) return jsonResponse({ error: 'Name and email are required.' }, 400)

    const generatedCode = `STU-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
    const securePassword = `${generatedCode}@Secure123`
    try {
      const { data: authUser, error } = await adminClient.auth.admin.createUser({
        email: normalizedEmail,
        password: securePassword,
        email_confirm: true,
        user_metadata: { role: 'student', full_name: normalizedName },
      })
      if (error || !authUser.user) throw error ?? new Error('Auth returned no user.')
      createdUserId = authUser.user.id
      console.info('[create-student] Auth user created', { userId: createdUserId, email: normalizedEmail })
    } catch (error) {
      throw operationError('Auth user creation', error)
    }

    let profileData: Record<string, unknown>
    try {
      const { data, error } = await adminClient.from('profiles').insert({
        id: createdUserId,
        email: normalizedEmail,
        full_name: normalizedName,
        role: 'student',
        stage: stage || null,
        system: system || null,
        phone: phone || null,
        parent_phone: parent_phone || null,
        student_code: generatedCode,
        status: 'active',
      }).select().single()
      if (error || !data) throw error ?? new Error('Profile insert returned no row.')
      profileData = data as Record<string, unknown>
      console.info('[create-student] Profile created', { userId: createdUserId })
    } catch (error) {
      throw operationError('Profile insertion', error)
    }

    try {
      const { error } = await adminClient.from('access_codes').insert({
        code: generatedCode,
        student_id: createdUserId,
        status: 'available',
      })
      if (error) throw error
      console.info('[create-student] Access code created', { userId: createdUserId })
    } catch (error) {
      throw operationError('Access code insertion', error)
    }

    return jsonResponse({ message: 'Student created successfully', student: { ...profileData, login_code: generatedCode } }, 200)
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('[create-student] request failed', { message, userId: createdUserId })
    if (adminClient && createdUserId) {
      try {
        await adminClient.from('profiles').delete().eq('id', createdUserId)
        await adminClient.auth.admin.deleteUser(createdUserId)
        console.warn('[create-student] Rolled back created user', { userId: createdUserId })
      } catch (cleanupError) {
        console.error('[create-student] rollback failed', { message: getErrorMessage(cleanupError), userId: createdUserId })
      }
    }
    return jsonResponse({ error: message }, 400)
  }
})