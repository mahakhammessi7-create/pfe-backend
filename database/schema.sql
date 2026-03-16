-- Supprimer les tables si elles existent
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS users;

-- Table des utilisateurs
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'client')) NOT NULL DEFAULT 'client',
    company_name VARCHAR(255),
    sector VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Insérer un admin par défaut
INSERT INTO users (username, email, password_hash, role) 
VALUES ('admin', 'admin@ancs.tn', 'admin123', 'admin');

-- Table des rapports
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    compliance_score INTEGER,
    is_compliant BOOLEAN DEFAULT FALSE,
    compliance_details JSONB,
    organism_name VARCHAR(255),
    organism_sector VARCHAR(100),
    has_rssi BOOLEAN DEFAULT FALSE,
    has_pssi BOOLEAN DEFAULT FALSE,
    maturity_level INTEGER,
    incidents_count INTEGER,
    server_count INTEGER,
    user_count INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    validated_by INTEGER REFERENCES users(id),
    validation_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour performances
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);

-- Ajouter des données de test
INSERT INTO users (username, email, password_hash, role, company_name, sector) 
VALUES 
  ('societe_test', 'contact@test.tn', 'client123', 'client', 'Société de Test', 'Finance'),
  ('banque_centrale', 'contact@bct.tn', 'client123', 'client', 'Banque Centrale', 'Finance'),
  ('hopital_universitaire', 'contact@chu.tn', 'client123', 'client', 'Hôpital Universitaire', 'Santé');

-- Ajouter des rapports de test
INSERT INTO reports (user_id, file_name, compliance_score, is_compliant, organism_name, organism_sector, has_rssi, has_pssi, maturity_level, incidents_count, status) 
VALUES 
  (2, 'rapport_audit_2025.pdf', 85, true, 'Société de Test', 'Finance', true, true, 4, 12, 'validated'),
  (2, 'rapport_audit_2024.pdf', 72, true, 'Société de Test', 'Finance', true, false, 3, 8, 'validated'),
  (3, 'audit_securite_2025.pdf', 68, true, 'Banque Centrale', 'Finance', true, true, 4, 5, 'validated'),
  (4, 'rapport_hopital_2025.pdf', 45, false, 'Hôpital Universitaire', 'Santé', false, false, 2, 23, 'pending');