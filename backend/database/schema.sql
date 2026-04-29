-- ============================================================
-- HuskyPark Predictor — PostgreSQL DDL
-- Database: huskypark_db
-- Phase 2 schema (revised + password_hash + parking_prediction)
-- ============================================================

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_user (
    user_id       BIGSERIAL PRIMARY KEY,
    full_name     VARCHAR(120) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    role          VARCHAR(30)  NOT NULL
                    CHECK (role IN ('student','resident','employee','visitor','admin')),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Permit Categories ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permit_category (
    permit_category_id BIGSERIAL PRIMARY KEY,
    code               VARCHAR(20)  NOT NULL UNIQUE,
    name               VARCHAR(80)  NOT NULL,
    description        TEXT
);

-- ── Parking Lots ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_lot (
    lot_id     BIGSERIAL PRIMARY KEY,
    lot_code   VARCHAR(20)  NOT NULL UNIQUE,
    lot_name   VARCHAR(100) NOT NULL,
    lot_type   VARCHAR(30)  NOT NULL
                 CHECK (lot_type IN ('resident','commuter','employee','visitor','mixed','ramp')),
    zone       VARCHAR(50),
    capacity   INTEGER      NOT NULL CHECK (capacity > 0),
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    latitude   DECIMAL(9,6),
    longitude  DECIMAL(9,6)
);

-- ── Lot ↔ Permit Access (M:N) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS lot_permit_access (
    lot_id             BIGINT NOT NULL REFERENCES parking_lot(lot_id)     ON DELETE CASCADE,
    permit_category_id BIGINT NOT NULL REFERENCES permit_category(permit_category_id) ON DELETE CASCADE,
    access_level       VARCHAR(20) NOT NULL CHECK (access_level IN ('allowed','restricted','priority')),
    enforced_from      TIME,
    enforced_to        TIME,
    PRIMARY KEY (lot_id, permit_category_id)
);

-- ── User Permits ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_permit (
    user_permit_id     BIGSERIAL PRIMARY KEY,
    user_id            BIGINT NOT NULL REFERENCES app_user(user_id)        ON DELETE CASCADE,
    permit_category_id BIGINT NOT NULL REFERENCES permit_category(permit_category_id) ON DELETE RESTRICT,
    permit_number      VARCHAR(40) NOT NULL UNIQUE,
    valid_from         DATE NOT NULL,
    valid_to           DATE NOT NULL,
    status             VARCHAR(20) NOT NULL CHECK (status IN ('active','expired','revoked')),
    CONSTRAINT chk_permit_dates CHECK (valid_to >= valid_from)
);

-- ── Campus Events ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campus_event (
    event_id            BIGSERIAL PRIMARY KEY,
    title               VARCHAR(160) NOT NULL,
    location            VARCHAR(120) NOT NULL,
    event_start         TIMESTAMP   NOT NULL,
    event_end           TIMESTAMP   NOT NULL,
    expected_attendance INTEGER      CHECK (expected_attendance >= 0),
    CONSTRAINT chk_event_dates CHECK (event_end >= event_start)
);

-- ── Event ↔ Lot Impact (M:N) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS event_lot_impact (
    event_lot_impact_id BIGSERIAL PRIMARY KEY,
    event_id            BIGINT NOT NULL REFERENCES campus_event(event_id) ON DELETE CASCADE,
    lot_id              BIGINT NOT NULL REFERENCES parking_lot(lot_id)    ON DELETE CASCADE,
    impact_level        VARCHAR(20) NOT NULL CHECK (impact_level IN ('low','medium','high')),
    notes               TEXT,
    CONSTRAINT uq_eli_event_lot UNIQUE (event_id, lot_id)
);

-- ── Report Status Types ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_status_type (
    status_type_id BIGSERIAL PRIMARY KEY,
    status_name    VARCHAR(30) NOT NULL UNIQUE,
    description    TEXT
);

-- ── Crowdsourced Lot Reports ──────────────────────────────────
CREATE TABLE IF NOT EXISTS lot_status_report (
    report_id        BIGSERIAL PRIMARY KEY,
    lot_id           BIGINT NOT NULL REFERENCES parking_lot(lot_id)          ON DELETE CASCADE,
    user_id          BIGINT          REFERENCES app_user(user_id)            ON DELETE SET NULL,
    status_type_id   BIGINT NOT NULL REFERENCES report_status_type(status_type_id) ON DELETE RESTRICT,
    report_time      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approx_available INTEGER          CHECK (approx_available >= 0),
    confidence_score NUMERIC(3,2)     CHECK (confidence_score BETWEEN 0 AND 1),
    note             VARCHAR(300),
    source_type      VARCHAR(20) NOT NULL DEFAULT 'user'
                       CHECK (source_type IN ('user','admin_seed','simulated'))
);

-- ── Weather Snapshots ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weather_snapshot (
    weather_id       BIGSERIAL PRIMARY KEY,
    recorded_at      TIMESTAMP    NOT NULL,
    temperature_f    DECIMAL(5,1),
    condition        VARCHAR(30)  NOT NULL
                       CHECK (condition IN ('clear','cloudy','rain','snow','blizzard','fog')),
    precipitation_in DECIMAL(5,2) DEFAULT 0 CHECK (precipitation_in >= 0),
    wind_speed_mph   DECIMAL(5,1),
    source           VARCHAR(50)
);

-- ── Parking Predictions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS parking_prediction (
    pred_id          BIGSERIAL PRIMARY KEY,
    lot_id           BIGINT NOT NULL REFERENCES parking_lot(lot_id),
    weather_id       BIGINT          REFERENCES weather_snapshot(weather_id),
    predicted_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    target_time      TIMESTAMP NOT NULL,
    prob_score       DECIMAL(5,4) NOT NULL CHECK (prob_score BETWEEN 0 AND 1),
    confidence_level VARCHAR(10)  DEFAULT 'medium'
                       CHECK (confidence_level IN ('low','medium','high')),
    factors_summary  JSONB,
    model_version    VARCHAR(20)
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_prediction_lot_time
    ON parking_prediction (lot_id, target_time DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_factors
    ON parking_prediction USING GIN (factors_summary);

CREATE INDEX IF NOT EXISTS idx_report_lot_time
    ON lot_status_report (lot_id, report_time DESC);

CREATE INDEX IF NOT EXISTS idx_report_status
    ON lot_status_report (status_type_id);

CREATE INDEX IF NOT EXISTS idx_event_time
    ON campus_event (event_start, event_end);

CREATE INDEX IF NOT EXISTS idx_event_lot_impact_lot
    ON event_lot_impact (lot_id);

CREATE INDEX IF NOT EXISTS idx_weather_time
    ON weather_snapshot (recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_permit_user_status
    ON user_permit (user_id, status);

-- ── Views ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_latest_predictions AS
SELECT DISTINCT ON (pp.lot_id)
    pp.pred_id,
    pp.lot_id,
    pl.lot_code,
    pl.lot_name,
    pl.lot_type,
    pp.prob_score,
    pp.confidence_level,
    pp.target_time,
    pp.predicted_at,
    pp.factors_summary,
    pp.model_version
FROM parking_prediction pp
JOIN parking_lot pl ON pl.lot_id = pp.lot_id
ORDER BY pp.lot_id, pp.target_time DESC;

CREATE OR REPLACE VIEW vw_active_user_permits AS
SELECT
    up.user_permit_id,
    up.user_id,
    au.full_name,
    au.email,
    pc.code   AS permit_code,
    pc.name   AS permit_name,
    up.permit_number,
    up.valid_from,
    up.valid_to
FROM user_permit up
JOIN app_user        au ON au.user_id            = up.user_id
JOIN permit_category pc ON pc.permit_category_id = up.permit_category_id
WHERE up.status = 'active'
  AND CURRENT_DATE BETWEEN up.valid_from AND up.valid_to;

CREATE OR REPLACE VIEW vw_lot_dashboard_summary AS
SELECT
    pl.lot_id,
    pl.lot_code,
    pl.lot_name,
    pl.lot_type,
    pl.capacity,
    COUNT(lsr.report_id)                                                    AS report_count,
    MAX(lsr.report_time)                                                    AS last_report_time,
    SUM(CASE WHEN rst.status_name = 'lot_full'     THEN 1 ELSE 0 END)      AS full_reports,
    SUM(CASE WHEN rst.status_name = 'hard_to_find' THEN 1 ELSE 0 END)      AS hard_to_find_reports,
    SUM(CASE WHEN rst.status_name = 'found_spot'   THEN 1 ELSE 0 END)      AS found_spot_reports
FROM parking_lot pl
LEFT JOIN lot_status_report lsr ON lsr.lot_id = pl.lot_id
LEFT JOIN report_status_type rst ON rst.status_type_id = lsr.status_type_id
GROUP BY pl.lot_id, pl.lot_code, pl.lot_name, pl.lot_type, pl.capacity;
