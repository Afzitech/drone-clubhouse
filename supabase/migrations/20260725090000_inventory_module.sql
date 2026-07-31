-- =====================================================
-- AeroForge Inventory Module
-- Migration: Inventory Foundation
-- =====================================================

-- ===========================
-- ENUMS
-- ===========================

CREATE TYPE public.inventory_category AS ENUM (
  'Flight Controllers',
  'ESCs',
  'Motors',
  'Frames',
  'Propellers',
  'Batteries',
  'GPS',
  'Receivers',
  'Cameras',
  'Sensors',
  'Radio Equipment',
  'Tools',
  'Electronics',
  'Miscellaneous'
);

CREATE TYPE public.inventory_status AS ENUM (
  'available',
  'low_stock',
  'out_of_stock',
  'retired'
);

CREATE TYPE public.inventory_condition AS ENUM (
  'new',
  'excellent',
  'good',
  'needs_repair',
  'retired'
);

CREATE TYPE public.inventory_request_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'issued',
  'returned',
  'cancelled'
);

CREATE TYPE public.procurement_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'converted'
);

CREATE TYPE public.inventory_action AS ENUM (
  'created',
  'edited',
  'deleted',
  'restored',
  'requested',
  'approved',
  'rejected',
  'issued',
  'returned',
  'adjusted',
  'procurement_approved',
  'procurement_rejected',
  'converted'
);

-- =====================================================
-- INVENTORY ITEMS
-- =====================================================

CREATE TABLE public.inventory_items (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    category public.inventory_category NOT NULL,

    description TEXT,

    image_url TEXT,

    manufacturer TEXT,

    model TEXT,

    serial_number TEXT,

    storage_location TEXT NOT NULL,

    minimum_stock INTEGER NOT NULL DEFAULT 0,

    total_quantity INTEGER NOT NULL DEFAULT 0,

    reserved_quantity INTEGER NOT NULL DEFAULT 0,

    issued_quantity INTEGER NOT NULL DEFAULT 0,

    unit_cost NUMERIC(10,2),

    item_condition public.inventory_condition
        NOT NULL DEFAULT 'new',

    status public.inventory_status
        NOT NULL DEFAULT 'available',

    created_by UUID
        REFERENCES auth.users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ
        NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ
        NOT NULL DEFAULT now(),

    CONSTRAINT inventory_positive_total
        CHECK (total_quantity >= 0),

    CONSTRAINT inventory_positive_reserved
        CHECK (reserved_quantity >= 0),

    CONSTRAINT inventory_positive_issued
        CHECK (issued_quantity >= 0),

    CONSTRAINT inventory_reserved_limit
        CHECK (reserved_quantity <= total_quantity),

    CONSTRAINT inventory_issued_limit
        CHECK (issued_quantity <= total_quantity)
);

GRANT SELECT, INSERT, UPDATE, DELETE
ON public.inventory_items
TO authenticated;

GRANT ALL
ON public.inventory_items
TO service_role;

ALTER TABLE public.inventory_items
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view inventory"
ON public.inventory_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage inventory"
ON public.inventory_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER touch_inventory_items
BEFORE UPDATE
ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE INDEX inventory_name_idx
ON public.inventory_items(name);

CREATE INDEX inventory_category_idx
ON public.inventory_items(category);

CREATE INDEX inventory_status_idx
ON public.inventory_items(status);