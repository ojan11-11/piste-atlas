-- Piste Atlas production-oriented PostgreSQL / Supabase starter schema.
-- This schema is intentionally separate from the static prototype and is not deployed.
-- UUIDs use gen_random_uuid() (PostgreSQL 13+/pgcrypto-enabled environments).
CREATE TABLE resorts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    name text NOT NULL,
    website_url text,
    country_code char(2) NOT NULL CHECK (country_code IN ('US','CA')),
    region_code text NOT NULL,
    region_name text,
    nearest_town text,
    latitude decimal(9,6) CHECK (latitude BETWEEN -90 AND 90),
    longitude decimal(9,6) CHECK (longitude BETWEEN -180 AND 180),
    operation_status text NOT NULL DEFAULT 'unverified'
      CHECK (operation_status IN ('operating','seasonal','temporarily_closed','permanently_closed','unverified')),
    resort_type text NOT NULL DEFAULT 'downhill'
      CHECK (resort_type IN ('downhill','nordic','mixed')),
    is_public boolean NOT NULL DEFAULT true,
    published boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resorts_country_region ON resorts(country_code, region_code);
CREATE INDEX resorts_location ON resorts(latitude, longitude);

CREATE TABLE source_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_url text NOT NULL,
    publisher text NOT NULL,
    source_type text NOT NULL CHECK (source_type IN ('official_resort','pass_operator','open_dataset','other')),
    license_name text,
    attribution text,
    retrieved_at timestamptz NOT NULL DEFAULT now(),
    observed_at timestamptz,
    notes text
);

CREATE TABLE mountain_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    season text NOT NULL, -- e.g. '2026-27'; a snapshot, not necessarily updated each season
    skiable_acres numeric(10,1),
    vertical_drop_ft integer,
    summit_elevation_ft integer,
    base_elevation_ft integer,
    named_run_count integer,
    named_runs_approximate boolean NOT NULL DEFAULT false,
    total_lifts integer,
    lift_count_definition text,
    average_annual_snowfall_in numeric(7,2),
    snowfall_period_years integer,
    snowfall_measurement_location text,
    definition_notes text,
    verified_at timestamptz,
    UNIQUE(resort_id,season)
);

CREATE TABLE terrain_breakdowns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    season text NOT NULL,
    source_convention text, -- green/blue/black differs between areas/countries
    beginner_percent numeric(5,2),
    intermediate_percent numeric(5,2),
    advanced_percent numeric(5,2),
    expert_percent numeric(5,2),
    category_mapping_notes text,
    verified_at timestamptz,
    UNIQUE(resort_id,season),
    CHECK (beginner_percent IS NULL OR beginner_percent BETWEEN 0 AND 100),
    CHECK (intermediate_percent IS NULL OR intermediate_percent BETWEEN 0 AND 100)
);

CREATE TABLE lifts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    external_feature_id text,
    name text,
    lift_type text,
    passenger_capacity integer,
    uphill_capacity_per_hour integer,
    is_surface_lift boolean,
    operation_status text,
    last_verified_at timestamptz
);
CREATE TABLE trail_maps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    season text,
    map_type text NOT NULL DEFAULT 'official_winter',
    official_url text NOT NULL,
    hosted_asset_url text,
    rights_status text NOT NULL DEFAULT 'link_only'
      CHECK (rights_status IN ('link_only','licensed_hosted','open_licensed')),
    rights_notes text,
    verified_at timestamptz
);
CREATE TABLE ski_passes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    website_url text
);
CREATE TABLE resort_pass_access (
    resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    pass_id uuid NOT NULL REFERENCES ski_passes(id),
    season text NOT NULL,
    access_rules text,
    blackout_dates jsonb,
    source_id uuid REFERENCES source_records(id),
    verified_at timestamptz,
    PRIMARY KEY(resort_id,pass_id,season)
);

-- Important: rates are quotes observed at a moment in time for particular visit dates.
-- Do not treat any ticket price as universally valid or exchange USD/CAD silently.
CREATE TABLE ticket_price_observations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    visit_date date NOT NULL,
    observed_at timestamptz NOT NULL DEFAULT now(),
    age_category text NOT NULL, -- adult, youth, senior, etc.
    ticket_type text NOT NULL, -- day, multi_day, window, advance, etc.
    price_amount numeric(10,2),
    currency char(3) NOT NULL CHECK (currency IN ('USD','CAD')),
    days_included smallint DEFAULT 1,
    is_from_price boolean DEFAULT false,
    blackout_or_restrictions text,
    booking_url text,
    source_id uuid REFERENCES source_records(id)
);
CREATE INDEX ticket_prices_resort_visit ON ticket_price_observations(resort_id,visit_date,observed_at DESC);

CREATE TABLE metric_provenance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    entity_table text NOT NULL,
    field_name text NOT NULL,
    season text,
    source_id uuid NOT NULL REFERENCES source_records(id),
    verification_status text NOT NULL DEFAULT 'pending'
      CHECK (verification_status IN ('verified','estimated','conflicting','pending')),
    verified_at timestamptz,
    notes text
);

-- Optional future: daily mountain conditions and snow observations should live in
-- separate history tables keyed by measured_at, never in mountain_stats.

-- Many destination names refer to several separately identifiable ski mountains
-- or base areas. Keep those components distinct instead of double-counting their stats.
CREATE TABLE resort_components (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    name text NOT NULL,
    component_type text NOT NULL CHECK (component_type IN ('mountain','base_area','sector','other')),
    component_notes text,
    latitude decimal(9,6), longitude decimal(9,6)
);

-- Optional OSM/OpenSkiData geographic run layer, separate from named trails.
-- A signed trail can consist of several digitized segments; do not equate segments with named runs.
CREATE TABLE run_segments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
    source_feature_id text,
    name text,
    local_difficulty text,
    activity_type text DEFAULT 'downhill',
    length_m numeric(12,2),
    geometry_geojson jsonb,
    source_id uuid REFERENCES source_records(id),
    last_verified_at timestamptz
);
CREATE INDEX run_segments_resort ON run_segments(resort_id);

CREATE TABLE media_assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resort_id uuid REFERENCES resorts(id) ON DELETE CASCADE,
    media_type text NOT NULL CHECK (media_type IN ('photo','map','illustration')),
    original_url text,
    hosted_url text,
    attribution text,
    license_name text,
    license_or_permission_notes text,
    permission_verified_at timestamptz,
    publication_approved boolean DEFAULT false
);
