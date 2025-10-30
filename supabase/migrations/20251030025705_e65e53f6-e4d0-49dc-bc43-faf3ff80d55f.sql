-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  lokasi TEXT NOT NULL,
  departemen TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create document_types table
CREATE TABLE public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL UNIQUE,
  singkatan TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view document types"
  ON public.document_types FOR SELECT
  USING (true);

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL UNIQUE,
  singkatan TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view departments"
  ON public.departments FOR SELECT
  USING (true);

-- Create locations table
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL UNIQUE,
  singkatan TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view locations"
  ON public.locations FOR SELECT
  USING (true);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  nomor_surat TEXT NOT NULL,
  jenis_surat TEXT NOT NULL,
  deskripsi TEXT,
  lokasi TEXT NOT NULL,
  departemen TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documents
CREATE POLICY "Users can view their own documents"
  ON public.documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON public.documents FOR DELETE
  USING (auth.uid() = user_id);

-- Create settings table
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name TEXT DEFAULT 'E-Numbering',
  logo_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings"
  ON public.settings FOR SELECT
  USING (true);

-- Insert default settings
INSERT INTO public.settings (app_name, logo_url) 
VALUES ('E-Numbering', NULL);

-- Insert document types
INSERT INTO public.document_types (nama, singkatan) VALUES
  ('Agreement (Eksternal)', 'AG'),
  ('Internal Memo', 'IM'),
  ('Letter', 'L'),
  ('Letter of Intent', 'LOI'),
  ('Memorandum of Understanding', 'MOU'),
  ('Non Disclosure Agreement', 'NDA'),
  ('Perjanjian Kerja Waktu Tertentu', 'PKWT'),
  ('Perjanjian Kerja Waktu Tidak Tertentu', 'PKWTT'),
  ('Surat Keputusan', 'SK'),
  ('Surat Keterangan', 'SKT'),
  ('Surat Peringatan (Eksternal & Internal)', 'SP'),
  ('Surat Pernyataan', 'SPT'),
  ('Surat Perintah Kerja', 'SPK'),
  ('Training Certificate', 'TC'),
  ('Quotation', 'QUO');

-- Insert departments
INSERT INTO public.departments (nama, singkatan) VALUES
  ('Business Development & Sales', 'BDS'),
  ('Branch Management', 'BRC'),
  ('Board of Commissioner', 'BOC'),
  ('Board of Director', 'BOD'),
  ('Finance, Accounting & Tax', 'FAT'),
  ('Health, Safety, and Environment', 'HSE'),
  ('Security', 'SCR'),
  ('Human Capital & General Affair', 'HCM'),
  ('Legal & Compliance', 'LGC'),
  ('Operations', 'OPS'),
  ('Procurement', 'PRC'),
  ('Quality Management System', 'QMS'),
  ('Information Technology', 'IT');

-- Insert locations
INSERT INTO public.locations (nama, singkatan) VALUES
  ('Branch Balikpapan', 'BPN'),
  ('Head Office', 'HO'),
  ('Site Handil', 'HDL'),
  ('Site Muara Badak', 'MBD'),
  ('Site Sanipah', 'SNP'),
  ('Site Tanjung', 'TJG'),
  ('Site Cikarang', 'CKR'),
  ('Site Dumai', 'DMI'),
  ('Site Balongan', 'BLG'),
  ('Site Bontang', 'BTG');

-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nama, lokasi, departemen)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'lokasi', 'Head Office'),
    COALESCE(NEW.raw_user_meta_data->>'departemen', 'Operations')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();