
-- Colleges (publicly readable)
CREATE TABLE public.colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  aishe_code TEXT,
  state TEXT,
  district TEXT,
  city TEXT,
  institution_type TEXT,
  university_affiliation TEXT,
  source TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX colleges_name_idx ON public.colleges USING gin (to_tsvector('simple', name));
CREATE INDEX colleges_state_idx ON public.colleges (state);
CREATE INDEX colleges_type_idx ON public.colleges (institution_type);
GRANT SELECT ON public.colleges TO anon, authenticated;
GRANT ALL ON public.colleges TO service_role;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Colleges are publicly readable" ON public.colleges FOR SELECT USING (true);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  college_id UUID REFERENCES public.colleges(id),
  college_name TEXT,
  degree TEXT,
  department TEXT,
  semester INT,
  preferred_language TEXT DEFAULT 'English',
  learning_goal TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  accent_color TEXT DEFAULT 'indigo',
  theme TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Chats
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chats_user_idx ON public.chats (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO authenticated;
GRANT ALL ON public.chats TO service_role;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own chats" ON public.chats FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER chats_touch BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_chat_idx ON public.messages (chat_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own messages" ON public.messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Uploads
CREATE TABLE public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX uploads_user_idx ON public.uploads (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploads TO authenticated;
GRANT ALL ON public.uploads TO service_role;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own uploads" ON public.uploads FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Study progress
CREATE TABLE public.study_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT current_date,
  study_minutes INT NOT NULL DEFAULT 0,
  chats_count INT NOT NULL DEFAULT 0,
  quizzes_completed INT NOT NULL DEFAULT 0,
  notes_generated INT NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_progress TO authenticated;
GRANT ALL ON public.study_progress TO service_role;
ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own progress" ON public.study_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Subjects
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  semester INT,
  progress_percent INT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own subjects" ON public.subjects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Study planner tasks
CREATE TABLE public.planner_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  topic TEXT NOT NULL,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX planner_user_idx ON public.planner_tasks (user_id, due_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_tasks TO authenticated;
GRANT ALL ON public.planner_tasks TO service_role;
ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own planner" ON public.planner_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed sample colleges (sample data — production list can be imported from AISHE/UGC/AICTE)
INSERT INTO public.colleges (name, state, district, city, institution_type, university_affiliation, source, verified) VALUES
('Indian Institute of Technology Madras', 'Tamil Nadu', 'Chennai', 'Chennai', 'Engineering', 'Institute of National Importance', 'sample', true),
('Indian Institute of Technology Bombay', 'Maharashtra', 'Mumbai', 'Mumbai', 'Engineering', 'Institute of National Importance', 'sample', true),
('Indian Institute of Technology Delhi', 'Delhi', 'New Delhi', 'New Delhi', 'Engineering', 'Institute of National Importance', 'sample', true),
('Indian Institute of Technology Kanpur', 'Uttar Pradesh', 'Kanpur', 'Kanpur', 'Engineering', 'Institute of National Importance', 'sample', true),
('Indian Institute of Technology Kharagpur', 'West Bengal', 'Kharagpur', 'Kharagpur', 'Engineering', 'Institute of National Importance', 'sample', true),
('Indian Institute of Technology Roorkee', 'Uttarakhand', 'Roorkee', 'Roorkee', 'Engineering', 'Institute of National Importance', 'sample', true),
('Indian Institute of Technology Guwahati', 'Assam', 'Guwahati', 'Guwahati', 'Engineering', 'Institute of National Importance', 'sample', true),
('Indian Institute of Technology Hyderabad', 'Telangana', 'Hyderabad', 'Hyderabad', 'Engineering', 'Institute of National Importance', 'sample', true),
('Anna University', 'Tamil Nadu', 'Chennai', 'Chennai', 'University', 'State University', 'sample', true),
('Vellore Institute of Technology', 'Tamil Nadu', 'Vellore', 'Vellore', 'Engineering', 'Deemed University', 'sample', true),
('SRM Institute of Science and Technology', 'Tamil Nadu', 'Kanchipuram', 'Kattankulathur', 'Engineering', 'Deemed University', 'sample', true),
('PSG College of Technology', 'Tamil Nadu', 'Coimbatore', 'Coimbatore', 'Engineering', 'Anna University', 'sample', true),
('College of Engineering Guindy', 'Tamil Nadu', 'Chennai', 'Chennai', 'Engineering', 'Anna University', 'sample', true),
('Madras Institute of Technology', 'Tamil Nadu', 'Chennai', 'Chennai', 'Engineering', 'Anna University', 'sample', true),
('Delhi University', 'Delhi', 'New Delhi', 'New Delhi', 'University', 'Central University', 'sample', true),
('Jawaharlal Nehru University', 'Delhi', 'New Delhi', 'New Delhi', 'University', 'Central University', 'sample', true),
('University of Mumbai', 'Maharashtra', 'Mumbai', 'Mumbai', 'University', 'State University', 'sample', true),
('University of Calcutta', 'West Bengal', 'Kolkata', 'Kolkata', 'University', 'State University', 'sample', true),
('Banaras Hindu University', 'Uttar Pradesh', 'Varanasi', 'Varanasi', 'University', 'Central University', 'sample', true),
('Aligarh Muslim University', 'Uttar Pradesh', 'Aligarh', 'Aligarh', 'University', 'Central University', 'sample', true),
('National Institute of Technology Trichy', 'Tamil Nadu', 'Tiruchirappalli', 'Tiruchirappalli', 'Engineering', 'Institute of National Importance', 'sample', true),
('National Institute of Technology Surathkal', 'Karnataka', 'Mangalore', 'Surathkal', 'Engineering', 'Institute of National Importance', 'sample', true),
('National Institute of Technology Warangal', 'Telangana', 'Warangal', 'Warangal', 'Engineering', 'Institute of National Importance', 'sample', true),
('BITS Pilani', 'Rajasthan', 'Jhunjhunu', 'Pilani', 'Engineering', 'Deemed University', 'sample', true),
('Indian Institute of Science', 'Karnataka', 'Bengaluru', 'Bengaluru', 'University', 'Institute of National Importance', 'sample', true),
('All India Institute of Medical Sciences Delhi', 'Delhi', 'New Delhi', 'New Delhi', 'Medical', 'Institute of National Importance', 'sample', true),
('Christian Medical College Vellore', 'Tamil Nadu', 'Vellore', 'Vellore', 'Medical', 'Deemed University', 'sample', true),
('Loyola College', 'Tamil Nadu', 'Chennai', 'Chennai', 'Arts & Science', 'University of Madras', 'sample', true),
('St. Stephens College', 'Delhi', 'New Delhi', 'New Delhi', 'Arts & Science', 'Delhi University', 'sample', true),
('Lady Shri Ram College', 'Delhi', 'New Delhi', 'New Delhi', 'Arts & Science', 'Delhi University', 'sample', true),
('Hindu College', 'Delhi', 'New Delhi', 'New Delhi', 'Arts & Science', 'Delhi University', 'sample', true),
('Miranda House', 'Delhi', 'New Delhi', 'New Delhi', 'Arts & Science', 'Delhi University', 'sample', true),
('Stella Maris College', 'Tamil Nadu', 'Chennai', 'Chennai', 'Arts & Science', 'University of Madras', 'sample', true),
('Madras Christian College', 'Tamil Nadu', 'Chennai', 'Chennai', 'Arts & Science', 'University of Madras', 'sample', true),
('St. Josephs College Bangalore', 'Karnataka', 'Bengaluru', 'Bengaluru', 'Arts & Science', 'Bengaluru City University', 'sample', true),
('Christ University', 'Karnataka', 'Bengaluru', 'Bengaluru', 'University', 'Deemed University', 'sample', true),
('Manipal Academy of Higher Education', 'Karnataka', 'Udupi', 'Manipal', 'University', 'Deemed University', 'sample', true),
('Amrita Vishwa Vidyapeetham', 'Tamil Nadu', 'Coimbatore', 'Coimbatore', 'Engineering', 'Deemed University', 'sample', true),
('Jadavpur University', 'West Bengal', 'Kolkata', 'Kolkata', 'Engineering', 'State University', 'sample', true),
('Osmania University', 'Telangana', 'Hyderabad', 'Hyderabad', 'University', 'State University', 'sample', true),
('Government Polytechnic Mumbai', 'Maharashtra', 'Mumbai', 'Mumbai', 'Polytechnic', NULL, 'sample', true),
('Government Polytechnic College Coimbatore', 'Tamil Nadu', 'Coimbatore', 'Coimbatore', 'Polytechnic', NULL, 'sample', true);
