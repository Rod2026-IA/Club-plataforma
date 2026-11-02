
-- 1. Add audience column (default 'aspirante' for backwards compatibility)
ALTER TABLE public.dashboard_settings
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'aspirante';

-- 2. Drop old unique constraint on section_key (if exists) and add composite unique
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dashboard_settings_section_key_key'
  ) THEN
    ALTER TABLE public.dashboard_settings DROP CONSTRAINT dashboard_settings_section_key_key;
  END IF;
END $$;

-- 3. Duplicate existing rows for the 'investido' audience (only if not already present)
INSERT INTO public.dashboard_settings (
  section_key, enabled, custom_icon_url, custom_image_url, custom_title,
  custom_description, image_position, image_scale,
  title_letter_spacing, title_line_height,
  desc_letter_spacing, desc_line_height, audience
)
SELECT
  section_key, enabled, custom_icon_url, custom_image_url, custom_title,
  custom_description, image_position, image_scale,
  title_letter_spacing, title_line_height,
  desc_letter_spacing, desc_line_height, 'investido'
FROM public.dashboard_settings
WHERE audience = 'aspirante'
  AND NOT EXISTS (
    SELECT 1 FROM public.dashboard_settings d2
    WHERE d2.section_key = public.dashboard_settings.section_key
      AND d2.audience = 'investido'
  );

-- 4. Composite unique constraint
ALTER TABLE public.dashboard_settings
  ADD CONSTRAINT dashboard_settings_section_audience_unique UNIQUE (section_key, audience);

-- 5. Add CHECK to limit allowed audience values
ALTER TABLE public.dashboard_settings
  DROP CONSTRAINT IF EXISTS dashboard_settings_audience_check;
ALTER TABLE public.dashboard_settings
  ADD CONSTRAINT dashboard_settings_audience_check CHECK (audience IN ('aspirante','investido'));
