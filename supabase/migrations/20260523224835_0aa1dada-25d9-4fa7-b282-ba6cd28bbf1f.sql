CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, second_name, first_last_name, second_last_name, phone, birthday, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'second_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'second_last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
    NULLIF(NEW.raw_user_meta_data->>'birthday', '')::date,
    COALESCE(NEW.email, '')
  );

  -- SECURITY: always default to 'integrante'. Never trust client-supplied role metadata.
  -- Admin promotion must be performed by an existing admin via user_roles RLS.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'integrante');

  RETURN NEW;
END;
$function$;