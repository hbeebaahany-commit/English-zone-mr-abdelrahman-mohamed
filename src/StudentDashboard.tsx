import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowRight, Award, BarChart3, Bell, BookOpen, CalendarCheck2, CheckCircle2, Download,
  CircleDollarSign, FileText, GraduationCap, LayoutDashboard, LogOut, Menu,
  Megaphone, NotebookPen, PencilLine, Phone, Settings, ShieldCheck, UserRound,
  WalletCards, X,
} from 'lucide-react'
import { supabase } from './lib/supabase'

type StudentSection = 'dashboard' | 'courses' | 'lessons' | 'exams' | 'grades' | 'attendance' | 'announcements' | 'payments' | 'id-card' | 'profile' | 'settings'
type Profile = { id: string; email: string; full_name: string; phone: string | null; parent_phone: string | null; stage: string | null; system: string | null; student_code: string | null; status: string }
type Course = { id: number; title: string; description: string | null; stage: string; system: string; pricing_type: string; price: number; discount_amount: number; discount_percentage: number; thumbnail_url: string | null; status: string }
type Lesson = { id: number; course_id: number; title: string; description: string | null; lesson_number: number; video_url: string | null }
type Enrollment = { course_id: number; payment_status: string; access_granted: boolean }
type Progress = { lesson_id: number | null; course_id: number | null; last_activity: string; completed?: boolean }
type Exam = { id: number; course_id: number; name: string; description: string | null; available_from: string | null; available_until: string | null }
type Relation<T> = T | T[] | null
type Grade = { id: number; course_id: number | null; exam_id: number | null; score: number; max_score: number; percentage: number; notes: string | null; status: string; created_at: string; exam?: Relation<{ name: string }>; course?: Relation<{ title: string }> }
type Attendance = { id: number; course_id: number; attendance_date: string; session_name: string | null; status: string; notes: string | null; created_at: string; course?: Relation<{ title: string }> }
type Announcement = { id: number; title: string; message: string; created_at: string; course_id: number | null; course?: Relation<{ title: string }> }
type Payment = { id: number; course_id: number; amount: number; payment_method: string; status: string; approval_status: string; created_at: string; course?: Relation<{ title: string }> }
type Notification = { id: number; title: string; message: string; type: string; is_read: boolean; created_at: string }

const sectionLabels: Record<StudentSection, string> = {
  dashboard: 'Dashboard', courses: 'My Courses', lessons: 'Lessons', exams: 'Exams', grades: 'Grades', attendance: 'Attendance', announcements: 'Announcements', payments: 'Payments', 'id-card': 'Student ID Card', profile: 'Profile', settings: 'Settings',
}

const sectionIcons: Record<StudentSection, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard, courses: BookOpen, lessons: NotebookPen, exams: FileText, grades: BarChart3, attendance: CalendarCheck2, announcements: Megaphone, payments: CircleDollarSign, 'id-card': Award, profile: UserRound, settings: Settings,
}

const sectionFromPath = (): StudentSection => {
  const value = window.location.pathname.split('/').filter(Boolean).pop() as StudentSection | undefined
  return value && value in sectionLabels ? value : 'dashboard'
}

const formatDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value)) : 'Not available'
const money = (value: number) => `${value.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR`
const statusClass = (value: string) => value.toLowerCase().replace(/ /g, '-')
const relationTitle = (relation: Relation<{ title: string }> | undefined) => Array.isArray(relation) ? relation[0]?.title : relation?.title
const relationName = (relation: Relation<{ name: string }> | undefined) => Array.isArray(relation) ? relation[0]?.name : relation?.name

function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return <div className="student-empty"><BookOpen size={24} /><p>{title}</p>{action}</div>
}

function StudentDashboard() {
  const [section, setSection] = useState<StudentSection>(sectionFromPath())
  const [profile, setProfile] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [progress, setProgress] = useState<Progress[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [qrToken, setQrToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')

  const load = async () => {
    if (!supabase) { setError('Supabase is not configured. Add the project variables to load your student data.'); setLoading(false); return }
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user
    if (!user) { window.history.replaceState({}, '', '/student/login'); window.dispatchEvent(new PopStateEvent('popstate')); return }
    const studentId = user.id
    const [profileResult, enrollmentResult, progressResult, gradeResult, attendanceResult, announcementResult, paymentResult, notificationResult, qrResult] = await Promise.all([
      supabase.from('profiles').select('id,email,full_name,phone,parent_phone,stage,system,student_code,status').eq('id', studentId).single(),
      supabase.from('course_enrollments').select('course_id,payment_status,access_granted').eq('student_id', studentId),
      supabase.from('student_progress').select('lesson_id,course_id,last_activity,completed').eq('student_id', studentId).order('last_activity', { ascending: false }),
      supabase.from('grades').select('id,course_id,exam_id,score,max_score,percentage,notes,status,created_at,exam:exams(name),course:courses(title)').eq('student_id', studentId).eq('status', 'released').order('created_at', { ascending: false }),
      supabase.from('attendance_records').select('id,course_id,attendance_date,session_name,status,notes,created_at,course:courses(title)').eq('student_id', studentId).order('attendance_date', { ascending: false }),
      supabase.from('announcements').select('id,title,message,created_at,course_id,course:courses(title)').eq('status', 'published').order('created_at', { ascending: false }),
      supabase.from('payments').select('id,course_id,amount,payment_method,status,approval_status,created_at,course:courses(title)').eq('student_id', studentId).order('created_at', { ascending: false }),
      supabase.from('notifications').select('id,title,message,type,is_read,created_at').eq('user_id', studentId).order('created_at', { ascending: false }),
      supabase.from('student_qr_credentials').select('token').eq('student_id', studentId).maybeSingle(),
    ])
    if (profileResult.error) { setError(profileResult.error.message); setLoading(false); return }
    const nextEnrollments = (enrollmentResult.data ?? []) as Enrollment[]
    const authorizedIds = nextEnrollments.filter((item) => item.access_granted).map((item) => item.course_id)
    const [courseResult, lessonResult, examResult] = await Promise.all([
      authorizedIds.length ? supabase.from('courses').select('id,title,description,stage,system,pricing_type,price,discount_amount,discount_percentage,thumbnail_url,status').in('id', authorizedIds).eq('status', 'published') : Promise.resolve({ data: [], error: null }),
      authorizedIds.length ? supabase.from('lessons').select('id,course_id,title,description,lesson_number,video_url').in('course_id', authorizedIds).eq('status', 'published').order('lesson_number') : Promise.resolve({ data: [], error: null }),
      authorizedIds.length ? supabase.from('exams').select('id,course_id,name,description,available_from,available_until').in('course_id', authorizedIds).eq('status', 'published').order('available_from') : Promise.resolve({ data: [], error: null }),
    ])
    setProfile(profileResult.data as Profile)
    setEnrollments(nextEnrollments)
    setCourses((courseResult.data ?? []) as Course[])
    setLessons((lessonResult.data ?? []) as Lesson[])
    setExams((examResult.data ?? []) as Exam[])
    setProgress((progressResult.data ?? []) as Progress[])
    setGrades((gradeResult.data ?? []) as Grade[])
    setAttendance((attendanceResult.data ?? []) as Attendance[])
    setAnnouncements((announcementResult.data ?? []) as Announcement[])
    setPayments((paymentResult.data ?? []) as Payment[])
    setNotifications((notificationResult.data ?? []) as Notification[])
    let token = (qrResult.data as { token?: string } | null)?.token ?? null
    if (!token) {
      const generatedToken = crypto.randomUUID()
      const { data: createdCredential } = await supabase.from('student_qr_credentials').insert({ student_id: studentId, token: generatedToken }).select('token').single()
      token = (createdCredential as { token?: string } | null)?.token ?? null
    }
    setQrToken(token)
    setLoading(false)
  }

  useEffect(() => { void load(); const onPop = () => setSection(sectionFromPath()); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop) }, [])

  const navigateStudent = (next: StudentSection) => { window.history.pushState({}, '', `/student/${next}`); setSection(next); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const authorizedCourseIds = useMemo(() => new Set(enrollments.filter((item) => item.access_granted).map((item) => item.course_id)), [enrollments])
  const completedLessonIds = useMemo(() => new Set(progress.filter((item) => item.completed !== false && item.lesson_id).map((item) => item.lesson_id as number)), [progress])
  const unreadCount = notifications.filter((item) => !item.is_read).length
  const attendanceStats = { total: attendance.length, present: attendance.filter((item) => item.status === 'present').length, absent: attendance.filter((item) => item.status === 'absent').length, excused: attendance.filter((item) => item.status === 'excused' || item.status === 'late').length }
  const attendanceRate = attendanceStats.total ? Math.round((attendanceStats.present / attendanceStats.total) * 100) : 0
  const overallProgress = lessons.length ? Math.round((completedLessonIds.size / lessons.length) * 100) : 0
  const activeCourse = courses.find((course) => progress.some((item) => item.course_id === course.id)) ?? courses[0]

  const markCompleted = async (lesson: Lesson) => {
    if (!supabase || !profile) return
    const { error: saveError } = await supabase.from('student_progress').upsert({ student_id: profile.id, course_id: lesson.course_id, lesson_id: lesson.id, completed: true, last_activity: new Date().toISOString() }, { onConflict: 'student_id,lesson_id' })
    if (!saveError) { setProgress((items) => [...items.filter((item) => item.lesson_id !== lesson.id), { lesson_id: lesson.id, course_id: lesson.course_id, last_activity: new Date().toISOString(), completed: true }]) }
  }

  const markNotificationRead = async (notification: Notification) => {
    if (!supabase || notification.is_read) return
    await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id).eq('user_id', profile?.id ?? '')
    setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, is_read: true } : item))
  }

  const logout = async () => { await supabase?.auth.signOut(); window.history.replaceState({}, '', '/student/login'); window.dispatchEvent(new PopStateEvent('popstate')) }
  const updateProfile = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!supabase || !profile) return; const data = new FormData(event.currentTarget); const { error: updateError } = await supabase.from('profiles').update({ full_name: data.get('full_name'), phone: data.get('phone') }).eq('id', profile.id); setSettingsMessage(updateError ? updateError.message : 'Profile updated successfully.'); if (!updateError) setProfile({ ...profile, full_name: String(data.get('full_name')), phone: String(data.get('phone')) }) }
  const changePassword = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!supabase) return; const password = String(new FormData(event.currentTarget).get('password')); const { error: passwordError } = await supabase.auth.updateUser({ password }); setSettingsMessage(passwordError ? passwordError.message : 'Password updated successfully.'); if (!passwordError) event.currentTarget.reset() }

  if (loading) return <div className="student-loading"><BookOpen size={25} /><p>Loading your learning space...</p></div>
  return <div className="student-shell">
    <aside className={mobileOpen ? 'student-sidebar open' : 'student-sidebar'}>
      <div className="student-brand"><span className="brand-mark"><BookOpen size={18} /></span><span><strong>ENGLISH ZONE</strong><small>with Mr Abdelrahman</small></span><button className="student-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <div className="student-profile-mini"><span className="student-avatar">{profile?.full_name.charAt(0).toUpperCase()}</span><span><b>{profile?.full_name}</b><small>Student account</small></span></div>
      <nav className="student-nav">{(Object.keys(sectionLabels) as StudentSection[]).map((item) => { const Icon = sectionIcons[item]; return <button key={item} className={section === item ? 'active' : ''} onClick={() => navigateStudent(item)}><Icon size={17} /><span>{sectionLabels[item]}</span></button> })}</nav>
      <button className="student-logout" onClick={() => void logout()}><LogOut size={17} /> Logout</button>
    </aside>
    {mobileOpen && <button className="student-overlay" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <main className="student-main">
      <header className="student-topbar"><button className="student-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div><p className="student-breadcrumb">Student portal / {sectionLabels[section]}</p><h1>{section === 'dashboard' ? `Welcome back, ${profile?.full_name}!` : sectionLabels[section]}</h1></div><div className="student-top-actions"><button className="notification-button" onClick={() => navigateStudent('announcements')} aria-label="Notifications"><Bell size={18} />{unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}</button><span className="student-top-avatar">{profile?.full_name.charAt(0).toUpperCase()}</span></div></header>
      {error && <div className="config-notice"><ShieldCheck size={17} /><span>{error}</span></div>}
      {section === 'dashboard' && <DashboardOverview profile={profile} courses={courses} lessons={lessons} activeCourse={activeCourse} overallProgress={overallProgress} attendanceRate={attendanceRate} upcomingExams={exams.filter((exam) => !exam.available_until || new Date(exam.available_until) > new Date()).length} onNavigate={navigateStudent} />}
      {section === 'courses' && <CoursesView courses={courses} enrollments={enrollments} progress={progress} lessons={lessons} onNavigate={navigateStudent} />}
      {section === 'lessons' && <LessonsView courses={courses} lessons={lessons} completedLessonIds={completedLessonIds} onComplete={(lesson) => void markCompleted(lesson)} />}
      {section === 'exams' && <ExamsView exams={exams} courses={courses} />}
      {section === 'grades' && <GradesView grades={grades} />}
      {section === 'attendance' && <AttendanceView attendance={attendance} stats={attendanceStats} rate={attendanceRate} />}
      {section === 'announcements' && <AnnouncementsView announcements={announcements} notifications={notifications} onRead={(item) => void markNotificationRead(item)} />}
      {section === 'payments' && <PaymentsView payments={payments} />}
      {section === 'id-card' && <IdCardView profile={profile} qrToken={qrToken} />}
      {section === 'profile' && <ProfileView profile={profile} onSubmit={updateProfile} message={settingsMessage} />}
      {section === 'settings' && <SettingsView onPasswordSubmit={changePassword} message={settingsMessage} onLogout={() => void logout()} />}
    </main>
  </div>
}

function DashboardOverview({ profile, courses, lessons, activeCourse, overallProgress, attendanceRate, upcomingExams, onNavigate }: { profile: Profile | null; courses: Course[]; lessons: Lesson[]; activeCourse?: Course; overallProgress: number; attendanceRate: number; upcomingExams: number; onNavigate: (section: StudentSection) => void }) {
  const stats = [{ label: 'My Courses', value: courses.length, icon: BookOpen }, { label: 'Learning Progress', value: `${overallProgress}%`, icon: BarChart3 }, { label: 'Upcoming Exams', value: upcomingExams, icon: FileText }, { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: CalendarCheck2 }]
  return <><section className="student-intro"><p className="eyebrow"><span /> Keep learning, keep growing</p><p>Keep learning, keep practicing, and keep improving your English.</p></section><section className="student-stats">{stats.map(({ label, value, icon: Icon }) => <article className="student-stat" key={label}><span className="student-stat-icon"><Icon size={19} /></span><small>{label}</small><strong>{value}</strong></article>)}</section><section className="student-section-head"><div><p className="eyebrow">Your next step</p><h2>Continue Learning</h2></div><button className="link-button" onClick={() => onNavigate('courses')}>View courses <ArrowRight size={15} /></button></section>{activeCourse ? <article className="continue-card"><div className="course-cover" style={activeCourse.thumbnail_url ? { backgroundImage: `url(${activeCourse.thumbnail_url})` } : undefined}><GraduationCap size={34} /></div><div className="continue-content"><span className="card-tag">{activeCourse.stage}</span><h3>{activeCourse.title}</h3><p>{activeCourse.description || 'Keep building your English skills with focused practice.'}</p><div className="progress-line"><span style={{ width: `${overallProgress}%` }} /></div><div className="progress-meta"><span>{overallProgress}% complete</span><span>{lessons.filter((lesson) => lesson.course_id === activeCourse.id).length} lessons</span></div><button className="button small" onClick={() => onNavigate('lessons')}>Continue learning <ArrowRight size={15} /></button></div></article> : <EmptyState title="You haven't enrolled in any courses yet." action={<button className="button small" onClick={() => onNavigate('courses')}>Explore courses</button>} />}</>
}

function CoursesView({ courses, enrollments, progress, lessons, onNavigate }: { courses: Course[]; enrollments: Enrollment[]; progress: Progress[]; lessons: Lesson[]; onNavigate: (section: StudentSection) => void }) { return <section className="student-content"><div className="student-section-head"><div><p className="eyebrow">Your learning library</p><h2>My Courses</h2></div></div>{courses.length ? <div className="student-course-grid">{courses.map((course) => { const enrollment = enrollments.find((item) => item.course_id === course.id); const total = lessons.filter((item) => item.course_id === course.id).length; const done = progress.filter((item) => item.course_id === course.id && item.completed).length; const finalPrice = Math.max(0, Number(course.price) - Number(course.discount_amount || 0)); return <article className="student-course-card" key={course.id}><div className="course-cover" style={course.thumbnail_url ? { backgroundImage: `url(${course.thumbnail_url})` } : undefined}><BookOpen size={30} /></div><div className="course-card-body"><div className="course-card-heading"><span className="card-tag">{course.pricing_type === 'paid' ? money(finalPrice) : 'Free'}</span><span className={`status-badge ${statusClass(enrollment?.access_granted ? 'Active' : enrollment?.payment_status || 'Pending')}`}>{enrollment?.access_granted ? 'Active' : enrollment?.payment_status || 'Pending'}</span></div><h3>{course.title}</h3><p>{course.description || 'No course description yet.'}</p><div className="meta-row"><span>{course.stage}</span><span>{course.system}</span><span>{done}/{total} lessons</span></div><button className="button small" onClick={() => onNavigate('lessons')}>Open course <ArrowRight size={14} /></button></div></article> })}</div> : <EmptyState title="You haven't enrolled in any courses yet." />}</section> }

function LessonsView({ courses, lessons, completedLessonIds, onComplete }: { courses: Course[]; lessons: Lesson[]; completedLessonIds: Set<number>; onComplete: (lesson: Lesson) => void }) { return <section className="student-content"><div className="student-section-head"><div><p className="eyebrow">Learn at your pace</p><h2>Lessons</h2></div></div>{lessons.length ? <div className="lesson-list">{lessons.map((lesson) => <article className="lesson-row" key={lesson.id}><span className="lesson-number">{String(lesson.lesson_number).padStart(2, '0')}</span><div><span className="card-tag">{courses.find((course) => course.id === lesson.course_id)?.title || 'Course'}</span><h3>{lesson.title}</h3><p>{lesson.description || 'Lesson content is ready when you are.'}</p></div><div className="lesson-actions">{completedLessonIds.has(lesson.id) ? <span className="status-badge success"><CheckCircle2 size={13} /> Completed</span> : <button className="button small" onClick={() => onComplete(lesson)}>Mark as completed</button>}{lesson.video_url && <a className="tiny-button" href={lesson.video_url} target="_blank" rel="noreferrer">Open lesson</a>}</div></article>)}</div> : <EmptyState title="No lessons are available for your enrolled courses yet." />}</section> }

function ExamsView({ exams, courses }: { exams: Exam[]; courses: Course[] }) { return <section className="student-content"><div className="student-section-head"><div><p className="eyebrow">Check your progress</p><h2>Exams</h2></div></div>{exams.length ? <div className="student-list">{exams.map((exam) => <article className="info-card student-list-card" key={exam.id}><div><span className="card-tag">{courses.find((course) => course.id === exam.course_id)?.title || 'Course'}</span><h3>{exam.name}</h3><p>{exam.description || 'Exam details will appear here.'}</p></div><div className="meta-row"><span>{exam.available_from ? formatDate(exam.available_from) : 'Available now'}</span><span className={`status-badge ${statusClass(exam.available_until && new Date(exam.available_until) < new Date() ? 'Closed' : 'Available')}`}>{exam.available_until && new Date(exam.available_until) < new Date() ? 'Closed' : 'Available'}</span></div></article>)}</div> : <EmptyState title="No exams are available for your enrolled courses yet." />}</section> }

function GradesView({ grades }: { grades: Grade[] }) { const average = grades.length ? Math.round(grades.reduce((sum, grade) => sum + Number(grade.percentage || (Number(grade.score) / Number(grade.max_score || 100)) * 100), 0) / grades.length) : 0; return <section className="student-content"><div className="student-section-head"><div><p className="eyebrow">Your results</p><h2>Grades</h2></div></div>{grades.length ? <><div className="grade-summary"><div className="summary-pill"><strong>{average}%</strong><span>Overall average</span></div><div className="summary-pill"><strong>{grades.length}</strong><span>Released results</span></div></div><div className="table-wrap student-table"><table><thead><tr><th>Course</th><th>Exam</th><th>Grade</th><th>Percentage</th><th>Notes</th><th>Date</th></tr></thead><tbody>{grades.map((grade) => <tr key={grade.id}><td>{relationTitle(grade.course) || 'Course'}</td><td>{relationName(grade.exam) || 'Exam'}</td><td>{grade.score} / {grade.max_score}</td><td>{Number(grade.percentage || (Number(grade.score) / Number(grade.max_score || 100)) * 100).toFixed(1)}%</td><td>{grade.notes || '—'}</td><td>{formatDate(grade.created_at)}</td></tr>)}</tbody></table></div></> : <EmptyState title="Released grades will appear here when your teacher publishes them." />}</section> }

function AttendanceView({ attendance, stats, rate }: { attendance: Attendance[]; stats: { total: number; present: number; absent: number; excused: number }; rate: number }) { return <section className="student-content"><div className="student-section-head"><div><p className="eyebrow">Show up and grow</p><h2>Attendance</h2></div></div><div className="grade-summary"><div className="summary-pill"><strong>{rate}%</strong><span>Attendance rate</span></div><div className="summary-pill"><strong>{stats.total}</strong><span>Total sessions</span></div><div className="summary-pill"><strong>{stats.present}</strong><span>Present sessions</span></div><div className="summary-pill"><strong>{stats.absent}</strong><span>Absent sessions</span></div><div className="summary-pill"><strong>{stats.excused}</strong><span>Excused sessions</span></div></div>{attendance.length ? <div className="student-list">{attendance.map((item) => <article className="attendance-row" key={item.id}><div><b>{relationTitle(item.course) || 'Course'}</b><small>{item.session_name || 'Learning session'} · {formatDate(item.attendance_date)}</small></div><span className={`status-badge ${statusClass(item.status)}`}>{item.status}</span><small>{item.notes || 'No notes'}</small><small>Recorded {formatDate(item.created_at)}</small></article>)}</div> : <EmptyState title="No attendance records have been recorded yet." />}</section> }

function AnnouncementsView({ announcements, notifications, onRead }: { announcements: Announcement[]; notifications: Notification[]; onRead: (notification: Notification) => void }) { return <section className="student-content"><div className="student-section-head"><div><p className="eyebrow">Stay in the loop</p><h2>Announcements</h2></div></div>{notifications.length || announcements.length ? <div className="student-list">{[...notifications.map((item) => ({ ...item, source: 'notification' as const })), ...announcements.map((item) => ({ ...item, source: 'announcement' as const }))].map((item) => <article className={!('is_read' in item) || item.is_read ? 'info-card student-list-card' : 'info-card student-list-card unread'} key={`${item.source}-${item.id}`}><div><span className="card-tag">{'source' in item && item.source === 'notification' ? 'Notification' : 'Announcement'}</span><h3>{item.title}</h3><p>{'message' in item ? item.message : ''}</p></div><div className="meta-row"><span>{formatDate(item.created_at)}</span>{'is_read' in item && !item.is_read && <button className="link-button" onClick={() => onRead(item as Notification)}>Mark as read</button>}</div></article>)}</div> : <EmptyState title="No announcements yet." />}</section> }

function PaymentsView({ payments }: { payments: Payment[] }) { return <section className="student-content"><div className="student-section-head"><div><p className="eyebrow">Your records</p><h2>Payments</h2></div></div>{payments.length ? <div className="student-list">{payments.map((payment) => <article className="info-card student-list-card" key={payment.id}><div><span className="card-tag">{relationTitle(payment.course) || 'Course'}</span><h3>{money(Number(payment.amount))}</h3><p>{payment.payment_method} · {formatDate(payment.created_at)}</p></div><span className={`status-badge ${statusClass(payment.status)}`}>{payment.status}</span></article>)}</div> : <EmptyState title="No payment history is available yet." />}</section> }

function IdCardView({ profile, qrToken }: { profile: Profile | null; qrToken: string | null }) { const qrData = qrToken ? `${window.location.origin}/attendance/verify/${qrToken}` : ''; const downloadCard = () => { const card = document.querySelector('.id-card'); if (!card) return; const blob = new Blob([`<!doctype html><html><head><meta charset="UTF-8"><title>English Zone Student ID</title><style>body{font-family:Arial,sans-serif;padding:30px}.id-card{max-width:730px;padding:27px;color:white;background:#8F2148}.id-card-top,.id-card-footer{display:flex;justify-content:space-between}.id-card-body{display:grid;grid-template-columns:75px 1fr 130px;align-items:center;gap:20px;padding:35px 0}.id-avatar{width:75px;height:75px;display:grid;place-items:center;background:white;color:#8F2148;border-radius:50%;font-size:30px;font-weight:bold}.student-qr{width:120px;height:120px;padding:5px;background:white}.id-card p{color:#f3dfe5;font-size:11px}.id-card-footer{border-top:1px solid #ffffff55;padding-top:17px;font-size:10px}</style></head><body>${card.outerHTML}</body></html>`], { type: 'text/html' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${profile?.student_code || 'english-zone-student-id'}.html`; link.click(); URL.revokeObjectURL(link.href) }; return <section className="student-content"><div className="student-section-head"><div><p className="eyebrow">Your verified identity</p><h2>Student ID Card</h2></div><div className="id-actions"><button className="button small" onClick={downloadCard}><Download size={14} /> Download card</button><button className="button small" onClick={() => window.print()}>Print card</button></div></div><article className="id-card"><div className="id-card-top"><div><span className="id-kicker">ENGLISH ZONE</span><h3>Student ID</h3></div><ShieldCheck size={27} /></div><div className="id-card-body"><div className="id-avatar">{profile?.full_name.charAt(0).toUpperCase()}</div><div><h4>{profile?.full_name}</h4><p>{profile?.student_code || 'Student ID not assigned'}</p><p>{profile?.stage || 'Stage not set'} · {profile?.system || 'System not set'}</p><p>{profile?.phone || 'Phone not provided'}</p></div>{qrData ? <img className="student-qr" src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrData)}`} alt="Student attendance QR code" /> : <div className="qr-placeholder">QR pending</div>}</div><div className="id-card-footer"><span>Account status: {profile?.status || 'Unknown'}</span><span>For attendance verification</span></div></article><p className="id-note">Your QR code contains only a secure verification token. It never exposes grades, payments, passwords, or guardian information.</p></section> }

function ProfileView({ profile, onSubmit, message }: { profile: Profile | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void; message: string }) { return <section className="student-content"><div className="student-section-head"><div><p className="eyebrow">Your details</p><h2>Profile</h2></div></div><form className="settings-card profile-form" onSubmit={onSubmit}><label>Full name<input name="full_name" defaultValue={profile?.full_name} required /></label><label>Email<input value={profile?.email || ''} readOnly /></label><label>Phone number<input name="phone" defaultValue={profile?.phone || ''} /></label><label>Parent / guardian phone<input value={profile?.parent_phone || ''} readOnly /></label><label>Academic stage<input value={profile?.stage || 'Not set'} readOnly /></label><label>Educational system<input value={profile?.system || 'Not set'} readOnly /></label><label>Student ID<input value={profile?.student_code || 'Not assigned'} readOnly /></label>{message && <p className="form-success">{message}</p>}<button className="button" type="submit">Save profile <CheckCircle2 size={15} /></button></form></section> }

function SettingsView({ onPasswordSubmit, message, onLogout }: { onPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void; message: string; onLogout: () => void }) { return <section className="student-content"><div className="student-section-head"><div><p className="eyebrow">Account controls</p><h2>Settings</h2></div></div><div className="settings-grid student-settings"><form className="settings-card" onSubmit={onPasswordSubmit}><h4>Change password</h4><label>New password<input name="password" type="password" minLength={8} required placeholder="At least 8 characters" /></label><button className="button small" type="submit">Update password</button></form><div className="settings-card"><h4>Notifications</h4><p className="settings-copy">Your notification preferences are managed securely with your Supabase account.</p><button className="button small" type="button" onClick={onLogout}><LogOut size={15} /> Logout</button></div></div>{message && <p className="form-success">{message}</p>}</section> }

export default StudentDashboard