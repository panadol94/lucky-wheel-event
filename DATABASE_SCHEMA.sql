-- ============================================================
-- LUCKY WHEEL EVENT - Database Schema
-- Fixed Pool System (not probability-based)
-- PostgreSQL / MySQL compatible
-- ============================================================

-- Admins table
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(200),
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Event Settings
CREATE TABLE event_settings (
    id SERIAL PRIMARY KEY,
    event_title VARCHAR(255) DEFAULT '🎡 Lucky Wheel Event',
    event_subtitle VARCHAR(500),
    claim_instructions TEXT,
    claim_whatsapp VARCHAR(20) DEFAULT '601133388859',
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Prizes Table (Fixed Pool System)
CREATE TABLE prizes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),          -- total available in pool
    remaining INTEGER NOT NULL DEFAULT 0 CHECK (remaining >= 0),         -- still available to be won
    color_primary VARCHAR(20) DEFAULT '#FFD700',
    color_secondary VARCHAR(20) DEFAULT '#FFA500',
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (remaining <= quantity)
);

-- Whitelist Users (eligible participants)
CREATE TABLE whitelist_users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    agent_id VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES admins(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Spin Records (main anti-abuse table)
CREATE TABLE spin_records (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(100) NOT NULL,
    prize_id INTEGER REFERENCES prizes(id),
    prize_name VARCHAR(100) NOT NULL,
    device_fingerprint VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    spun_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    claim_status VARCHAR(20) DEFAULT 'pending' CHECK (claim_status IN ('pending', 'claimed', 'rejected')),
    claimed_at TIMESTAMP,
    claimed_by INTEGER REFERENCES admins(id),
    admin_notes TEXT,
    UNIQUE(agent_id)
);

-- Indexes for performance
CREATE INDEX idx_whitelist_active ON whitelist_users(agent_id) WHERE is_active = TRUE;
CREATE INDEX idx_spin_records_spin_at ON spin_records(spun_at);
CREATE INDEX idx_spin_records_claim ON spin_records(claim_status);
CREATE INDEX idx_spin_records_prize ON spin_records(prize_id);

-- ============================================================
-- SEED DATA - Fixed Pool Prizes for 84 participants
-- Wheel shows 6 prizes, but only 4 have stock (84 total)
-- 80 RM100, 2 RM188, 1 RM288, 1 RM588 = 84 distributed prizes
-- RM388 + 5G GOLD = visible on wheel but no stock
-- ============================================================
INSERT INTO prizes (name, quantity, remaining, color_primary, color_secondary, display_order) VALUES
('RM100', 80, 80, '#FFD700', '#FFA500', 1),
('RM188', 2, 2, '#FF6B6B', '#FF8E53', 2),
('RM288', 1, 1, '#8E2DE2', '#FF6FD8', 3),
('RM388', 0, 0, '#FF4500', '#FF8C00', 4),
('RM588', 1, 1, '#00C6FF', '#0072FF', 5),
('5G GOLD', 0, 0, '#F7971E', '#FFD200', 6);

-- Seed Event Settings
INSERT INTO event_settings (event_title, claim_whatsapp) VALUES
('🎡 CM8 Lucky Wheel Event', '60113338859');

-- Default Admin (password: admin123)
-- Password hash: bcrypt('admin123') = $2b$10$...
INSERT INTO admins (username, password_hash, name) VALUES
('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super Admin');
