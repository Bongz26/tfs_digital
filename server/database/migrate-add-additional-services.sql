-- Migration: Add additional services to cases table
-- Adds: requires_catering, requires_grocery, requires_bus
-- Date: 2025-01-15

-- Add requires_catering column
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS requires_catering BOOLEAN DEFAULT FALSE;

-- Add requires_grocery column
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS requires_grocery BOOLEAN DEFAULT FALSE;

-- Add requires_bus column
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS requires_bus BOOLEAN DEFAULT FALSE;

-- Update any existing rows to have default FALSE values (already handled by DEFAULT, but being explicit)
UPDATE cases 
SET requires_catering = COALESCE(requires_catering, FALSE),
    requires_grocery = COALESCE(requires_grocery, FALSE),
    requires_bus = COALESCE(requires_bus, FALSE)
WHERE requires_catering IS NULL OR requires_grocery IS NULL OR requires_bus IS NULL;

