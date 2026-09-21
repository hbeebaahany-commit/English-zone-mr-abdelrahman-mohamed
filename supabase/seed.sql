insert into public.profiles (id, email, full_name, role, phone, parent_phone, stage, system, student_code, status, payment_status)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'teacher@englishzone.com',
    'Mr Abdelrahman Mohamed',
    'teacher',
    '+966500000000',
    null,
    'Teacher',
    'National',
    null,
    'active',
    'pending'
  )
on conflict (id) do nothing;

insert into public.courses (teacher_id, title, description, stage, system, pricing_type, price, status)
values
  ('11111111-1111-4111-8111-111111111111', 'English Grammar', 'Build strong grammar foundations with guided lessons and practical examples.', '3rd Preparatory', 'National', 'paid', 250, 'published'),
  ('11111111-1111-4111-8111-111111111111', 'Conversation Skills', 'Improve fluency and confidence with everyday speaking tasks.', '1st Secondary', 'International', 'free', 0, 'published'),
  ('11111111-1111-4111-8111-111111111111', 'Vocabulary Mastery', 'Expand useful words and academic expressions through context and practice.', '2nd Secondary', 'National', 'paid', 320, 'published')
on conflict do nothing;

insert into public.lessons (course_id, title, description, lesson_number, video_url, status)
values
  (1, 'Parts of Speech', 'Learn how nouns, verbs, pronouns, adjectives and adverbs work together.', 1, 'https://example.com/lesson/parts-of-speech', 'published'),
  (1, 'Types of Sentences', 'Differentiate statements, questions, commands and exclamations.', 2, 'https://example.com/lesson/types-of-sentences', 'published'),
  (2, 'Daily Conversation', 'Practice key phrases for real-world situations.', 1, 'https://example.com/lesson/daily-conversation', 'published')
on conflict do nothing;

insert into public.exams (course_id, lesson_id, teacher_id, name, description, duration_minutes, pass_score, status)
values
  (1, 1, '11111111-1111-4111-8111-111111111111', 'Grammar Diagnostic Test', 'Quick diagnostic for grammar accuracy and sentence structure.', 40, 70, 'published'),
  (2, 3, '11111111-1111-4111-8111-111111111111', 'Speaking Confidence Check', 'Read, respond, and evaluate communication skills.', 25, 60, 'draft')
on conflict do nothing;

insert into public.challenges (teacher_id, course_id, lesson_id, name, description, challenge_type, difficulty, points, status)
values
  ('11111111-1111-4111-8111-111111111111', 3, null, 'Daily Vocabulary Sprint', 'Vocabulary challenge for active learning.', 'Vocabulary Challenge', 'Easy', 120, 'published'),
  ('11111111-1111-4111-8111-111111111111', 1, 2, 'Grammar Focus Quiz', 'Grammar challenge for sentence mastery.', 'Grammar Challenge', 'Medium', 180, 'published')
on conflict do nothing;

insert into public.access_codes (code, status, expires_at)
values
  ('ENG-1001', 'available', now() + interval '30 days'),
  ('ENG-1002', 'used', now() + interval '30 days'),
  ('ENG-1003', 'expired', now() - interval '1 day')
on conflict (code) do nothing;
