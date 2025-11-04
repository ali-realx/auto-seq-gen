-- Complete Schema Migration for External Supabase
-- Run this SQL in your external Supabase SQL Editor

-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'superadmin');

-- Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  nama TEXT NOT NULL,
  singkatan TEXT NOT NULL
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view locations" ON public.locations
  FOR SELECT USING (true);

CREATE POLICY "Superadmins can manage locations" ON public.locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  nama TEXT NOT NULL,
  singkatan TEXT NOT NULL
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view departments" ON public.departments
  FOR SELECT USING (true);

CREATE POLICY "Superadmins can manage departments" ON public.departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

-- Create document_types table
CREATE TABLE public.document_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  nama TEXT NOT NULL,
  singkatan TEXT NOT NULL
);

ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view document types" ON public.document_types
  FOR SELECT USING (true);

CREATE POLICY "Superadmins can manage document_types" ON public.document_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  nama TEXT NOT NULL,
  lokasi TEXT NOT NULL,
  departemen TEXT NOT NULL,
  username TEXT UNIQUE,
  uid TEXT
);

-- Index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Superadmins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

CREATE POLICY "Superadmins can delete profiles" ON public.profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can manage all roles" ON public.user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper to get user id from username
CREATE OR REPLACE FUNCTION public.get_user_id_by_username(_username TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE username = _username LIMIT 1;
$$;

-- Helper to assign role by username (idempotent)
CREATE OR REPLACE FUNCTION public.add_role_by_username(_username TEXT, _role app_role)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID;
BEGIN
  SELECT public.get_user_id_by_username(_username) INTO _uid;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'User with username % not found', _username USING ERRCODE = 'foreign_key_violation';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Helper to upsert profile fields by username
CREATE OR REPLACE FUNCTION public.upsert_profile_by_username(
  _username TEXT,
  _nama TEXT,
  _lokasi TEXT,
  _departemen TEXT,
  _uid TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  SELECT public.get_user_id_by_username(_username) INTO _user_id;
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User with username % not found', _username USING ERRCODE = 'foreign_key_violation';
  END IF;

  UPDATE public.profiles
  SET nama = _nama,
      lokasi = _lokasi,
      departemen = _departemen,
      uid = _uid
  WHERE id = _user_id;
END;
$$;

-- Create handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nama, lokasi, departemen, username, uid)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'nama',
    NEW.raw_user_meta_data ->> 'lokasi',
    NEW.raw_user_meta_data ->> 'departemen',
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'uid'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  nomor_surat TEXT NOT NULL,
  jenis_surat TEXT NOT NULL,
  departemen TEXT NOT NULL,
  lokasi TEXT NOT NULL,
  deskripsi TEXT
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view all documents" ON public.documents
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- Create settings table
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  app_name TEXT DEFAULT 'E-Numbering',
  logo_url TEXT
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.settings
  FOR SELECT USING (true);

CREATE POLICY "Superadmins can manage settings" ON public.settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'superadmin'
    )
  );
