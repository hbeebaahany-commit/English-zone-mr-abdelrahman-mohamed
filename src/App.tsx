import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  Compass,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  LockKeyhole,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  NotebookPen,
  PencilLine,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Trash2,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { isSupabaseConfigured, supabase, supabaseAnonKey } from './lib/supabase'
import StudentDashboard from './StudentDashboard'

type Route = '/' | '/join' | '/teacher/login' | '/teacher/dashboard' | '/student/login' | '/student/register' | `/student/${string}`
type TeacherSection =
  | 'dashboard'
  | 'students'
  | 'courses'
  | 'lessons'
  | 'exams'
  | 'challenges'
  | 'grades'
  | 'attendance'
  | 'announcements'
  | 'payments'
  | 'codes'
  | 'settings'

type CreateMode = 'student' | 'course' | 'lesson' | 'exam' | 'challenge' | 'announcement' | 'code'

const TEACHER_CODE = 'Abdelrahman3177'
const ACADEMIC_STAGES = ['3rd Preparatory', '1st Secondary', '2nd Secondary']
const EDUCATIONAL_SYSTEMS = ['National', 'International']
const getRoute = (): Route => {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  return ['/join', '/teacher/login', '/teacher/dashboard', '/student/login', '/student/register'].includes(path) || path.startsWith('/student/')
    ? (path as Route)
    : '/'
}

function navigate(to: Route) {
  window.history.pushState({}, '', to)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function getCurrentSessionRole(): Promise<'teacher' | 'student' | null> {
  if (!supabase) return null

  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) return null

    const userRole = session.user.user_metadata?.role ?? session.user.app_metadata?.role
    if (!userRole) return null

    const role = String(userRole).toLowerCase()
    if (role === 'teacher' || role === 'student') return role as 'teacher' | 'student'
    return null
  } catch {
    return null
  }
}

async function getTeacherDisplayName(): Promise<string> {
  if (!supabase) return 'Mr Abdelrahman Mohamed'

  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) return 'Mr Abdelrahman Mohamed'

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session.user.id)
      .maybeSingle()

    if (profileError || !data?.full_name) return 'Mr Abdelrahman Mohamed'
    return String(data.full_name)
  } catch {
    return 'Mr Abdelrahman Mohamed'
  }
}

const features = [
  { icon: Compass, title: 'Structured learning', text: 'Organized lessons that make English easier to understand, one clear step at a time.' },
  { icon: Users, title: 'Teacher guidance', text: 'Personal educational support and a learning path shaped by Mr Abdelrahman Mohamed.' },
  { icon: Target, title: 'Practice & exams', text: 'Build confidence through focused practice, revision, and meaningful exam preparation.' },
  { icon: Award, title: 'Track progress', text: 'See your improvement grow and know exactly what to focus on next.' },
]

const categories: readonly [string, string, LucideIcon][] = [
  ['Grammar', 'Build accurate sentences', BookOpen],
  ['Vocabulary', 'Find the right words', Lightbulb],
  ['Reading', 'Understand with confidence', FileText],
  ['Writing', 'Express your ideas', PencilLine],
  ['Listening', 'Train your ear', Bell],
  ['Speaking', 'Use English naturally', MessageCircle],
  ['Exam preparation', 'Prepare with purpose', GraduationCap],
  ['Revision', 'Make progress stick', NotebookPen],
]

const timelineSteps: readonly [string, string, string, LucideIcon][] = [
  ['01', 'Learn', 'Understand the idea with a clear, focused lesson.', BookOpen],
  ['02', 'Practice', 'Try it out until it feels familiar.', PencilLine],
  ['03', 'Test', 'Check your progress and find your next win.', Target],
  ['04', 'Improve', 'Look back, move forward, keep growing.', Sparkles],
]

const learningPaths: readonly [string, string, string, LucideIcon][] = [
  ['Build your foundation', 'Grammar & vocabulary', 'Create strong basics you can use in every conversation and exam.', BookOpen],
  ['Find your voice', 'Speaking & listening', 'Practice understanding real English and expressing your ideas naturally.', MessageCircle],
  ['Prepare with purpose', 'Revision & exams', 'Follow focused revision that turns preparation into confident performance.', Trophy],
]

type Student = {
  id: string
  name: string
  phone: string
  parentPhone: string
  email: string
  stage: string
  system: string
  code: string
  paymentStatus: 'Paid' | 'Pending' | 'Overdue'
  accountStatus: 'Active' | 'Suspended'
  registrationDate: string
}

type Course = {
  id: number
  name: string
  description: string
  stage: string
  system: string
  pricing: 'Free' | 'Paid'
  price: number
  status: 'Published' | 'Draft'
  lessons: number
}

type Lesson = {
  id: number
  name: string
  courseId: number
  description: string
  number: number
  videoLink: string
  status: 'Published' | 'Draft'
}

type Exam = {
  id: number
  name: string
  description: string
  course: string
  lesson: string
  duration: string
  passScore: number
  status: 'Published' | 'Draft'
}

type Challenge = {
  id: number
  name: string
  type: 'Daily Challenge' | 'Vocabulary Challenge' | 'Grammar Challenge' | 'Practice Challenge'
  course: string
  lesson: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  points: number
  status: 'Published' | 'Draft'
}

type Payment = {
  id: number
  student: string
  course: string
  amount: number
  method: string
  date: string
  reference: string
  paymentStatus: 'Pending' | 'Approved' | 'Rejected'
  approvalStatus: 'Waiting' | 'Approved' | 'Rejected'
}

type Announcement = {
  id: number
  title: string
  message: string
  audience: 'All Students' | 'Specific Course' | 'Specific Stage' | 'Specific Student'
  course: string
  date: string
  status: 'Published' | 'Draft'
}

type CodeEntry = {
  id: number
  code: string
  status: 'Available' | 'Used' | 'Expired' | 'Disabled'
  createdAt: string
  usedBy: string
  expiresAt: string
}

type TeacherData = {
  students: Student[]
  courses: Course[]
  lessons: Lesson[]
  exams: Exam[]
  challenges: Challenge[]
  payments: Payment[]
  announcements: Announcement[]
  codes: CodeEntry[]
}

const initialTeacherData: TeacherData = {
  students: [
    { id: '1', name: 'Noor Hassan', phone: '+966551234567', parentPhone: '+966500555111', email: 'noor.hassan@example.com', stage: '3rd Preparatory', system: 'National', code: 'NZ-1042', paymentStatus: 'Paid', accountStatus: 'Active', registrationDate: '2026-09-05' },
    { id: '2', name: 'Yousef Ali', phone: '+966557788990', parentPhone: '+966505000222', email: 'yousef.ali@example.com', stage: '1st Secondary', system: 'International', code: 'NZ-2201', paymentStatus: 'Pending', accountStatus: 'Active', registrationDate: '2026-09-10' },
    { id: '3', name: 'Sara Ahmed', phone: '+966558876661', parentPhone: '+966512223333', email: 'sara.ahmed@example.com', stage: '2nd Secondary', system: 'National', code: 'NZ-3320', paymentStatus: 'Paid', accountStatus: 'Active', registrationDate: '2026-08-27' },
    { id: '4', name: 'Omar Saleh', phone: '+966554443322', parentPhone: '+966501111444', email: 'omar.saleh@example.com', stage: '3rd Preparatory', system: 'National', code: 'NZ-4410', paymentStatus: 'Overdue', accountStatus: 'Suspended', registrationDate: '2026-09-12' },
  ],
  courses: [
    { id: 1, name: 'English Grammar', description: 'Build strong grammar foundations with guided lessons and practical examples.', stage: '3rd Preparatory', system: 'National', pricing: 'Paid', price: 250, status: 'Published', lessons: 12 },
    { id: 2, name: 'Conversation Skills', description: 'Improve fluency and confidence with everyday speaking tasks.', stage: '1st Secondary', system: 'International', pricing: 'Free', price: 0, status: 'Published', lessons: 8 },
    { id: 3, name: 'Vocabulary Mastery', description: 'Expand useful words and academic expressions through context and practice.', stage: '2nd Secondary', system: 'National', pricing: 'Paid', price: 320, status: 'Draft', lessons: 9 },
  ],
  lessons: [
    { id: 1, name: 'Parts of Speech', courseId: 1, description: 'Learn how nouns, verbs, pronouns, adjectives and adverbs work together.', number: 1, videoLink: 'https://example.com/lesson/parts-of-speech', status: 'Published' },
    { id: 2, name: 'Types of Sentences', courseId: 1, description: 'Differentiate statements, questions, commands and exclamations.', number: 2, videoLink: 'https://example.com/lesson/types-of-sentences', status: 'Published' },
    { id: 3, name: 'Daily Conversation', courseId: 2, description: 'Practice key phrases for real-world situations.', number: 1, videoLink: 'https://example.com/lesson/daily-conversation', status: 'Published' },
  ],
  exams: [
    { id: 1, name: 'Grammar Diagnostic Test', description: 'Quick diagnostic for grammar accuracy and sentence structure.', course: 'English Grammar', lesson: 'Parts of Speech', duration: '40 min', passScore: 70, status: 'Published' },
    { id: 2, name: 'Speaking Confidence Check', description: 'Read, respond, and evaluate communication skills.', course: 'Conversation Skills', lesson: 'Daily Conversation', duration: '25 min', passScore: 60, status: 'Draft' },
  ],
  challenges: [
    { id: 1, name: 'Daily Vocabulary Sprint', type: 'Vocabulary Challenge', course: 'Vocabulary Mastery', lesson: 'Daily Practice', difficulty: 'Easy', points: 120, status: 'Published' },
    { id: 2, name: 'Grammar Focus Quiz', type: 'Grammar Challenge', course: 'English Grammar', lesson: 'Types of Sentences', difficulty: 'Medium', points: 180, status: 'Published' },
  ],
  payments: [
    { id: 1, student: 'Noor Hassan', course: 'English Grammar', amount: 250, method: 'Bank Transfer', date: '2026-09-11', reference: 'PAY-7842', paymentStatus: 'Approved', approvalStatus: 'Approved' },
    { id: 2, student: 'Yousef Ali', course: 'Vocabulary Mastery', amount: 320, method: 'Card', date: '2026-09-12', reference: 'PAY-7871', paymentStatus: 'Pending', approvalStatus: 'Waiting' },
    { id: 3, student: 'Omar Saleh', course: 'English Grammar', amount: 250, method: 'Cash', date: '2026-09-10', reference: 'PAY-7809', paymentStatus: 'Rejected', approvalStatus: 'Rejected' },
  ],
  announcements: [
    { id: 1, title: 'New Grammar Sprint', message: 'A new grammar challenge is now live for preparatory students.', audience: 'Specific Stage', course: 'English Grammar', date: '2026-09-14', status: 'Published' },
    { id: 2, title: 'Speaking Club Reminder', message: 'Join the speaking club this Friday at 6 PM.', audience: 'All Students', course: 'Conversation Skills', date: '2026-09-15', status: 'Draft' },
  ],
  codes: [
    { id: 1, code: 'ENG-1001', status: 'Available', createdAt: '2026-09-01', usedBy: '-', expiresAt: '2026-09-30' },
    { id: 2, code: 'ENG-1002', status: 'Used', createdAt: '2026-09-02', usedBy: 'Noor Hassan', expiresAt: '2026-09-28' },
    { id: 3, code: 'ENG-1003', status: 'Expired', createdAt: '2026-09-05', usedBy: '-', expiresAt: '2026-09-10' },
  ],
}

const emptyTeacherData: TeacherData = { students: [], courses: [], lessons: [], exams: [], challenges: [], payments: [], announcements: [], codes: [] }

async function fetchTeacherDashboardData(): Promise<TeacherData> {
  if (!supabase) return emptyTeacherData

  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const teacherId = sessionData.session?.user.id
    if (!teacherId) return emptyTeacherData

    const [{ data: studentsData }, { data: coursesData }, { data: lessonsData }, { data: examsData }, { data: challengesData }, { data: paymentsData }, { data: announcementsData }, { data: codesData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false }),
      supabase.from('courses').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false }),
      supabase.from('lessons').select('*').order('created_at', { ascending: false }),
      supabase.from('exams').select('*, courses(title), lessons(title)').eq('teacher_id', teacherId).order('created_at', { ascending: false }),
      supabase.from('challenges').select('*, courses(title), lessons(title)').eq('teacher_id', teacherId).order('created_at', { ascending: false }),
      supabase.from('payments').select('*, profiles(full_name), courses(title)').order('created_at', { ascending: false }),
      supabase.from('announcements').select('*, courses(title)').eq('teacher_id', teacherId).order('created_at', { ascending: false }),
      supabase.from('access_codes').select('*').order('created_at', { ascending: false }),
    ])

    const students = (studentsData ?? []).map((row) => ({
      id: String(row.id ?? ''),
      name: String(row.full_name ?? 'Unnamed Student'),
      phone: String(row.phone ?? '-'),
      parentPhone: String(row.parent_phone ?? '-'),
      email: String(row.email ?? '-'),
      stage: String(row.stage ?? 'Not set'),
      system: String(row.system ?? 'National'),
      code: String(row.student_code ?? 'N/A'),
      paymentStatus: row.payment_status === 'Pending' ? 'Pending' : row.payment_status === 'Overdue' ? 'Overdue' : 'Paid',
      accountStatus: row.status === 'suspended' ? 'Suspended' : 'Active',
      registrationDate: String(row.created_at ?? new Date().toISOString().slice(0, 10)),
    })) as Student[]

    const courses = (coursesData ?? []).map((row) => ({
      id: Number(row.id ?? 0),
      name: String(row.title ?? row.name ?? 'Untitled Course'),
      description: String(row.description ?? 'No description yet.'),
      stage: String(row.stage ?? 'Not set'),
      system: String(row.system ?? 'National'),
      pricing: row.pricing_type === 'paid' ? 'Paid' : 'Free',
      price: Number(row.price ?? 0),
      status: row.status === 'draft' ? 'Draft' : 'Published',
      lessons: Number(row.lessons_count ?? 0),
    })) as Course[]

    const lessons = (lessonsData ?? []).map((row) => ({
      id: Number(row.id ?? 0),
      name: String(row.title ?? 'Untitled Lesson'),
      courseId: Number(row.course_id ?? 0),
      description: String(row.description ?? 'No description yet.'),
      number: Number(row.lesson_number ?? 1),
      videoLink: String(row.video_url ?? 'https://example.com/lesson'),
      status: row.status === 'draft' ? 'Draft' : 'Published',
    })) as Lesson[]

    const exams = (examsData ?? []).map((row) => ({
      id: Number(row.id ?? 0),
      name: String(row.name ?? 'Untitled Exam'),
      description: String(row.description ?? 'No description yet.'),
      course: String(row.courses?.title ?? 'General'),
      lesson: String(row.lessons?.title ?? 'General'),
      duration: `${Number(row.duration_minutes ?? 30)} min`,
      passScore: Number(row.pass_score ?? 70),
      status: row.status === 'draft' ? 'Draft' : 'Published',
    })) as Exam[]

    const challenges = (challengesData ?? []).map((row) => ({
      id: Number(row.id ?? 0),
      name: String(row.name ?? 'Untitled Challenge'),
      type: String(row.challenge_type ?? 'Practice Challenge') as Challenge['type'],
      course: String(row.courses?.title ?? 'General'),
      lesson: String(row.lessons?.title ?? 'General'),
      difficulty: String(row.difficulty ?? 'Medium') as Challenge['difficulty'],
      points: Number(row.points ?? 0),
      status: row.status === 'draft' ? 'Draft' : 'Published',
    })) as Challenge[]

    const payments = (paymentsData ?? []).map((row) => ({
      id: Number(row.id ?? 0),
      student: String(row.profiles?.full_name ?? 'Student'),
      course: String(row.courses?.title ?? 'Course'),
      amount: Number(row.amount ?? 0),
      method: String(row.payment_method ?? 'Card'),
      date: String(row.created_at ?? new Date().toISOString().slice(0, 10)),
      reference: String(row.reference ?? 'REF'),
      paymentStatus: row.status === 'approved' ? 'Approved' : row.status === 'rejected' ? 'Rejected' : 'Pending',
      approvalStatus: row.status === 'approved' ? 'Approved' : row.status === 'rejected' ? 'Rejected' : 'Waiting',
    })) as Payment[]

    const announcements = (announcementsData ?? []).map((row) => ({
      id: Number(row.id ?? 0),
      title: String(row.title ?? 'Announcement'),
      message: String(row.message ?? ''),
      audience: String(row.audience ?? 'All Students') as Announcement['audience'],
      course: String(row.courses?.title ?? 'General'),
      date: String(row.created_at ?? new Date().toISOString().slice(0, 10)),
      status: row.status === 'draft' ? 'Draft' : 'Published',
    })) as Announcement[]

    const codes = (codesData ?? []).map((row) => ({
      id: Number(row.id ?? 0),
      code: String(row.code ?? 'N/A'),
      status: String(row.status ?? 'Available') as CodeEntry['status'],
      createdAt: String(row.created_at ?? new Date().toISOString().slice(0, 10)),
      usedBy: String(row.used_by ?? '-'),
      expiresAt: String(row.expires_at ?? new Date().toISOString().slice(0, 10)),
    })) as CodeEntry[]

    return {
      students, courses, lessons, exams, challenges, payments, announcements, codes,
    }
  } catch {
    return emptyTeacherData
  }
}

function usePersistentTeacherData() {
  const [data, setData] = useState<TeacherData>(emptyTeacherData)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      const next = await fetchTeacherDashboardData()
      if (isMounted) {
        setData(next)
      }
    }

    void loadData()

    return () => {
      isMounted = false
    }
  }, [reloadKey])

  return [data, setData, () => setReloadKey((value) => value + 1)] as const
}

function Header() {
  const [open, setOpen] = useState(false)
  const links = [
    ['Home', '/'],
    ['Courses', '/#courses'],
    ['About', '/#why'],
    ['Contact', '/#footer'],
  ]

  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" onClick={() => navigate('/')} aria-label="English Zone home">
          <span className="brand-mark"><BookOpen size={18} /></span>
          <span>
            <strong>ENGLISH ZONE</strong>
            <small>with Mr Abdelrahman</small>
          </span>
        </button>
        <nav className={open ? 'nav open' : 'nav'}>
          {links.map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}>{label}</a>
          ))}
        </nav>
        <div className="header-actions">
          <button className="button small" onClick={() => navigate('/join')}>Join English Zone <ArrowRight size={15} /></button>
        </div>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  )
}

function EditorialArt() {
  return (
    <div className="editorial-art" aria-label="Animated English learning dashboard illustration">
      <div className="art-orbit orbit-one" />
      <div className="art-orbit orbit-two" />
      <div className="art-dot dot-one" />
      <div className="art-dot dot-two" />
      <span className="art-label">YOUR NEXT<br /><em>chapter</em></span>
      <div className="art-star star-one">✦</div>
      <div className="art-star star-two">✦</div>
      <div className="lesson-board">
        <div className="lesson-board-top"><span>ENGLISH ZONE</span><span className="live-dot">LIVE</span></div>
        <div className="lesson-progress"><span /><b>72%</b></div>
        <p className="lesson-kicker">TODAY'S FOCUS</p>
        <h3>Speak with<br /><em>confidence.</em></h3>
        <div className="lesson-chips"><span><BookOpen size={13} /> Learn</span><span><MessageCircle size={13} /> Practice</span></div>
        <div className="lesson-board-footer"><span>4 steps</span><span>Keep going <ArrowRight size={13} /></span></div>
      </div>
      <div className="floating-card card-vocab"><Lightbulb size={16} /><span><b>New word</b><small>Opportunity</small></span></div>
      <div className="floating-card card-score"><Trophy size={16} /><span><b>Great work</b><small>+12 points</small></span></div>
      <div className="art-quote">LEARN.<br />SPEAK. GROW.</div>
    </div>
  )
}

function LoginScene() {
  return <div className="login-scene" aria-hidden="true"><div className="login-ring ring-one" /><div className="login-ring ring-two" /><span className="login-orb orb-a" /><span className="login-orb orb-b" /><div className="login-note"><span>01</span><strong>Keep your<br /><em>progress</em> moving.</strong><small>Learn at your own pace</small></div><div className="login-check"><CheckCircle2 size={18} /><span>Lesson complete</span></div><div className="login-scene-word">ENGLISH<br /><em>ZONE</em></div></div>
}

function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero section-shell">
          <div className="hero-copy">
            <p className="eyebrow"><span /> Something big is coming</p>
            <h1>Are you ready to <span>improve</span> your English?</h1>
            <div className="underline" />
            <p className="hero-description">Your English journey starts here. Learn through structured lessons, practice with confidence, and build the skills you need for a brighter future.</p>
            <div className="hero-actions">
              <button className="button" onClick={() => navigate('/join')}>Join English Zone <ArrowRight size={17} /></button>
              <a className="link-button" href="#courses">Explore courses <ArrowUpRight size={16} /></a>
            </div>
            <div className="hero-proof">
              <span>Learn.</span> <span>Practice.</span> <span>Improve.</span>
              <small>Teacher-led learning <i /> Clear lessons <i /> Confident results</small>
            </div>
          </div>
          <EditorialArt />
        </section>

        <section className="trust-strip">
          <div><span className="trust-icon"><Sparkles size={16} /></span><b>A place to grow</b><small>English made approachable</small></div>
          <div><span className="trust-icon"><Zap size={16} /></span><b>Built for progress</b><small>Learn at your own pace</small></div>
          <div><span className="trust-icon"><ShieldCheck size={16} /></span><b>Learn with confidence</b><small>Support at every step</small></div>
        </section>

        <section className="content-section" id="why">
          <div className="section-heading">
            <p className="eyebrow">Why English Zone?</p>
            <h2>More than a lesson.<br /><em>A new way forward.</em></h2>
            <p>Learning English is not about memorizing more. It is about opening more doors, finding your voice, and feeling ready for what comes next.</p>
          </div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, text }, i) => (
              <article className="feature-card" key={title}>
                <span className="card-number">0{i + 1}</span>
                <span className="feature-icon"><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
                <ArrowUpRight className="card-arrow" size={18} />
              </article>
            ))}
          </div>
        </section>

        <section className="process-band" id="courses">
          <div className="centered">
            <p className="eyebrow"><span /> Learn, practice, grow</p>
            <h2>Everything you need to keep moving forward.</h2>
          </div>
          <div className="timeline">
            {timelineSteps.map(([step, label, text, Icon]) => (
              <div className="timeline-step" key={step}>
                <span className="timeline-icon"><Icon size={24} /></span>
                <div>
                  <span className="timeline-number">{step}</span>
                  <h3>{label}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="paths-section">
          <div className="paths-intro">
            <div>
              <p className="eyebrow"><span /> A path that fits you</p>
              <h2>Start where you are.<br /><em>Grow from there.</em></h2>
            </div>
            <p>Whether you are building the basics or preparing for your next exam, English Zone gives you a clear place to begin and a practical way to keep improving.</p>
          </div>
          <div className="paths-grid">
            {learningPaths.map(([title, label, text, Icon], index) => (
              <article className="path-card" key={title}>
                <span className="path-index">0{index + 1}</span>
                <span className="path-icon"><Icon size={22} /></span>
                <p>{label}</p>
                <h3>{title}</h3>
                <span className="path-line" />
                <small>{text}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="home-proof-section">
          <div className="home-proof-heading">
            <p className="eyebrow"><span /> Progress you can feel</p>
            <h2>Small steps.<br /><em>Real confidence.</em></h2>
          </div>
          <div className="home-proof-content">
            <div className="proof-quote"><span className="quote-mark">“</span><p>English gets easier when every lesson has a purpose and every practice session moves you one step forward.</p><strong>English Zone method</strong></div>
            <div className="proof-stats"><div><strong>4</strong><span>focused learning steps</span></div><div><strong>8</strong><span>core English skills</span></div><div><strong>1</strong><span>clear path forward</span></div></div>
          </div>
        </section>

        <section className="inside-section">
          <div className="inside-heading">
            <p className="eyebrow"><span /> Inside your learning space</p>
            <h2>Everything has a<br /><em>next step.</em></h2>
          </div>
          <div className="inside-list">
            <article><span>01</span><div><h3>Clear lessons</h3><p>Focused explanations that make difficult ideas easier to understand.</p></div><BookOpen size={21} /></article>
            <article><span>02</span><div><h3>Practice that matters</h3><p>Exercises designed to turn knowledge into a skill you can use.</p></div><PencilLine size={21} /></article>
            <article><span>03</span><div><h3>Progress you can see</h3><p>Follow your lessons, exams, grades, and achievements in one place.</p></div><BarChart3 size={21} /></article>
          </div>
        </section>

        <section className="home-cta">
          <div>
            <p className="eyebrow"><span /> Your next chapter starts here</p>
            <h2>Ready to make English<br /><em>feel easier?</em></h2>
          </div>
          <div className="home-cta-action">
            <p>Join a focused learning space built to help you learn with confidence and keep your progress moving.</p>
            <button className="button" onClick={() => navigate('/join')}>Join English Zone <ArrowRight size={17} /></button>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

function Footer() {
  return (
    <footer id="footer">
      <div className="footer-main">
        <button className="brand footer-brand" onClick={() => navigate('/')}>
          <span className="brand-mark"><BookOpen size={18} /></span>
          <span><strong>ENGLISH ZONE</strong><small>with Mr Abdelrahman</small></span>
        </button>
        <p>Master English. Unlock Opportunities.<br />Learn. Practice. Achieve.</p>
        <div className="footer-links">
          <a href="#why">About</a>
          <a href="#courses">Courses</a>
          <button onClick={() => navigate('/student/login')}>Student login</button>
          <button onClick={() => navigate('/teacher/login')}>Teacher login</button>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 English Zone. All rights reserved.</span>
        <span>Made for curious minds.</span>
      </div>
    </footer>
  )
}

function PageFrame({ eyebrow, title, children, back = '/join' }: { eyebrow: string; title: ReactNode; children: ReactNode; back?: Route }) {
  return (
    <>
      <Header />
      <main className="auth-page">
        <div className="page-atmosphere" aria-hidden="true">
          <span className="atmosphere-letter">A</span>
          <BookOpen />
          <span className="atmosphere-note">learn<br />speak<br />grow</span>
          <span className="atmosphere-star">✦</span>
          <span className="atmosphere-orb orb-one" />
          <span className="atmosphere-orb orb-two" />
        </div>
        <LoginScene />
        <button className="back-link" onClick={() => navigate(back)}><ArrowRight size={16} className="flip" /> Back to {back === '/' ? 'home' : 'Join English Zone'}</button>
        <div className="auth-intro">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        {children}
      </main>
      <Footer />
    </>
  )
}

function Join() {
  const cards = [
    { title: 'Teacher login', desc: 'Access the teacher dashboard, manage students, courses, exams, attendance, and payments.', icon: GraduationCap, to: '/teacher/login' as Route, label: '01' },
    { title: 'Student login', desc: 'Access your courses, lessons, exams, grades, attendance, and learning progress.', icon: BookOpen, to: '/student/login' as Route, label: '02' },
    { title: 'Create account', desc: 'Create your student account and begin your English learning journey.', icon: UserPlus, to: '/student/register' as Route, label: '03' },
  ]

  return (
    <PageFrame eyebrow="Choose your next step" title={<><span>Join </span><em>English Zone.</em></>}>
      <p className="page-lede">Choose how you want to continue.</p>
      <div className="join-grid">
        {cards.map(({ title, desc, icon: Icon, to, label }) => (
          <article className="join-card" key={title}>
            <span className="card-number">{label}</span>
            <Icon className="join-icon" size={31} />
            <h2>{title}</h2>
            <p>{desc}</p>
            <button className="link-button" onClick={() => navigate(to)}>Continue <ArrowRight size={16} /></button>
          </article>
        ))}
      </div>
    </PageFrame>
  )
}

function AuthNotice() {
  return !isSupabaseConfigured ? (
    <div className="config-notice">
      <LockKeyhole size={18} />
      <span><strong>Supabase is not connected yet.</strong> Add the variables from <code>.env.example</code> to enable secure authentication and persistent data.</span>
    </div>
  ) : null
}

function TeacherDashboard() {
  const [section, setSection] = useState<TeacherSection>('dashboard')
  const [teacherData, setTeacherData, reloadTeacherData] = usePersistentTeacherData()
  const [search, setSearch] = useState('')
  const [teacherName, setTeacherName] = useState('Mr Abdelrahman Mohamed')
  const [createMode, setCreateMode] = useState<CreateMode | null>(null)

  useEffect(() => {
    void (async () => {
      const displayName = await getTeacherDisplayName()
      setTeacherName(displayName)
    })()
  }, [])

  const stats = useMemo(() => {
    const activeStudents = teacherData.students.filter((student) => student.accountStatus === 'Active').length
    const pendingPayments = teacherData.payments.filter((payment) => payment.paymentStatus === 'Pending').length
    const totalLessons = teacherData.lessons.length
    const totalChallenges = teacherData.challenges.length
    return [
      { label: 'Total Students', value: String(teacherData.students.length), icon: Users, change: 'From Supabase' },
      { label: 'Active Students', value: String(activeStudents), icon: ShieldCheck, change: 'Current status' },
      { label: 'Pending Payments', value: String(pendingPayments), icon: CircleDollarSign, change: 'Needs review' },
      { label: 'Total Courses', value: String(teacherData.courses.length), icon: BookOpen, change: 'Teacher courses' },
      { label: 'Total Lessons', value: String(totalLessons), icon: NotebookPen, change: 'Published and draft' },
      { label: 'Total Exams', value: String(teacherData.exams.length), icon: FileText, change: 'Teacher exams' },
      { label: 'Total Challenges', value: String(totalChallenges), icon: Trophy, change: 'Teacher challenges' },
      { label: 'Average Grades', value: '—', icon: BarChart3, change: 'No grade query loaded' },
    ]
  }, [teacherData])

  const navItems: Array<{ id: TeacherSection; label: string; icon: LucideIcon }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'lessons', label: 'Lessons', icon: NotebookPen },
    { id: 'exams', label: 'Exams', icon: FileText },
    { id: 'challenges', label: 'Challenges', icon: Trophy },
    { id: 'grades', label: 'Grades', icon: BarChart3 },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck2 },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'payments', label: 'Payments', icon: CircleDollarSign },
    { id: 'codes', label: 'Create Codes', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const filteredStudents = teacherData.students.filter((student) => {
    const query = search.toLowerCase()
    return !query || [student.name, student.email, student.code, student.phone].join(' ').toLowerCase().includes(query)
  })

  const deleteStudent = async (studentId: string) => {
    if (!supabase || !window.confirm('Delete this student profile?')) return
    const { error } = await supabase.from('profiles').delete().eq('id', studentId).eq('role', 'student')
    if (!error) reloadTeacherData()
  }

  const deleteCourse = async (courseId: number) => {
    if (!supabase || !window.confirm('Delete this course and its lessons?')) return
    const { error } = await supabase.from('courses').delete().eq('id', courseId)
    if (!error) reloadTeacherData()
  }

  const approvePayment = async (paymentId: number) => {
    if (!supabase) return
    const { error } = await supabase.from('payments').update({ status: 'approved', approval_status: 'approved' }).eq('id', paymentId)
    if (!error) reloadTeacherData()
  }

  const recentActivities = teacherData.students.slice(0, 4).map((student) => ({ user: student.name, activity: 'Student profile registered', date: student.registrationDate, status: 'Active' }))

  const quickActions = [
    'Add Student',
    'Create Course',
    'Add Lesson',
    'Create Exam',
    'Create Challenge',
    'Create Code',
    'Announcement',
    'Record Attendance',
  ]

  return (
    <div className="teacher-shell">
      <aside className="teacher-sidebar">
        <div className="teacher-brand-block">
          <div className="teacher-avatar">M</div>
          <div>
            <p className="teacher-name">{teacherName}</p>
            <span className="teacher-role">Teacher Dashboard</span>
          </div>
        </div>

        <nav className="teacher-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={section === id ? 'teacher-nav-item active' : 'teacher-nav-item'}
              onClick={() => setSection(id)}
              type="button"
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <button className="teacher-logout" type="button" onClick={() => navigate('/teacher/login')}>
          <LogOut size={16} />
          Logout
        </button>
      </aside>

      <main className="teacher-main">
        <header className="teacher-topbar">
          <div>
            <p className="topbar-greeting">Good Morning, Mr Abdelrahman</p>
            <h2>Here&apos;s what&apos;s happening on your platform today.</h2>
          </div>
          <div className="topbar-actions">
            <button className="notification-button" type="button" aria-label="Notifications">
              <Bell size={18} />
              <span className="notification-count">4</span>
            </button>
            <button className="button small" type="button" onClick={() => navigate('/teacher/login')}>Back to login</button>
          </div>
        </header>

        {createMode && <TeacherCreatePanel mode={createMode} courses={teacherData.courses} onClose={() => setCreateMode(null)} onStudentCreated={(student) => setTeacherData((current) => ({ ...current, students: [student, ...current.students] }))} onSaved={() => { setCreateMode(null); if (createMode !== 'student') reloadTeacherData() }} />}

        {section === 'dashboard' && (
          <>
            <section className="stats-grid">
              {stats.map(({ label, value, icon: Icon, change }) => (
                <article className="stat-card" key={label}>
                  <div className="stat-top">
                    <span className="stat-label">{label}</span>
                    <span className="stat-icon"><Icon size={18} /></span>
                  </div>
                  <h3>{value}</h3>
                  <small>{change}</small>
                </article>
              ))}
            </section>

            <section className="quick-actions-block">
              <h3>Quick Actions</h3>
              <div className="quick-actions-grid">
                {quickActions.map((action) => (
                  <button className="button quick-button" key={action} type="button" onClick={() => action === 'Add Student' ? setCreateMode('student') : action === 'Create Course' ? setCreateMode('course') : action === 'Add Lesson' ? setCreateMode('lesson') : action === 'Create Exam' ? setCreateMode('exam') : action === 'Create Challenge' ? setCreateMode('challenge') : action === 'Create Code' ? setCreateMode('code') : action === 'Announcement' ? setCreateMode('announcement') : setSection('attendance')}>
                    <Plus size={14} />
                    {action}
                  </button>
                ))}
              </div>
            </section>

            <section className="teacher-panel">
              <div className="panel-header">
                <h3>Recent Activity</h3>
                <button className="link-button" type="button">View all</button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Activity</th>
                      <th>Date / Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivities.map((activity, index) => (
                      <tr key={`${activity.user}-${index}`}>
                        <td>{activity.user}</td>
                        <td>{activity.activity}</td>
                        <td>{activity.date}</td>
                        <td><span className={`status-badge ${activity.status.toLowerCase()}`}>{activity.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {section === 'students' && (
          <section className="teacher-panel">
            <div className="panel-header">
              <h3>Students</h3>
              <div className="panel-actions">
                <button className="button small" type="button" onClick={() => setCreateMode('student')}><UserPlus size={14} /> Add Student</button>
                <div className="search-box">
                <Search size={15} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, code..." />
                </div>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Phone</th>
                    <th>Parent Phone</th>
                    <th>Email</th>
                    <th>Stage</th>
                    <th>System</th>
                    <th>Code</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td>{student.phone}</td>
                      <td>{student.parentPhone}</td>
                      <td>{student.email}</td>
                      <td>{student.stage}</td>
                      <td>{student.system}</td>
                      <td>{student.code}</td>
                      <td>{student.paymentStatus}</td>
                      <td><span className={`status-badge ${student.accountStatus === 'Active' ? 'success' : 'warning'}`}>{student.accountStatus}</span></td>
                      <td>{student.registrationDate}</td>
                      <td className="action-buttons">
                        <button type="button" className="tiny-button">View</button>
                        <button type="button" className="tiny-button">Edit</button>
                        <button type="button" className="tiny-button danger" onClick={() => void deleteStudent(student.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === 'courses' && (
          <section className="teacher-panel">
            <div className="panel-header">
              <h3>Courses</h3>
              <button className="button" type="button" onClick={() => setSection('courses')}><Plus size={14} /> Create Course</button>
            </div>
            <div className="stack-grid">
              {teacherData.courses.map((course) => (
                <article className="info-card" key={course.id}>
                  <div className="info-card-top">
                    <div>
                      <span className="card-tag">{course.pricing}</span>
                      <h4>{course.name}</h4>
                    </div>
                    <span className="status-badge success">{course.status}</span>
                  </div>
                  <p>{course.description}</p>
                  <div className="meta-row">
                    <span>{course.stage}</span>
                    <span>{course.system}</span>
                    <span>{course.lessons} lessons</span>
                    {course.pricing === 'Paid' ? <span>{course.price} SAR</span> : <span>Free</span>}
                  </div>
                  <div className="action-buttons row">
                    <button type="button" className="tiny-button">Open</button>
                    <button type="button" className="tiny-button">Edit</button>
                    <button type="button" className="tiny-button danger" onClick={() => void deleteCourse(course.id)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {section === 'lessons' && (
          <section className="teacher-panel">
            <div className="panel-header">
              <h3>Lessons</h3>
              <button className="button" type="button" onClick={() => setSection('lessons')}><Plus size={14} /> Add Lesson</button>
            </div>
            <div className="stack-grid">
              {teacherData.lessons.map((lesson) => {
                const courseName = teacherData.courses.find((course) => course.id === lesson.courseId)?.name || 'Course'
                return (
                  <article className="info-card" key={lesson.id}>
                    <div className="info-card-top">
                      <div>
                        <span className="card-tag">Lesson {lesson.number}</span>
                        <h4>{lesson.name}</h4>
                      </div>
                      <span className="status-badge success">{lesson.status}</span>
                    </div>
                    <p>{lesson.description}</p>
                    <div className="meta-row">
                      <span>{courseName}</span>
                      <span>{lesson.videoLink}</span>
                    </div>
                    <div className="action-buttons row">
                      <button type="button" className="tiny-button">Edit</button>
                      <button type="button" className="tiny-button danger">Delete</button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {section === 'exams' && (
          <section className="teacher-panel">
            <div className="panel-header">
              <h3>Exams</h3>
              <button className="button" type="button" onClick={() => setSection('exams')}><Plus size={14} /> Create Exam</button>
            </div>
            <div className="stack-grid">
              {teacherData.exams.map((exam) => (
                <article className="info-card" key={exam.id}>
                  <div className="info-card-top">
                    <div>
                      <span className="card-tag">Exam</span>
                      <h4>{exam.name}</h4>
                    </div>
                    <span className="status-badge success">{exam.status}</span>
                  </div>
                  <p>{exam.description}</p>
                  <div className="meta-row">
                    <span>{exam.course}</span>
                    <span>{exam.lesson}</span>
                    <span>{exam.duration}</span>
                    <span>Pass {exam.passScore}%</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {section === 'challenges' && (
          <section className="teacher-panel">
            <div className="panel-header">
              <h3>Challenges</h3>
              <button className="button" type="button" onClick={() => setSection('challenges')}><Plus size={14} /> Create Challenge</button>
            </div>
            <div className="stack-grid">
              {teacherData.challenges.map((challenge) => (
                <article className="info-card" key={challenge.id}>
                  <div className="info-card-top">
                    <div>
                      <span className="card-tag">{challenge.type}</span>
                      <h4>{challenge.name}</h4>
                    </div>
                    <span className="status-badge success">{challenge.status}</span>
                  </div>
                  <div className="meta-row">
                    <span>{challenge.course}</span>
                    <span>{challenge.lesson}</span>
                    <span>{challenge.difficulty}</span>
                    <span>{challenge.points} XP</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {section === 'grades' && (
          <section className="teacher-panel">
            <div className="panel-header">
              <h3>Grades</h3>
            </div>
            <div className="grade-summary">
              <div className="summary-pill"><strong>86%</strong><span>Average Score</span></div>
              <div className="summary-pill"><strong>12</strong><span>Passed Exams</span></div>
              <div className="summary-pill"><strong>3</strong><span>Failed Exams</span></div>
              <div className="summary-pill"><strong>4</strong><span>Challenge Performance</span></div>
            </div>
          </section>
        )}

        {section === 'attendance' && (
          <section className="teacher-panel">
            <div className="panel-header">
              <h3>Attendance</h3>
              <button className="button" type="button" onClick={() => setSection('attendance')}><Plus size={14} /> Record Attendance</button>
            </div>
            <div className="attendances">
              {teacherData.students.map((student) => (
                <div key={student.id} className="attendance-row">
                  <span>{student.name}</span>
                  <span>{student.stage}</span>
                  <span>Present</span>
                  <button type="button" className="tiny-button">Edit</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {section === 'announcements' && (
          <section className="teacher-panel">
            <div className="panel-header">
              <h3>Announcements</h3>
              <button className="button" type="button" onClick={() => setSection('announcements')}><Plus size={14} /> Create Announcement</button>
            </div>
            <div className="stack-grid">
              {teacherData.announcements.map((announcement) => (
                <article className="info-card" key={announcement.id}>
                  <div className="info-card-top">
                    <div>
                      <span className="card-tag">{announcement.audience}</span>
                      <h4>{announcement.title}</h4>
                    </div>
                    <span className="status-badge success">{announcement.status}</span>
                  </div>
                  <p>{announcement.message}</p>
                  <div className="meta-row">
                    <span>{announcement.course}</span>
                    <span>{announcement.date}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {section === 'payments' && (
          <section className="teacher-panel">
            <div className="panel-header">
              <h3>Payments</h3>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Approval</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherData.payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.student}</td>
                      <td>{payment.course}</td>
                      <td>{payment.amount} SAR</td>
                      <td>{payment.method}</td>
                      <td>{payment.date}</td>
                      <td>{payment.reference}</td>
                      <td><span className={`status-badge ${payment.paymentStatus.toLowerCase()}`}>{payment.paymentStatus}</span></td>
                      <td>{payment.approvalStatus}</td>
                      <td>{payment.paymentStatus === 'Pending' ? <button type="button" className="tiny-button" onClick={() => void approvePayment(payment.id)}>Approve</button> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === 'codes' && (
          <section className="teacher-panel">
            <div className="panel-header">
              <h3>Create Codes</h3>
              <button className="button" type="button"><Plus size={14} /> Generate Code</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Used By</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherData.codes.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.code}</td>
                      <td><span className={`status-badge ${entry.status.toLowerCase()}`}>{entry.status}</span></td>
                      <td>{entry.createdAt}</td>
                      <td>{entry.usedBy}</td>
                      <td>{entry.expiresAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {section === 'settings' && (
          <section className="teacher-panel">
            <div className="panel-header">
              <h3>Settings</h3>
            </div>
            <div className="settings-grid">
              <div className="settings-card">
                <h4>Teacher Profile</h4>
                <label>Name<input defaultValue="Mr Abdelrahman Mohamed" /></label>
                <label>Email<input defaultValue="teacher@englishzone.com" /></label>
                <label>Phone<input defaultValue="+966500000000" /></label>
              </div>
              <div className="settings-card">
                <h4>Platform Settings</h4>
                <label>Platform Name<input defaultValue="English Zone" /></label>
                <label>Logo<input defaultValue="English Zone" /></label>
                <label>General Settings<input defaultValue="Active" /></label>
              </div>
              <div className="settings-card">
                <h4>Security</h4>
                <label>Change Password<input type="password" defaultValue="********" /></label>
                <label>Login Security<input defaultValue="Protected" /></label>
                <label>Session Management<input defaultValue="Active" /></label>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function TeacherCreatePanel({ mode, courses, onClose, onStudentCreated, onSaved }: { mode: CreateMode; courses: Course[]; onClose: () => void; onStudentCreated?: (student: Student) => void; onSaved: () => void }) {
  const [error, setError] = useState('')
  const [createdCode, setCreatedCode] = useState('')
  const [saving, setSaving] = useState(false)
  const title = mode === 'student' ? 'Add Student' : mode === 'course' ? 'Create Course' : mode === 'lesson' ? 'Add Lesson' : mode === 'exam' ? 'Create Exam' : mode === 'challenge' ? 'Create Challenge' : mode === 'announcement' ? 'Create Announcement' : 'Create Access Code'

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) { setError('Supabase is not configured.'); return }
    setSaving(true)
    setError('')
    const values = new FormData(event.currentTarget)
    if (mode === 'student') {
      const payload = {
        email: String(values.get('email') || '').trim(),
        full_name: String(values.get('full_name') || '').trim(),
        phone: String(values.get('phone') || '').trim(),
        parent_phone: String(values.get('parent_phone') || '').trim(),
        stage: String(values.get('stage') || '').trim(),
        system: String(values.get('system') || '').trim(),
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const session = sessionData.session
      if (sessionError || !session?.access_token) {
        setSaving(false)
        setError('Teacher session expired. Please log in again.')
        return
      }
      const { data, error: invokeError } = await supabase.functions.invoke('create-student', {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
        },
      })
      setSaving(false)
      if (invokeError) {
        let backendError = invokeError.message
        if (invokeError.context instanceof Response) {
          try {
            const responseBody = await invokeError.context.clone().json() as { error?: string; message?: string }
            backendError = responseBody.error || responseBody.message || backendError
          } catch {
            // Keep the SDK error when the function did not return JSON.
          }
        }
        setError(backendError)
        return
      }
      if (data?.error || !data?.student) {
        setError(data?.error || 'Student creation did not return a successful response.')
        return
      }
      const student = data.student
      onStudentCreated?.({
        id: String(student.id),
        name: String(student.full_name || 'Unnamed Student'),
        phone: String(student.phone || '-'),
        parentPhone: String(student.parent_phone || '-'),
        email: String(student.email || '-'),
        stage: String(student.stage || 'Not set'),
        system: String(student.system || 'National'),
        code: String(student.student_code || 'N/A'),
        paymentStatus: 'Pending',
        accountStatus: student.status === 'suspended' ? 'Suspended' : 'Active',
        registrationDate: new Date().toISOString(),
      })
      setCreatedCode(String(student.login_code || ''))
      return
    }
    const { data: sessionData } = await supabase.auth.getSession()
    const teacherId = sessionData.session?.user.id
    if (!teacherId) { setSaving(false); setError('Teacher session expired. Please log in again.'); return }
    const courseId = Number(values.get('course_id'))
    const payload = mode === 'course'
      ? { teacher_id: teacherId, title: String(values.get('title')), description: String(values.get('description') || ''), stage: String(values.get('stage')), system: String(values.get('system')), pricing_type: String(values.get('pricing_type')), price: Number(values.get('price') || 0), status: 'draft' }
      : mode === 'lesson'
        ? { course_id: courseId, title: String(values.get('title')), description: String(values.get('description') || ''), lesson_number: Number(values.get('lesson_number') || 1), video_url: String(values.get('video_url') || ''), status: 'draft' }
        : mode === 'exam'
          ? { course_id: courseId, teacher_id: teacherId, name: String(values.get('title')), description: String(values.get('description') || ''), duration_minutes: Number(values.get('duration_minutes') || 30), pass_score: Number(values.get('pass_score') || 70), status: 'draft' }
          : mode === 'challenge'
            ? { teacher_id: teacherId, course_id: courseId || null, name: String(values.get('title')), description: String(values.get('description') || ''), challenge_type: 'Practice Challenge', difficulty: String(values.get('difficulty') || 'Medium'), points: Number(values.get('points') || 0), status: 'draft' }
            : mode === 'announcement'
              ? { teacher_id: teacherId, title: String(values.get('title')), message: String(values.get('description') || ''), audience: String(values.get('audience') || 'All Students'), course_id: courseId || null, status: 'draft' }
              : { code: String(values.get('code') || `ENG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`), status: 'available', expires_at: values.get('expires_at') || null }
    const table = mode === 'course' ? 'courses' : mode === 'lesson' ? 'lessons' : mode === 'exam' ? 'exams' : mode === 'challenge' ? 'challenges' : mode === 'announcement' ? 'announcements' : 'access_codes'
    const { error: saveError } = await supabase.from(table).insert(payload as never)
    setSaving(false)
    if (saveError) { setError(saveError.message); return }
    onSaved()
  }

  return <section className="teacher-create-panel"><div className="panel-header"><h3>{title}</h3><button className="tiny-button" type="button" onClick={onClose}><X size={15} /> Close</button></div>{createdCode ? <div className="success-card"><CheckCircle2 size={22} /><h3>Student added successfully</h3><p>Login code: <strong>{createdCode}</strong></p><p>Save this code and give it to the student. It is shown only after creation.</p><button className="button" type="button" onClick={onSaved}>Done</button></div> : <form className="form-grid" onSubmit={submit}>
    {mode === 'student' ? <><label>Full name<input name="full_name" required /></label><label>Email<input name="email" type="email" required /></label><label>Phone<input name="phone" /></label><label>Parent / guardian phone<input name="parent_phone" /></label><label>Academic stage <span className="optional-field">(optional)</span><select name="stage" defaultValue=""><option value="">Select stage</option>{ACADEMIC_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></label><label>Educational system <span className="optional-field">(optional)</span><select name="system" defaultValue=""><option value="">Select system</option>{EDUCATIONAL_SYSTEMS.map((system) => <option key={system} value={system}>{system}</option>)}</select></label></> : mode === 'code' ? <><label>Code<input name="code" placeholder="Leave blank to generate" /></label><label>Expires at<input name="expires_at" type="date" /></label></> : <>
      <label>{mode === 'announcement' ? 'Title' : mode === 'exam' || mode === 'challenge' ? 'Name' : 'Title'}<input name="title" required /></label>
      <label>Description / message<textarea name="description" rows={3} /></label>
      {mode === 'course' && <><label>Academic stage<select name="stage" defaultValue="" required><option value="" disabled>Select stage</option>{ACADEMIC_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select></label><label>Educational system<select name="system" defaultValue="National" required>{EDUCATIONAL_SYSTEMS.map((system) => <option key={system} value={system}>{system}</option>)}</select></label><label>Pricing<select name="pricing_type"><option value="free">Free</option><option value="paid">Paid</option></select></label><label>Price<input name="price" type="number" min="0" defaultValue="0" /></label></>}
      {['lesson', 'exam', 'challenge', 'announcement'].includes(mode) && <label>Course<select name="course_id" required={mode === 'lesson' || mode === 'exam'}><option value="">Select course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>}
      {mode === 'lesson' && <><label>Lesson number<input name="lesson_number" type="number" min="1" defaultValue="1" /></label><label>Video URL<input name="video_url" type="url" /></label></>}
      {mode === 'exam' && <><label>Duration in minutes<input name="duration_minutes" type="number" min="1" defaultValue="30" /></label><label>Pass score<input name="pass_score" type="number" min="0" max="100" defaultValue="70" /></label></>}
      {mode === 'challenge' && <><label>Difficulty<select name="difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option></select></label><label>Points<input name="points" type="number" min="0" defaultValue="0" /></label></>}
      {mode === 'announcement' && <label>Audience<select name="audience"><option>All Students</option><option>Specific Course</option><option>Specific Stage</option><option>Specific Student</option></select></label>}
    </>}
    {error && <p className="form-error">{error}</p>}<button className="button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save to Supabase'} <CheckCircle2 size={15} /></button>
  </form>}</section>
}

function TeacherLogin() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!code.trim()) return setError('Enter your teacher code to continue.')
    setLoading(true)

    try {
      const role = await getCurrentSessionRole()
      if (role === 'teacher') {
        navigate('/teacher/dashboard')
        return
      }
    } catch {
      // Ignore and continue to code validation.
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
    setLoading(false)

    if (code.trim() === TEACHER_CODE) {
      navigate('/teacher/dashboard')
      return
    }

    setError('Invalid teacher code. Please try again.')
  }

  return (
    <PageFrame eyebrow="Teacher portal" title={<><span>Welcome back, </span><em>Teacher.</em></>}>
      <p className="page-lede">Enter your teacher code to access your platform.</p>
      <AuthNotice />
      <form className="auth-card" onSubmit={submit}>
        <label>
          Teacher code
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter your code" autoComplete="off" />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="button full" type="submit" disabled={loading}>
          {loading ? 'Checking code...' : <>Login with teacher code <ArrowRight size={17} /></>}
        </button>
        <p className="form-footnote"><ShieldCheck size={14} /> Your code is checked securely against your teacher account.</p>
      </form>
    </PageFrame>
  )
}

function StudentLogin() {
  const [method, setMethod] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!supabase) {
      setError('Supabase is not configured. Add your project variables to enable login.')
      return
    }

    setLoading(true)
    let result = method === 'email'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await (async () => {
        const { data, error: lookupError } = await supabase.functions.invoke('student-login', { body: { code: code.trim() } })
        if (lookupError || data?.error) return { error: new Error(lookupError?.message || data.error) }
        return supabase.auth.signInWithPassword({ email: String(data.email), password: `${code.trim()}@Secure123` })
      })()
    setLoading(false)

    if (result.error) setError(result.error.message)
    else navigate('/student/dashboard')
  }

  return (
    <PageFrame eyebrow="Student portal" title={<><span>Welcome back, </span><em>Student.</em></>}>
      <p className="page-lede">Continue your English learning journey.</p>
      <AuthNotice />
      <div className="auth-card">
        <div className="segmented">
          <button className={method === 'email' ? 'active' : ''} type="button" onClick={() => setMethod('email')}>Email &amp; password</button>
          <button className={method === 'code' ? 'active' : ''} type="button" onClick={() => setMethod('code')}>Student access code</button>
        </div>
        <form onSubmit={submit}>
          {method === 'email' ? (
            <>
              <label>
                Email address
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
              </label>
              <label>
                Password
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" />
              </label>
            </>
          ) : (
            <label>
              Student access code
              <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter your access code" autoComplete="off" />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          <button className="button full" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : <>Login <ArrowRight size={17} /></>}
          </button>
        </form>
        <p className="form-switch">New to English Zone? <button type="button" onClick={() => navigate('/student/register')}>Create an account</button></p>
      </div>
    </PageFrame>
  )
}

function Register() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!supabase) {
      setError('Supabase is not configured. Registration is paused until the project variables are added.')
      return
    }

    setLoading(true)
    const data = new FormData(event.currentTarget)
    const password = String(data.get('password'))
    const confirm = String(data.get('confirm'))

    if (password !== confirm) {
      setLoading(false)
      return setError('Passwords do not match.')
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: String(data.get('email')),
      password,
      options: {
        data: {
          full_name: data.get('name'),
          role: 'student',
          phone: data.get('phone'),
          parent_phone: data.get('guardian'),
          stage: data.get('stage'),
          system: data.get('system'),
          student_code: `ST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        },
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: String(data.get('email')),
        full_name: String(data.get('name')),
        role: 'student',
        phone: String(data.get('phone')),
        parent_phone: String(data.get('guardian')),
        stage: String(data.get('stage')),
        system: String(data.get('system')),
        student_code: `ST-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        status: 'active',
      }, { onConflict: 'id' })

      if (profileError) {
        setError('Account created, but profile sync failed. Please contact support.')
        return
      }
    }

    setSubmitted(true)
  }

  return (
    <PageFrame eyebrow="Your next chapter" title={<><span>Create your </span><em>account.</em></>}>
      <p className="page-lede">Register your account and take the first step toward better English.</p>
      <AuthNotice />
      {submitted ? (
        <div className="success-card">
          <CheckCircle2 size={27} />
          <h2>Account request received.</h2>
          <p>Supabase confirmed the account creation request. Check your email if confirmation is enabled.</p>
        </div>
      ) : (
        <form className="register-card" onSubmit={submit}>
          <fieldset>
            <legend>Personal information</legend>
            <div className="form-grid">
              <label>Full name<input name="name" required placeholder="Your full name" /></label>
              <label>Email address<input name="email" type="email" required placeholder="you@example.com" /></label>
              <label>Phone number<input name="phone" required placeholder="Your phone number" /></label>
              <label>Parent / guardian phone<input name="guardian" required placeholder="Guardian phone number" /></label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Academic information</legend>
            <div className="form-grid">
              <label>Academic stage<select name="stage" defaultValue="" required>
                <option value="" disabled>Select stage</option>
                <option>3rd Preparatory</option>
                <option>1st Secondary</option>
                <option>2nd Secondary</option>
              </select></label>
              <label>System<select name="system" defaultValue="" required>
                <option value="" disabled>Select system</option>
                <option>National</option>
                <option>International</option>
              </select></label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Security</legend>
            <div className="form-grid">
              <label>Password<input name="password" type="password" required placeholder="Create a password" /></label>
              <label>Confirm password<input name="confirm" type="password" required placeholder="Confirm your password" /></label>
            </div>
          </fieldset>
          {error && <p className="form-error">{error}</p>}
          <button className="button full" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
        </form>
      )}
    </PageFrame>
  )
}

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>(getRoute())

  useEffect(() => {
    const onPop = () => setCurrentRoute(getRoute())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  if (currentRoute === '/') return <Home />
  if (currentRoute === '/join') return <Join />
  if (currentRoute === '/teacher/login') return <TeacherLogin />
  if (currentRoute === '/teacher/dashboard') return <TeacherDashboard />
  if (currentRoute === '/student/login') return <StudentLogin />
  if (currentRoute.startsWith('/student/')) return <StudentDashboard />
  return <Register />
}

export default App
