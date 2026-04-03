-- ============================================================
-- HUD Video Studio Migration
-- Adds video_templates and video_jobs tables to support the
-- Video Template Builder tool in the admin dashboard.
-- ============================================================

-- ─── Video Templates ──────────────────────────────────────────────────────────
-- Stores saved layout/branding templates for video generation.
CREATE TABLE IF NOT EXISTS video_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Template identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,

    -- Agency branding
    agency_name VARCHAR(256) DEFAULT 'Lightkeeper Realty',
    agency_phone VARCHAR(32) DEFAULT '910.363.6147',
    agency_website VARCHAR(256) DEFAULT 'USAHUDhomes.com',
    logo_url TEXT,

    -- Color palette
    color_primary VARCHAR(16) DEFAULT '#1a2744',
    color_accent VARCHAR(16) DEFAULT '#e8a020',
    color_background VARCHAR(16) DEFAULT '#0d1b2a',
    color_text VARCHAR(16) DEFAULT '#ffffff',

    -- Typography
    font_family VARCHAR(64) DEFAULT 'DejaVu Sans',

    -- CTA slide content
    cta_line1 VARCHAR(512) DEFAULT 'Visit USAHUDhomes.com',
    cta_line2 VARCHAR(512) DEFAULT 'Call Marc Spencer: 910.363.6147',
    cta_line3 VARCHAR(512) DEFAULT 'Get pre-qualified & bid',

    -- Incentives slide content
    incentive1_title VARCHAR(64) DEFAULT '$100 DOWN',
    incentive1_sub VARCHAR(64) DEFAULT 'FHA Loan',
    incentive1_body VARCHAR(512) DEFAULT 'Buy this HUD home with just $100 down using an FHA loan.',
    incentive2_title VARCHAR(64) DEFAULT '3% CLOSING',
    incentive2_sub VARCHAR(64) DEFAULT 'Costs Paid',
    incentive2_body VARCHAR(512) DEFAULT 'HUD pays up to 3% of the purchase price toward closing costs.',
    incentive3_title VARCHAR(64) DEFAULT '$35K REPAIR',
    incentive3_sub VARCHAR(64) DEFAULT '203k Escrow',
    incentive3_body VARCHAR(512) DEFAULT 'Finance repairs into your mortgage with a 203k escrow loan.',

    -- Animated subscribe overlay
    subscribe_overlay_enabled BOOLEAN DEFAULT true,
    subscribe_overlay_start_sec FLOAT DEFAULT 2.0,
    subscribe_overlay_duration_sec FLOAT DEFAULT 2.5,

    -- Slide layout
    slide_order JSONB DEFAULT '["hero","details","incentives","agency","cta"]'::jsonb,
    slide_duration_sec FLOAT DEFAULT 4.0,
    transition_duration_sec FLOAT DEFAULT 0.4,

    -- Video format
    video_format VARCHAR(16) DEFAULT 'reels',  -- 'reels' (1080x1920) or 'landscape' (1280x720)

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── Video Jobs ────────────────────────────────────────────────────────────────
-- Tracks each video generation job tied to a property + template.
CREATE TABLE IF NOT EXISTS video_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- References
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    template_id UUID REFERENCES video_templates(id) ON DELETE SET NULL,
    case_number VARCHAR(50),

    -- Job state
    status VARCHAR(32) DEFAULT 'queued'
        CHECK (status IN ('queued', 'processing', 'done', 'error')),
    progress INTEGER DEFAULT 0,
    error_message TEXT,

    -- Timing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Output
    s3_key TEXT,
    s3_url TEXT,
    thumbnail_url TEXT,
    duration_sec FLOAT,
    file_size_bytes BIGINT,

    -- YouTube upload
    youtube_video_id TEXT,
    youtube_url TEXT,
    youtube_title TEXT,
    youtube_description TEXT,
    uploaded_to_youtube BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMP,

    -- Notification
    email_sent BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_video_jobs_property_id ON video_jobs(property_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_template_id ON video_jobs(template_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_created_at ON video_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_templates_is_default ON video_templates(is_default);

-- ─── Auto-update trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_video_studio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_video_templates_updated_at ON video_templates;
CREATE TRIGGER trg_video_templates_updated_at
    BEFORE UPDATE ON video_templates
    FOR EACH ROW EXECUTE FUNCTION update_video_studio_updated_at();

DROP TRIGGER IF EXISTS trg_video_jobs_updated_at ON video_jobs;
CREATE TRIGGER trg_video_jobs_updated_at
    BEFORE UPDATE ON video_jobs
    FOR EACH ROW EXECUTE FUNCTION update_video_studio_updated_at();

-- ─── Seed default template ────────────────────────────────────────────────────
INSERT INTO video_templates (
    name, description, is_default,
    agency_name, agency_phone, agency_website,
    color_primary, color_accent, color_background, color_text,
    font_family,
    cta_line1, cta_line2, cta_line3,
    incentive1_title, incentive1_sub, incentive1_body,
    incentive2_title, incentive2_sub, incentive2_body,
    incentive3_title, incentive3_sub, incentive3_body,
    subscribe_overlay_enabled, video_format
)
VALUES (
    'Lightkeeper Default', 'Default Reels/Shorts template for Lightkeeper Realty', true,
    'Lightkeeper Realty', '910.363.6147', 'USAHUDhomes.com',
    '#1a2744', '#e8a020', '#0d1b2a', '#ffffff',
    'DejaVu Sans',
    'Visit USAHUDhomes.com', 'Call Marc Spencer: 910.363.6147', 'Get pre-qualified & bid',
    '$100 DOWN', 'FHA Loan', 'Buy this HUD home with just $100 down using an FHA loan.',
    '3% CLOSING', 'Costs Paid', 'HUD pays up to 3% of the purchase price toward closing costs.',
    '$35K REPAIR', '203k Escrow', 'Finance repairs into your mortgage with a 203k escrow loan.',
    true, 'reels'
)
ON CONFLICT DO NOTHING;
