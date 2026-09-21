# English Zone Supabase Setup

## 1) Run schema.sql in Supabase SQL editor

This creates all core tables, enums, indexes, and RLS policies for:
- profiles
- courses
- lessons
- exams
- exam questions/options
- challenge system
- payments
- attendance
- announcements
- access codes
- notifications
- student progress

## 2) Run seed.sql

Populate seed data for the teacher and sample courses.

## 3) Auth triggers

Ensure the app uses Supabase Auth. You may also create a trigger that inserts a profile automatically after sign-up.

Example trigger:

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student'),
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

## 4) Notes

- Do not expose the service-role key in the frontend.
- Only use the anon key in the browser.
- This app is configured for real Supabase integration with secure backend-ready patterns.
