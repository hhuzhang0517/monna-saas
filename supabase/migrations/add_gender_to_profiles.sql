-- Add gender column to profiles table
-- Migration: add_gender_to_profiles
-- Date: 2025-10-18

-- Add gender column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'not_specified';

-- Add comment to document the column
COMMENT ON COLUMN public.profiles.gender IS 'User gender: male, female, other, not_specified';

-- Create index for gender column (optional, for analytics queries)
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles(gender);
