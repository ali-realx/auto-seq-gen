-- Add unique constraint for username-based operations
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Optional: index for faster lookups by username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

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
