-- DATABASE SCHEMA DUMP
-- Generated: 2025-12-19T03:57:44.148Z

-- Table: airtime_requests
CREATE TABLE IF NOT EXISTS airtime_requests (
    id integer NOT NULL DEFAULT nextval('airtime_requests_id_seq'::regclass),
    case_id integer,
    policy_number character varying(100),
    beneficiary_name character varying(200),
    network character varying(50),
    phone_number character varying(20),
    amount numeric DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    requested_by uuid,
    requested_by_email character varying(200),
    requested_by_role character varying(50),
    requested_at timestamp without time zone DEFAULT now(),
    sent_at timestamp without time zone,
    handled_by uuid,
    operator_phone character varying(50),
    operator_notes text
);

-- Table: airtime_requests_archive
CREATE TABLE IF NOT EXISTS airtime_requests_archive (
    original_id integer NOT NULL,
    case_id integer,
    policy_number character varying(100),
    beneficiary_name character varying(200),
    network character varying(50),
    phone_number character varying(20),
    amount numeric DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    requested_by uuid,
    requested_by_email character varying(200),
    requested_by_role character varying(50),
    requested_at timestamp without time zone,
    sent_at timestamp without time zone,
    handled_by uuid,
    operator_phone character varying(50),
    operator_notes text,
    archived_at timestamp without time zone DEFAULT now()
);

-- Table: audit_log
CREATE TABLE IF NOT EXISTS audit_log (
    id integer NOT NULL DEFAULT nextval('audit_log_id_seq'::regclass),
    user_id uuid,
    user_email character varying(120),
    action character varying(50) NOT NULL,
    resource_type character varying(50),
    resource_id integer,
    old_values jsonb,
    new_values jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT now()
);

-- Table: cases
CREATE TABLE IF NOT EXISTS cases (
    id integer NOT NULL DEFAULT nextval('cases_id_seq'::regclass),
    case_number character varying(15) NOT NULL,
    deceased_name character varying(100) NOT NULL,
    deceased_id character varying(13),
    nok_name character varying(100) NOT NULL,
    nok_contact character varying(15) NOT NULL,
    nok_relation character varying(50),
    plan_category character varying(20),
    plan_name character varying(20),
    plan_members integer,
    plan_age_bracket character varying(20),
    funeral_date date,
    funeral_time time without time zone,
    venue_name character varying(100),
    venue_address text,
    venue_lat numeric,
    venue_lng numeric,
    requires_cow boolean DEFAULT false,
    requires_tombstone boolean DEFAULT false,
    status character varying(20) DEFAULT 'intake'::character varying,
    intake_day date,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    service_type character varying(10) DEFAULT 'book'::character varying,
    total_price numeric DEFAULT 0,
    casket_type character varying(50),
    casket_colour character varying(30),
    delivery_date date,
    delivery_time time without time zone,
    created_by_user_id uuid,
    updated_by_user_id uuid,
    requires_catering boolean DEFAULT false,
    requires_grocery boolean DEFAULT false,
    requires_bus boolean DEFAULT false,
    claim_date date,
    policy_number character varying(50),
    cleansing_date date,
    cleansing_time time without time zone,
    service_date date,
    service_time time without time zone,
    church_date date,
    church_time time without time zone,
    programs integer,
    top_up_amount numeric DEFAULT 0,
    airtime boolean DEFAULT false,
    airtime_network character varying(50),
    airtime_number character varying(20),
    cover_amount numeric DEFAULT 0,
    cashback_amount numeric DEFAULT 0,
    amount_to_bank numeric DEFAULT 0,
    requires_sheep boolean DEFAULT false,
    legacy_plan_name character varying(100),
    benefit_mode character varying(20),
    burial_place character varying(255),
    branch character varying(255) DEFAULT 'Head Office'::character varying
);

-- Table: checklist
CREATE TABLE IF NOT EXISTS checklist (
    id integer NOT NULL DEFAULT nextval('checklist_id_seq'::regclass),
    case_id integer,
    task character varying(100),
    completed boolean DEFAULT false,
    completed_at timestamp without time zone,
    completed_by character varying(100)
);

-- Table: claim_draft_deletions
CREATE TABLE IF NOT EXISTS claim_draft_deletions (
    id integer NOT NULL DEFAULT nextval('claim_draft_deletions_id_seq'::regclass),
    policy_number character varying(100) NOT NULL,
    department character varying(50),
    data jsonb,
    deleted_by uuid,
    deleted_by_email character varying(200),
    deleted_by_role character varying(50),
    reason text,
    deleted_at timestamp without time zone DEFAULT now()
);

-- Table: claim_drafts
CREATE TABLE IF NOT EXISTS claim_drafts (
    id integer NOT NULL DEFAULT nextval('claim_drafts_id_seq'::regclass),
    policy_number character varying(100) NOT NULL,
    data jsonb NOT NULL,
    department character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: driver_vehicle_assignments
CREATE TABLE IF NOT EXISTS driver_vehicle_assignments (
    id integer NOT NULL DEFAULT nextval('driver_vehicle_assignments_id_seq'::regclass),
    driver_id integer NOT NULL,
    vehicle_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT now(),
    active boolean DEFAULT true,
    notes text
);

-- Table: drivers
CREATE TABLE IF NOT EXISTS drivers (
    id integer NOT NULL DEFAULT nextval('drivers_id_seq'::regclass),
    name character varying(100) NOT NULL,
    contact character varying(15),
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);

-- Table: fleet_logs
CREATE TABLE IF NOT EXISTS fleet_logs (
    id integer NOT NULL DEFAULT nextval('fleet_logs_id_seq'::regclass),
    vehicle_id integer,
    driver_name character varying(100) NOT NULL,
    trip_date date NOT NULL DEFAULT CURRENT_DATE,
    start_time time without time zone NOT NULL,
    end_time time without time zone,
    start_odometer integer NOT NULL,
    end_odometer integer,
    trip_purpose character varying(255),
    from_location character varying(100),
    to_location character varying(100),
    fuel_used numeric,
    remarks text,
    recorded_at timestamp without time zone DEFAULT now(),
    status character varying(20) DEFAULT 'in_progress'::character varying
);

-- Table: fleet_reports
CREATE TABLE IF NOT EXISTS fleet_reports (
    id integer NOT NULL DEFAULT nextval('fleet_reports_id_seq'::regclass),
    report_month character varying(7) NOT NULL,
    total_trips integer DEFAULT 0,
    total_distance integer DEFAULT 0,
    total_fuel numeric DEFAULT 0.00,
    generated_by character varying(100),
    generated_at timestamp without time zone DEFAULT now()
);

-- Table: fuel_purchases
CREATE TABLE IF NOT EXISTS fuel_purchases (
    id integer NOT NULL DEFAULT nextval('fuel_purchases_id_seq'::regclass),
    vehicle_id integer,
    liters numeric NOT NULL,
    amount numeric NOT NULL,
    receipt_number character varying(50),
    purchase_date timestamp with time zone DEFAULT now(),
    odometer_reading integer,
    station_name character varying(100),
    notes text,
    receipt_slip_path character varying(500),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: inventory
CREATE TABLE IF NOT EXISTS inventory (
    id integer NOT NULL DEFAULT nextval('inventory_id_seq'::regclass),
    name character varying(100) NOT NULL,
    category character varying(30),
    stock_quantity integer DEFAULT 0,
    reserved_quantity integer DEFAULT 0,
    location character varying(50) DEFAULT 'Manekeng'::character varying,
    low_stock_threshold integer DEFAULT 1,
    unit_price numeric,
    sku character varying(50),
    barcode character varying(100),
    supplier character varying(100),
    expiry_date date,
    last_stock_count date,
    image_url text,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    supplier_id integer,
    created_by_user_id uuid,
    updated_by_user_id uuid,
    model character varying(100),
    color character varying(50)
);

-- Table: livestock
CREATE TABLE IF NOT EXISTS livestock (
    id integer NOT NULL DEFAULT nextval('livestock_id_seq'::regclass),
    tag_id character varying(10) NOT NULL,
    status character varying(20) DEFAULT 'available'::character varying,
    assigned_case_id integer,
    breed character varying(50) DEFAULT 'Cow (Generic)'::character varying,
    location character varying(50) DEFAULT 'Manekeng Farm'::character varying
);

-- Table: maintenance_notes
CREATE TABLE IF NOT EXISTS maintenance_notes (
    id integer NOT NULL DEFAULT nextval('maintenance_notes_id_seq'::regclass),
    vehicle_id integer,
    note text NOT NULL,
    maintenance_type character varying(50),
    status character varying(20) DEFAULT 'pending'::character varying,
    cost numeric,
    service_date timestamp with time zone,
    odometer_reading integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: purchase_order_items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id integer NOT NULL DEFAULT nextval('purchase_order_items_id_seq'::regclass),
    po_id integer,
    inventory_id integer,
    quantity_ordered integer NOT NULL,
    unit_cost numeric,
    received_quantity integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);

-- Table: purchase_orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id integer NOT NULL DEFAULT nextval('purchase_orders_id_seq'::regclass),
    po_number character varying(50) NOT NULL,
    supplier_id integer,
    order_date date NOT NULL,
    expected_delivery date,
    status character varying(20) DEFAULT 'pending'::character varying,
    total_amount numeric,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    manual_supplier_email character varying(120),
    created_by_user_id uuid,
    updated_by_user_id uuid
);

-- Table: repatriation_trips
CREATE TABLE IF NOT EXISTS repatriation_trips (
    id integer NOT NULL DEFAULT nextval('repatriation_trips_id_seq'::regclass),
    case_id integer,
    vehicle_id integer,
    driver_id integer,
    from_location character varying(120),
    from_address text,
    to_location character varying(120),
    to_address text,
    odometer_closing integer,
    km_traveled integer,
    time_out character varying(20),
    time_in character varying(20),
    notes text,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    tag_number character varying(100)
);

-- Table: reservations
CREATE TABLE IF NOT EXISTS reservations (
    id integer NOT NULL DEFAULT nextval('reservations_id_seq'::regclass),
    case_id integer,
    inventory_id integer,
    quantity integer NOT NULL,
    reserved_at timestamp without time zone DEFAULT now(),
    released_at timestamp without time zone,
    status character varying(20) DEFAULT 'reserved'::character varying,
    confirmed_at timestamp without time zone,
    confirmed_by character varying(100)
);

-- Table: roster
CREATE TABLE IF NOT EXISTS roster (
    id integer NOT NULL DEFAULT nextval('roster_id_seq'::regclass),
    case_id integer,
    vehicle_id integer,
    driver_name character varying(100),
    pickup_time timestamp without time zone,
    route_json text,
    status character varying(20) DEFAULT 'scheduled'::character varying,
    sms_sent boolean DEFAULT false,
    assignment_role character varying(20)
);

-- Table: sms_log
CREATE TABLE IF NOT EXISTS sms_log (
    id integer NOT NULL DEFAULT nextval('sms_log_id_seq'::regclass),
    case_id integer,
    phone character varying(15),
    message text,
    sent_at timestamp without time zone,
    status character varying(20)
);

-- Table: stock_movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id integer NOT NULL DEFAULT nextval('stock_movements_id_seq'::regclass),
    inventory_id integer,
    case_id integer,
    movement_type character varying(20),
    quantity_change integer NOT NULL,
    previous_quantity integer NOT NULL,
    new_quantity integer NOT NULL,
    reason text,
    recorded_by character varying(100),
    movement_date timestamp without time zone DEFAULT now(),
    reference_number character varying(50),
    user_id uuid,
    created_at timestamp without time zone DEFAULT now()
);

-- Table: stock_take_items
CREATE TABLE IF NOT EXISTS stock_take_items (
    id integer NOT NULL DEFAULT nextval('stock_take_items_id_seq'::regclass),
    stock_take_id integer NOT NULL,
    inventory_id integer NOT NULL,
    system_quantity integer NOT NULL,
    physical_quantity integer,
    difference integer,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);

-- Table: stock_take_sessions
CREATE TABLE IF NOT EXISTS stock_take_sessions (
    id integer NOT NULL DEFAULT nextval('stock_take_sessions_id_seq'::regclass),
    session_name character varying(100) NOT NULL,
    session_date date NOT NULL,
    conducted_by character varying(100),
    status character varying(20) DEFAULT 'in_progress'::character varying,
    total_items_counted integer DEFAULT 0,
    items_with_variance integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone
);

-- Table: stock_takes
CREATE TABLE IF NOT EXISTS stock_takes (
    id integer NOT NULL DEFAULT nextval('stock_takes_id_seq'::regclass),
    taken_by character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    status character varying(20) DEFAULT 'open'::character varying
);

-- Table: suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id integer NOT NULL DEFAULT nextval('suppliers_id_seq'::regclass),
    name character varying(100) NOT NULL,
    contact_person character varying(100),
    phone character varying(15),
    email character varying(100),
    address text,
    payment_terms character varying(50),
    created_at timestamp without time zone DEFAULT now(),
    supplier_system_type character varying(50),
    supplier_system_id character varying(100),
    supplier_api_endpoint character varying(255),
    supplier_api_key character varying(255)
);

-- Table: trips
CREATE TABLE IF NOT EXISTS trips (
    id integer NOT NULL DEFAULT nextval('trips_id_seq'::regclass),
    driver_id integer,
    vehicle_id integer,
    start_odometer integer,
    end_odometer integer NOT NULL,
    distance integer,
    purpose text,
    fuel_used numeric,
    fuel_cost numeric,
    notes text,
    status character varying(20) DEFAULT 'completed'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id integer NOT NULL DEFAULT nextval('user_profiles_id_seq'::regclass),
    user_id uuid NOT NULL,
    email character varying(120) NOT NULL,
    full_name character varying(100) NOT NULL,
    phone character varying(20),
    role character varying(20) DEFAULT 'staff'::character varying,
    active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

-- Table: vehicle_odometer
CREATE TABLE IF NOT EXISTS vehicle_odometer (
    id integer NOT NULL DEFAULT nextval('vehicle_odometer_id_seq'::regclass),
    vehicle_id integer NOT NULL,
    odometer_reading integer NOT NULL,
    recorded_at timestamp without time zone DEFAULT now(),
    recorded_by integer,
    notes text
);

-- Table: vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id integer NOT NULL DEFAULT nextval('vehicles_id_seq'::regclass),
    reg_number character varying(12) NOT NULL,
    type character varying(20),
    available boolean DEFAULT true,
    current_location character varying(100),
    last_service date,
    status character varying(20) DEFAULT 'available'::character varying
);

