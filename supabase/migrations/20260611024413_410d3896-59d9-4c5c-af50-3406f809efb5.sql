CREATE TABLE public.pin_login_attempts (
  phone_hash text NOT NULL,
  ip_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  locked_until timestamp with time zone,
  last_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (phone_hash, ip_hash)
);

GRANT ALL ON public.pin_login_attempts TO service_role;

ALTER TABLE public.pin_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_pin_login_attempts_updated_at
BEFORE UPDATE ON public.pin_login_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();