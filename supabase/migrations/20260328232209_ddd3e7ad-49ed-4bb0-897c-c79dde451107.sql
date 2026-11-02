
-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'director', 'subdirector', 'integrante');

-- Enum for unit position
CREATE TYPE public.unit_position AS ENUM ('capitan', 'secretario', 'miembro');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  second_name TEXT NOT NULL DEFAULT '',
  first_last_name TEXT NOT NULL,
  second_last_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  birthday DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles table (separate as per security guidelines)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'integrante',
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'director'));
CREATE POLICY "Users can insert own role at registration" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Units table
CREATE TABLE public.units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view units" ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Directors can manage units" ON public.units FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'subdirector'));

-- Unit members
CREATE TABLE public.unit_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position unit_position NOT NULL DEFAULT 'miembro',
  UNIQUE(unit_id, user_id)
);

ALTER TABLE public.unit_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view unit members" ON public.unit_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Directors can manage unit members" ON public.unit_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'subdirector'));

-- Weekly evaluations
CREATE TABLE public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  evaluation_date DATE NOT NULL,
  asistencia INT NOT NULL DEFAULT 0 CHECK (asistencia >= 0 AND asistencia <= 5),
  puntualidad INT NOT NULL DEFAULT 0 CHECK (puntualidad >= 0 AND puntualidad <= 5),
  uniforme INT NOT NULL DEFAULT 0 CHECK (uniforme >= 0 AND uniforme <= 5),
  tareas INT NOT NULL DEFAULT 0 CHECK (tareas >= 0 AND tareas <= 5),
  matutina INT NOT NULL DEFAULT 0 CHECK (matutina >= 0 AND matutina <= 5),
  cuota INT NOT NULL DEFAULT 0 CHECK (cuota >= 0 AND cuota <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, evaluation_date)
);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view evaluations" ON public.evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Directors can manage evaluations" ON public.evaluations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'director') OR public.has_role(auth.uid(), 'subdirector'));

-- Bible readings
CREATE TABLE public.bible_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  reading_reference TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, reading_date)
);

ALTER TABLE public.bible_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own readings" ON public.bible_readings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own readings" ON public.bible_readings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own readings" ON public.bible_readings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, first_last_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_last_name', ''),
    COALESCE(NEW.phone, ''),
    COALESCE(NEW.email, '')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'integrante'));

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
