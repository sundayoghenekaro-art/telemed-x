
-- Add unique constraint on study_id for upsert support
ALTER TABLE public.radiology_reports ADD CONSTRAINT radiology_reports_study_id_key UNIQUE (study_id);
