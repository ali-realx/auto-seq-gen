-- Add username column to profiles and make it unique
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Update the handle_new_user function to include username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nama, lokasi, departemen, username)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'nama',
    new.raw_user_meta_data ->> 'lokasi',
    new.raw_user_meta_data ->> 'departemen',
    new.raw_user_meta_data ->> 'username'
  );
  RETURN new;
END;
$$;

-- Create superadmin user (password will be set via auth)
-- Note: We'll insert this user through the app after updating auth logic