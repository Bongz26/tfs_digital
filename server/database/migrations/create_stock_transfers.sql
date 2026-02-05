-- Create stock_transfers table
-- Fixed: driver_id type changed from UUID to INT to match drivers.id
CREATE TABLE IF NOT EXISTS public.stock_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transfer_number TEXT UNIQUE, -- e.g. TRF-2024-001
    from_location TEXT NOT NULL,
    to_location TEXT NOT NULL,
    driver_id INT REFERENCES public.drivers(id), -- Changed to INT
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { inventory_id, name, quantity, model, color }
    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_transit, completed, cancelled
    notes TEXT,
    created_by TEXT, -- Email or User ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dispatched_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    received_by TEXT -- Email or User ID
);

-- Add tracking columns to stock_movements if they don't exist
DO $$ 
BEGIN 
    -- Fixed: driver_id type changed from UUID to INT
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'driver_id') THEN
        ALTER TABLE public.stock_movements ADD COLUMN driver_id INT REFERENCES public.drivers(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'transfer_id') THEN
        ALTER TABLE public.stock_movements ADD COLUMN transfer_id UUID REFERENCES public.stock_transfers(id);
    END IF;

    -- Add case_id only if it's missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_movements' AND column_name = 'case_id') THEN
        ALTER TABLE public.stock_movements ADD COLUMN case_id INT REFERENCES public.cases(id);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users
CREATE POLICY "Enable all access for authenticated users" ON public.stock_transfers
    FOR ALL USING (auth.role() = 'authenticated');
