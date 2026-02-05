-- Create locations table
CREATE TABLE IF NOT EXISTS public.locations (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    type TEXT DEFAULT 'branch', -- 'branch', 'warehouse', 'hq'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON public.locations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert Seed Data
INSERT INTO public.locations (name, type)
VALUES 
    ('Head Office', 'hq'),
    ('MAKENENG', 'branch'),
    ('Showroom', 'branch'),
    ('Bethlehem Branch', 'branch')
ON CONFLICT (name) DO NOTHING;
