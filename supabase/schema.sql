create extension if not exists pgcrypto;

create type public.user_role as enum ('teacher', 'student');
create type public.account_status as enum ('active', 'suspended');
create type public.content_status as enum ('draft', 'published');
create type public.pricing_type as enum ('free', 'paid');
create type public.payment_status as enum ('pending', 'approved', 'rejected', 'refunded');
create type public.attendance_status as enum ('present', 'absent', 'late');

create or replace function public.is_teacher()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'teacher'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.user_role not null default 'student',
  phone text,
  parent_phone text,
  stage text,
  system text default 'National',
  student_code text unique,
  status public.account_status not null default 'active',
  payment_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id bigserial primary key,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  stage text not null,
  system text not null default 'National',
  pricing_type public.pricing_type not null default 'free',
  price numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  discount_percentage numeric(5,2) not null default 0,
  thumbnail_url text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id bigserial primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  lesson_number integer not null default 1,
  video_url text,
  thumbnail_url text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exams (
  id bigserial primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  lesson_id bigint references public.lessons(id) on delete set null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null default 30,
  pass_score integer not null default 70,
  available_from timestamptz,
  available_until timestamptz,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_questions (
  id bigserial primary key,
  exam_id bigint not null references public.exams(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'multiple_choice',
  required boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_options (
  id bigserial primary key,
  question_id bigint not null references public.exam_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.exam_attempts (
  id bigserial primary key,
  exam_id bigint not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null default 0,
  correct_answers integer not null default 0,
  wrong_answers integer not null default 0,
  percentage numeric(5,2) not null default 0,
  passed boolean not null default false,
  submitted_at timestamptz not null default now(),
  time_taken_seconds integer not null default 0
);

create table if not exists public.challenges (
  id bigserial primary key,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  course_id bigint references public.courses(id) on delete set null,
  lesson_id bigint references public.lessons(id) on delete set null,
  name text not null,
  description text,
  challenge_type text not null default 'Practice Challenge',
  difficulty text not null default 'Medium',
  points integer not null default 0,
  start_date timestamptz,
  end_date timestamptz,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.challenge_questions (
  id bigserial primary key,
  challenge_id bigint not null references public.challenges(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'multiple_choice',
  required boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.challenge_options (
  id bigserial primary key,
  question_id bigint not null references public.challenge_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_attempts (
  id bigserial primary key,
  challenge_id bigint not null references public.challenges(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null default 0,
  percentage numeric(5,2) not null default 0,
  points_earned integer not null default 0,
  completed boolean not null default false,
  submitted_at timestamptz not null default now()
);

create table if not exists public.grades (
  id bigserial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id bigint references public.courses(id) on delete set null,
  exam_id bigint references public.exams(id) on delete set null,
  challenge_id bigint references public.challenges(id) on delete set null,
  score numeric(5,2) not null default 0,
  max_score numeric(5,2) not null default 100,
  percentage numeric(5,2) not null default 0,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id bigserial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  attendance_date date not null,
  session_name text,
  status public.attendance_status not null default 'present',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id bigserial primary key,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  audience text not null default 'All Students',
  course_id bigint references public.courses(id) on delete set null,
  target_stage text,
  target_student_id uuid references public.profiles(id) on delete set null,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id bigserial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  amount numeric(10,2) not null default 0,
  payment_method text not null default 'Card',
  reference text not null,
  status public.payment_status not null default 'pending',
  approval_status text not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.access_codes (
  id bigserial primary key,
  code text not null unique,
  student_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'available' check (status in ('available', 'used', 'expired', 'disabled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  used_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.access_codes add column if not exists student_id uuid references public.profiles(id) on delete cascade;

create table if not exists public.notifications (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.student_progress (
  id bigserial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id bigint references public.courses(id) on delete set null,
  lesson_id bigint references public.lessons(id) on delete set null,
  completed boolean not null default false,
  xp integer not null default 0,
  total_points integer not null default 0,
  last_activity timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  ,unique(student_id, lesson_id)
);

create table if not exists public.student_qr_credentials (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now()
);

create table if not exists public.course_enrollments (
  id bigserial primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  payment_status text not null default 'pending',
  access_granted boolean not null default false,
  enrolled_at timestamptz not null default now(),
  unique(student_id, course_id)
);

alter table public.grades add column if not exists max_score numeric(5,2) not null default 100;
alter table public.grades add column if not exists notes text;
alter table public.courses add column if not exists discount_amount numeric(10,2) not null default 0;
alter table public.courses add column if not exists discount_percentage numeric(5,2) not null default 0;
alter table public.attendance_records add column if not exists session_name text;
alter table public.student_progress add column if not exists completed boolean not null default false;

create or replace trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create or replace trigger lessons_set_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

create or replace trigger exams_set_updated_at
before update on public.exams
for each row execute function public.set_updated_at();

create or replace trigger exam_questions_set_updated_at
before update on public.exam_questions
for each row execute function public.set_updated_at();

create or replace trigger challenges_set_updated_at
before update on public.challenges
for each row execute function public.set_updated_at();

create or replace trigger challenge_questions_set_updated_at
before update on public.challenge_questions
for each row execute function public.set_updated_at();

create or replace trigger attendance_records_set_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

create or replace trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create or replace trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

create or replace trigger access_codes_set_updated_at
before update on public.access_codes
for each row execute function public.set_updated_at();

create or replace trigger student_progress_set_updated_at
before update on public.student_progress
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_options enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_questions enable row level security;
alter table public.challenge_options enable row level security;
alter table public.challenge_attempts enable row level security;
alter table public.grades enable row level security;
alter table public.attendance_records enable row level security;
alter table public.announcements enable row level security;
alter table public.payments enable row level security;
alter table public.access_codes enable row level security;
alter table public.notifications enable row level security;
alter table public.student_progress enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.student_qr_credentials enable row level security;

create policy "Profiles view own or teacher"
on public.profiles for select
using (id = auth.uid() or public.is_teacher());

create policy "Profiles update own active or teacher"
on public.profiles for update
using (id = auth.uid() or public.is_teacher())
with check ((id = auth.uid() and role = 'student' and status = 'active') or public.is_teacher());

create policy "Profiles insert own student or teacher"
on public.profiles for insert
with check ((id = auth.uid() and role = 'student') or public.is_teacher());

drop policy if exists "Profiles update own or teacher" on public.profiles;
drop policy if exists "Profiles insert teacher only" on public.profiles;

create policy "Courses select authorized or teacher"
on public.courses for select
using (
  public.is_teacher()
  or teacher_id = auth.uid()
  or exists (
    select 1 from public.course_enrollments ce
    where ce.course_id = courses.id
      and ce.student_id = auth.uid()
      and ce.access_granted = true
  )
);

drop policy if exists "Courses select all published or teacher" on public.courses;

create policy "Courses manage teacher"
on public.courses for all
using (public.is_teacher() or teacher_id = auth.uid())
with check (public.is_teacher() or teacher_id = auth.uid());

create policy "Lessons select authorized or teacher"
on public.lessons for select
using (
  public.is_teacher()
  or exists (
    select 1 from public.course_enrollments ce
    where ce.course_id = lessons.course_id
      and ce.student_id = auth.uid()
      and ce.access_granted = true
  )
);

drop policy if exists "Lessons select all published or teacher" on public.lessons;

create policy "Lessons manage teacher"
on public.lessons for all
using (public.is_teacher())
with check (public.is_teacher());

create policy "Exams select authorized or teacher"
on public.exams for select
using (
  public.is_teacher()
  or exists (
    select 1 from public.course_enrollments ce
    where ce.course_id = exams.course_id
      and ce.student_id = auth.uid()
      and ce.access_granted = true
  )
);

drop policy if exists "Exams select published or teacher" on public.exams;

create policy "Exams manage teacher"
on public.exams for all
using (public.is_teacher())
with check (public.is_teacher());

create policy "Exam questions select published or teacher"
on public.exam_questions for select
using (public.is_teacher());

create policy "Exam questions manage teacher"
on public.exam_questions for all
using (public.is_teacher())
with check (public.is_teacher());

create policy "Exam options teacher only"
on public.exam_options for all
using (public.is_teacher())
with check (public.is_teacher());

create policy "Exam attempts student own or teacher"
on public.exam_attempts for select
using (student_id = auth.uid() or public.is_teacher());

create policy "Exam attempts student insert or teacher"
on public.exam_attempts for insert
with check (student_id = auth.uid() or public.is_teacher());

create policy "Challenges select published or teacher"
on public.challenges for select
using (status = 'published' or public.is_teacher());

create policy "Challenges manage teacher"
on public.challenges for all
using (public.is_teacher())
with check (public.is_teacher());

create policy "Challenge questions teacher only"
on public.challenge_questions for all
using (public.is_teacher())
with check (public.is_teacher());

create policy "Challenge options teacher only"
on public.challenge_options for all
using (public.is_teacher())
with check (public.is_teacher());

create policy "Challenge attempts student own or teacher"
on public.challenge_attempts for select
using (student_id = auth.uid() or public.is_teacher());

create policy "Challenge attempts insert for student"
on public.challenge_attempts for insert
with check (student_id = auth.uid() or public.is_teacher());

create policy "Grades teacher or own student"
on public.grades for select
using (student_id = auth.uid() or public.is_teacher());

create policy "Grades teacher manage"
on public.grades for all
using (public.is_teacher())
with check (public.is_teacher());

create policy "Attendance teacher or own"
on public.attendance_records for select
using (student_id = auth.uid() or public.is_teacher());

create policy "Attendance manage teacher"
on public.attendance_records for all
using (public.is_teacher())
with check (public.is_teacher());

create policy "Announcements targeted to student or teacher"
on public.announcements for select
using (
  public.is_teacher()
  or teacher_id = auth.uid()
  or (
    status = 'published'
    and (
      audience = 'All Students'
      or target_student_id = auth.uid()
      or target_stage = (select p.stage from public.profiles p where p.id = auth.uid())
      or exists (
        select 1 from public.course_enrollments ce
        where ce.student_id = auth.uid()
          and ce.access_granted = true
          and ce.course_id = announcements.course_id
      )
    )
  )
);

drop policy if exists "Announcements teacher or public" on public.announcements;

create policy "Announcements manage teacher"
on public.announcements for all
using (public.is_teacher() or teacher_id = auth.uid())
with check (public.is_teacher() or teacher_id = auth.uid());

create policy "Payments teacher or own student"
on public.payments for select
using (student_id = auth.uid() or public.is_teacher());

create policy "Payments insert student or teacher"
on public.payments for insert
with check (student_id = auth.uid() or public.is_teacher());

create policy "Payments update teacher"
on public.payments for update
using (public.is_teacher())
with check (public.is_teacher());

create policy "Access codes teacher only"
on public.access_codes for all
using (public.is_teacher())
with check (public.is_teacher());

create policy "Notifications own user or teacher"
on public.notifications for select
using (user_id = auth.uid() or public.is_teacher());

create policy "Notifications manage teacher"
on public.notifications for all
using (public.is_teacher())
with check (public.is_teacher());

create policy "Student progress own or teacher"
on public.student_progress for select
using (student_id = auth.uid() or public.is_teacher());

create policy "Student progress manage own or teacher"
on public.student_progress for all
using (student_id = auth.uid() or public.is_teacher())
with check (student_id = auth.uid() or public.is_teacher());

create policy "Student QR credential view own or teacher"
on public.student_qr_credentials for select
using (student_id = auth.uid() or public.is_teacher());

create policy "Student QR credential create own or teacher"
on public.student_qr_credentials for insert
with check (student_id = auth.uid() or public.is_teacher());

create policy "Student QR credential rotate teacher"
on public.student_qr_credentials for update
using (public.is_teacher())
with check (public.is_teacher());

create policy "Course enrollments own or teacher"
on public.course_enrollments for select
using (student_id = auth.uid() or public.is_teacher());

create policy "Course enrollments student request or teacher manage"
on public.course_enrollments for insert
with check (
  public.is_teacher()
  or (student_id = auth.uid() and access_granted = false)
);

create policy "Course enrollments teacher update"
on public.course_enrollments for update
using (public.is_teacher())
with check (public.is_teacher());

drop policy if exists "Course enrollments own or teacher update" on public.course_enrollments;

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_courses_teacher on public.courses(teacher_id);
create index if not exists idx_lessons_course on public.lessons(course_id);
create index if not exists idx_exams_course on public.exams(course_id);
create index if not exists idx_challenges_course on public.challenges(course_id);
create index if not exists idx_payments_student on public.payments(student_id);
create index if not exists idx_announcements_status on public.announcements(status);
create index if not exists idx_access_codes_code on public.access_codes(code);
create index if not exists idx_notifications_user on public.notifications(user_id);
