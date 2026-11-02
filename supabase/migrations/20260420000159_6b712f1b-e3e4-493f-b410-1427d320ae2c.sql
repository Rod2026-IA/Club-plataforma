
CREATE TYPE public.kash_tx_type AS ENUM ('ingreso', 'egreso');

CREATE TABLE public.conqui_kash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  tx_type public.kash_tx_type NOT NULL DEFAULT 'ingreso',
  description TEXT DEFAULT '',
  tx_date DATE NOT NULL DEFAULT CURRENT_DATE,
  registered_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kash_user ON public.conqui_kash_transactions(user_id);
CREATE INDEX idx_kash_date ON public.conqui_kash_transactions(tx_date DESC);

ALTER TABLE public.conqui_kash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view own kash"
ON public.conqui_kash_transactions FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'director')
  OR public.has_role(auth.uid(), 'subdirector')
);

CREATE POLICY "Admins insert kash"
ON public.conqui_kash_transactions FOR INSERT
TO authenticated
WITH CHECK (
  registered_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'director')
    OR public.has_role(auth.uid(), 'subdirector')
  )
);

CREATE POLICY "Admins update kash"
ON public.conqui_kash_transactions FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'director')
  OR public.has_role(auth.uid(), 'subdirector')
);

CREATE POLICY "Admins delete kash"
ON public.conqui_kash_transactions FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'director')
  OR public.has_role(auth.uid(), 'subdirector')
);

CREATE TRIGGER update_kash_updated_at
BEFORE UPDATE ON public.conqui_kash_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
