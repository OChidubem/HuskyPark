-- ============================================================
-- HuskyPark Predictor — Seed Data
-- Real SCSU lot names, GPS coordinates, and lookup values
-- ============================================================

-- ── Permit Categories ─────────────────────────────────────────
INSERT INTO permit_category (code, name, description) VALUES
('COMMUTER',  'Student / Commuter', 'General student and commuter surface lots'),
('RESIDENT',  'Resident',           'Residence hall and N lot access'),
('EMPLOYEE',  'Employee',           'Faculty and staff designated lots'),
('VISITOR',   'Visitor / Pay',      'Visitor and paid ramp parking')
ON CONFLICT (code) DO NOTHING;

-- ── Report Status Types ───────────────────────────────────────
INSERT INTO report_status_type (status_name, description) VALUES
('found_spot',   'Reporter found parking without difficulty'),
('hard_to_find', 'Parking was available but difficult to find'),
('lot_full',     'Lot appeared full or nearly full')
ON CONFLICT (status_name) DO NOTHING;

-- ── Parking Lots ──────────────────────────────────────────────
INSERT INTO parking_lot (lot_code, lot_name, lot_type, zone, capacity, latitude, longitude) VALUES
-- Commuter / Student
('A',   'Lot A',         'commuter', 'North',  120, 45.5603, -94.1512),
('C',   'Lot C',         'commuter', 'Central',185, 45.5598, -94.1505),
('E',   'Lot E',         'commuter', 'West',    95, 45.5595, -94.1520),
('K',   'Lot K',         'commuter', 'East',   210, 45.5609, -94.1495),
('M',   'Lot M',         'commuter', 'South',  165, 45.5601, -94.1530),
('V',   'Lot V',         'commuter', 'West',    88, 45.5592, -94.1540),
('SV',  'Stateview Lot', 'commuter', 'South',  140, 45.5578, -94.1558),
-- Resident
('N',   'Lot N',         'resident', 'North',   80, 45.5612, -94.1488),
('R1',  'RES Lot 1',     'resident', 'East',    75, 45.5618, -94.1480),
('R2',  'RES Lot 2',     'resident', 'East',    70, 45.5621, -94.1474),
-- Employee
('AA',  'Lot AA',        'employee', 'West',   110, 45.5590, -94.1545),
('B',   'Lot B',         'employee', 'South',  145, 45.5585, -94.1552),
('D',   'Lot D',         'employee', 'South',   90, 45.5580, -94.1560),
-- Pay / Visitor
('RAMP','4th Ave Ramp',  'ramp',     'Central',420, 45.5620, -94.1465),
('HUS', 'Husky Lot',     'visitor',  'North',  140, 45.5630, -94.1460),
('EST', 'Eastman Lot',   'visitor',  'East',   100, 45.5625, -94.1470),
('ISF', 'ISELF Lot',     'visitor',  'North',   85, 45.5635, -94.1455),
('MIL', 'Miller Lot',    'visitor',  'North',   60, 45.5640, -94.1450),
('STH', 'South Lot',     'visitor',  'South',  110, 45.5575, -94.1575)
ON CONFLICT (lot_code) DO NOTHING;

-- ── Campus Events ─────────────────────────────────────────────
INSERT INTO campus_event (title, location, event_start, event_end, expected_attendance) VALUES
('Spring Commencement',    'Herb Brooks National Hockey Center', '2026-05-02 10:00', '2026-05-02 13:00', 2500),
('Admissions Open House',  'Atwood Memorial Center',             '2026-04-11 09:00', '2026-04-11 14:00',  800),
('Homecoming Football',    'Husky Athletic Complex',             '2026-10-03 14:00', '2026-10-03 17:00', 3000),
('Career Fair',            'Atwood Memorial Center',             '2026-03-18 09:00', '2026-03-18 15:00',  600),
('Graduate Orientation',   'Brown Hall',                         '2026-08-25 08:00', '2026-08-25 12:00',  400)
ON CONFLICT DO NOTHING;

-- ── Simulated Weather Snapshots ───────────────────────────────
INSERT INTO weather_snapshot (recorded_at, temperature_f, condition, precipitation_in, wind_speed_mph, source) VALUES
(NOW() - INTERVAL '1 hour',  22.4, 'snow',   0.3, 12.5, 'OpenWeatherMap'),
(NOW() - INTERVAL '2 hours', 24.1, 'snow',   0.2, 10.0, 'OpenWeatherMap'),
(NOW() - INTERVAL '3 hours', 27.0, 'cloudy', 0.0,  8.3, 'OpenWeatherMap'),
(NOW() - INTERVAL '4 hours', 28.5, 'cloudy', 0.0,  7.1, 'OpenWeatherMap')
ON CONFLICT DO NOTHING;

-- ── Simulated Spot Reports ────────────────────────────────────
INSERT INTO lot_status_report (lot_id, status_type_id, report_time, approx_available, confidence_score, source_type)
SELECT
    pl.lot_id,
    rst.status_type_id,
    NOW() - (INTERVAL '1 hour' * gs.n),
    CASE d.status_name
        WHEN 'found_spot' THEN 8
        WHEN 'hard_to_find' THEN 3
        ELSE 0
    END,
    0.75,
    'simulated'
FROM (VALUES
    ('C', 'found_spot'),   ('C', 'hard_to_find'), ('M', 'lot_full'),
    ('A', 'found_spot'),   ('K', 'found_spot'),   ('N', 'found_spot')
) AS d(lot_code, status_name)
CROSS JOIN (SELECT generate_series(1, 3) AS n) gs
JOIN parking_lot pl        ON pl.lot_code         = d.lot_code
JOIN report_status_type rst ON rst.status_name     = d.status_name
ON CONFLICT DO NOTHING;
