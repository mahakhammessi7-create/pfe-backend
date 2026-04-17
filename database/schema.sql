-- ═══════════════════════════════════════════════════════════════
--  ANCS · Schéma SSI Complet — 7 catégories d'indicateurs
-- ═══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ── UTILISATEURS ────────────────────────────────────────────────
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) CHECK (role IN ('admin','client')) NOT NULL DEFAULT 'client',
  company_name  VARCHAR(255),
  sector        VARCHAR(100),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login    TIMESTAMP
);

INSERT INTO users (username, email, password_hash, role)
VALUES ('admin2', 'admin@ancs.tn', 'admin123', 'admin');

-- ── RAPPORTS D'AUDIT SSI ────────────────────────────────────────
CREATE TABLE reports (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  file_name     VARCHAR(255),
  file_path     VARCHAR(500),
  upload_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status        VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending','valid','validated','rejected')),
  validated_by  INTEGER REFERENCES users(id),
  validation_date TIMESTAMP,

  -- Identité organisme
  organism_name    VARCHAR(255),
  organism_sector  VARCHAR(100),
  organism_address TEXT,
  headquarters     VARCHAR(255),

  -- Score global
  compliance_score INTEGER CHECK (compliance_score BETWEEN 0 AND 100),
  is_compliant     BOOLEAN DEFAULT FALSE,
  maturity_level   INTEGER CHECK (maturity_level BETWEEN 1 AND 5),

  -- ─── 1. GOUVERNANCE ET ORGANISATION ───────────────────────────
  has_rssi              BOOLEAN DEFAULT FALSE,  -- RSSI nommé
  has_pssi              BOOLEAN DEFAULT FALSE,  -- PSSI existante
  pssi_update_date      DATE,                   -- Date MAJ PSSI
  pssi_updated_within_2y BOOLEAN GENERATED ALWAYS AS (
    pssi_update_date IS NOT NULL AND pssi_update_date >= CURRENT_DATE - INTERVAL '2 years'
  ) STORED,
  has_risk_analysis     BOOLEAN DEFAULT FALSE,  -- Analyse risques réalisée
  risk_analysis_date    DATE,
  security_committee    BOOLEAN DEFAULT FALSE,  -- Comité sécurité actif
  security_budget       INTEGER,                -- Budget sécurité (TND)
  security_budget_pct   NUMERIC(5,2),           -- % du budget IT dédié SSI
  staff_ssi_trained_pct INTEGER,                -- % personnel formé SSI

  -- ─── 2. CONTINUITÉ D'ACTIVITÉ (PCA/PRA) ───────────────────────
  has_pca               BOOLEAN DEFAULT FALSE,  -- Plan de Continuité d'Activité
  has_pra               BOOLEAN DEFAULT FALSE,  -- Plan de Reprise d'Activité
  pca_test_done         BOOLEAN DEFAULT FALSE,  -- Exercice PCA réalisé
  pca_last_test_date    DATE,
  restore_test_success_pct INTEGER,             -- Taux réussite tests restauration
  rto_hours             INTEGER,                -- RTO en heures
  rpo_hours             INTEGER,                -- RPO en heures
  critical_systems_covered BOOLEAN DEFAULT FALSE,

  -- ─── 3. GESTION DES ACTIFS ET VULNÉRABILITÉS ──────────────────
  total_workstations    INTEGER,                -- Nombre total postes
  eol_workstations      INTEGER DEFAULT 0,      -- Postes EoL (Windows 7 etc.)
  eol_servers           INTEGER DEFAULT 0,      -- Serveurs EoL (Windows 2012 etc.)
  total_servers         INTEGER,
  patch_compliance_pct  INTEGER,                -- Taux conformité patchs (%)
  antivirus_coverage_pct INTEGER,               -- Taux couverture antivirale (%)
  vuln_scan_done        BOOLEAN DEFAULT FALSE,  -- Scan vulnérabilités réalisé
  vuln_scan_date        DATE,
  critical_vulns_open   INTEGER DEFAULT 0,      -- Vulnérabilités critiques ouvertes
  asset_inventory_done  BOOLEAN DEFAULT FALSE,  -- Inventaire actifs réalisé

  -- ─── 4. SÉCURITÉ TECHNIQUE ────────────────────────────────────
  has_firewall          BOOLEAN DEFAULT FALSE,
  has_ids_ips           BOOLEAN DEFAULT FALSE,  -- IDS/IPS déployé
  siem_coverage_pct     INTEGER DEFAULT 0,      -- Couverture SIEM (% équipements)
  mfa_enabled           BOOLEAN DEFAULT FALSE,  -- Authentification multi-facteurs
  encryption_at_rest    BOOLEAN DEFAULT FALSE,  -- Chiffrement données au repos
  encryption_in_transit BOOLEAN DEFAULT FALSE,  -- Chiffrement en transit
  network_segmentation  BOOLEAN DEFAULT FALSE,  -- Segmentation réseau
  pentest_done          BOOLEAN DEFAULT FALSE,  -- Test d'intrusion réalisé
  pentest_date          DATE,
  incidents_count       INTEGER DEFAULT 0,      -- Incidents détectés
  incidents_resolved_pct INTEGER DEFAULT 0,     -- Taux résolution incidents (%)
  user_count            INTEGER,

  -- ─── 5. SAUVEGARDE ────────────────────────────────────────────
  backup_policy_exists  BOOLEAN DEFAULT FALSE,  -- Politique sauvegarde documentée
  backup_frequency      VARCHAR(50),            -- 'daily','weekly','monthly'
  backup_tested         BOOLEAN DEFAULT FALSE,  -- Sauvegardes testées
  backup_offsite        BOOLEAN DEFAULT FALSE,  -- Sauvegarde hors site
  backup_encrypted      BOOLEAN DEFAULT FALSE,  -- Sauvegardes chiffrées
  backup_retention_days INTEGER,                -- Durée rétention (jours)
  backup_coverage_pct   INTEGER,                -- % systèmes critiques sauvegardés

  -- ─── 6. INFRASTRUCTURE PHYSIQUE (DATA CENTER) ─────────────────
  has_datacenter        BOOLEAN DEFAULT FALSE,
  dc_access_control     BOOLEAN DEFAULT FALSE,  -- Contrôle d'accès physique DC
  dc_fire_suppression   BOOLEAN DEFAULT FALSE,  -- Système extinction incendie
  dc_ups_redundancy     BOOLEAN DEFAULT FALSE,  -- Alimentation redondante (UPS)
  dc_cooling_redundancy BOOLEAN DEFAULT FALSE,  -- Climatisation redondante
  dc_cctv               BOOLEAN DEFAULT FALSE,  -- Vidéosurveillance
  dc_tier_level         INTEGER CHECK (dc_tier_level BETWEEN 1 AND 4),

  -- ─── 7. CONFORMITÉ ET RISQUES ─────────────────────────────────
  iso27001_certified    BOOLEAN DEFAULT FALSE,
  iso27001_date         DATE,
  regulatory_compliant  BOOLEAN DEFAULT FALSE,  -- Conformité réglementaire (BCT, etc.)
  data_classification   BOOLEAN DEFAULT FALSE,  -- Classification des données faite
  gdpr_dpo_appointed    BOOLEAN DEFAULT FALSE,  -- DPO désigné
  audit_internal_done   BOOLEAN DEFAULT FALSE,  -- Audit interne SSI réalisé
  audit_internal_date   DATE,
  last_audit_date       DATE,
  next_audit_date       DATE,
  risk_score            INTEGER CHECK (risk_score BETWEEN 0 AND 100),

  -- Historique
  correction_history    JSONB,
  compliance_details    JSONB,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_user_id       ON reports(user_id);
CREATE INDEX idx_reports_status        ON reports(status);
CREATE INDEX idx_reports_sector        ON reports(organism_sector);
CREATE INDEX idx_reports_upload_date   ON reports(upload_date);

-- ── DONNÉES DE DÉMO ─────────────────────────────────────────────
INSERT INTO users (username, email, password_hash, role, company_name, sector) VALUES
  ('bct_admin',   'contact@bct.tn',      'client123', 'client', 'Banque Centrale de Tunisie', 'Finance'),
  ('sgtn_admin',  'contact@sgtn.tn',     'client123', 'client', 'Société Générale Tunisie',   'Finance'),
  ('bna_admin',   'contact@bna.tn',      'client123', 'client', 'BNA',                         'Finance'),
  ('attijari',    'contact@attijari.tn', 'client123', 'client', 'Attijari Bank',               'Finance'),
  ('uib_admin',   'contact@uib.tn',      'client123', 'client', 'UIB',                         'Finance'),
  ('chu_admin',   'contact@chu.tn',      'client123', 'client', 'CHU Tunis',                   'Santé'),
  ('hrs_admin',   'contact@hrs.tn',      'client123', 'client', 'Hôpital Régional Sfax',       'Santé'),
  ('univ_admin',  'contact@univ.tn',     'client123', 'client', 'Université de Tunis',         'Éducation'),
  ('iset_admin',  'contact@iset.tn',     'client123', 'client', 'ISET Bizerte',                'Éducation'),
  ('supcom',      'contact@supcom.tn',   'client123', 'client', 'Sup''Com',                    'Éducation'),
  ('tt_admin',    'contact@tt.tn',       'client123', 'client', 'Tunisie Telecom',             'Télécoms');

INSERT INTO reports (
  user_id, file_name, organism_name, organism_sector, compliance_score, is_compliant, maturity_level, status,
  has_rssi, has_pssi, pssi_update_date, has_risk_analysis, security_committee, security_budget, security_budget_pct, staff_ssi_trained_pct,
  has_pca, has_pra, pca_test_done, restore_test_success_pct, rto_hours, rpo_hours, critical_systems_covered,
  total_workstations, eol_workstations, eol_servers, total_servers, patch_compliance_pct, antivirus_coverage_pct, vuln_scan_done, critical_vulns_open, asset_inventory_done,
  has_firewall, has_ids_ips, siem_coverage_pct, mfa_enabled, encryption_at_rest, encryption_in_transit, network_segmentation, pentest_done, incidents_count, incidents_resolved_pct, user_count,
  backup_policy_exists, backup_frequency, backup_tested, backup_offsite, backup_encrypted, backup_retention_days, backup_coverage_pct,
  has_datacenter, dc_access_control, dc_fire_suppression, dc_ups_redundancy, dc_cooling_redundancy, dc_cctv, dc_tier_level,
  iso27001_certified, regulatory_compliant, data_classification, gdpr_dpo_appointed, audit_internal_done, risk_score,
  last_audit_date, next_audit_date, upload_date
) VALUES
-- Banque Centrale (excellent)
(2,'bct_audit_2026.pdf','Banque Centrale de Tunisie','Finance',88,TRUE,4,'valid',
 TRUE,TRUE,'2024-06-01',TRUE,TRUE,450000,8.5,85,
 TRUE,TRUE,TRUE,95,4,1,TRUE,
 850,12,2,45,94,97,TRUE,3,TRUE,
 TRUE,TRUE,82,TRUE,TRUE,TRUE,TRUE,TRUE,8,90,1200,
 TRUE,'daily',TRUE,TRUE,TRUE,365,95,
 TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,3,
 TRUE,TRUE,TRUE,TRUE,TRUE,15,
 '2025-03-15','2026-03-15','2026-03-21'),

-- Société Générale (bon)
(3,'sgtn_audit_2026.pdf','Société Générale Tunisie','Finance',72,TRUE,3,'pending',
 TRUE,FALSE,NULL,TRUE,TRUE,180000,5.2,60,
 TRUE,TRUE,FALSE,70,8,4,TRUE,
 420,35,8,22,78,88,TRUE,12,TRUE,
 TRUE,TRUE,55,FALSE,TRUE,TRUE,FALSE,FALSE,15,75,650,
 TRUE,'daily',TRUE,FALSE,FALSE,180,80,
 TRUE,TRUE,FALSE,TRUE,TRUE,TRUE,2,
 FALSE,TRUE,FALSE,FALSE,TRUE,35,
 '2024-09-10','2026-09-10','2026-03-21'),

-- BNA (bon)
(4,'bna_audit_2026.pdf','BNA','Finance',81,TRUE,4,'pending',
 TRUE,TRUE,'2023-11-20',TRUE,TRUE,220000,6.0,72,
 TRUE,TRUE,TRUE,88,6,2,TRUE,
 680,18,4,32,88,93,TRUE,6,TRUE,
 TRUE,TRUE,71,TRUE,TRUE,TRUE,TRUE,FALSE,10,82,980,
 TRUE,'daily',TRUE,TRUE,TRUE,270,90,
 TRUE,TRUE,TRUE,TRUE,FALSE,TRUE,3,
 FALSE,TRUE,TRUE,FALSE,TRUE,22,
 '2025-01-20','2026-01-20','2026-03-21'),

-- Attijari Bank (moyen)
(5,'attijari_audit_2026.pdf','Attijari Bank','Finance',67,TRUE,3,'pending',
 TRUE,FALSE,NULL,TRUE,FALSE,150000,4.1,48,
 TRUE,FALSE,FALSE,55,12,6,FALSE,
 530,48,11,28,72,85,FALSE,22,TRUE,
 TRUE,FALSE,38,FALSE,FALSE,TRUE,FALSE,FALSE,22,60,820,
 TRUE,'weekly',FALSE,FALSE,FALSE,90,70,
 TRUE,TRUE,FALSE,FALSE,TRUE,FALSE,2,
 FALSE,FALSE,FALSE,FALSE,TRUE,52,
 '2024-06-05','2026-06-05','2026-03-21'),

-- UIB (faible)
(6,'uib_audit_2026.pdf','UIB','Finance',44,FALSE,2,'pending',
 FALSE,FALSE,NULL,FALSE,FALSE,50000,1.8,22,
 FALSE,FALSE,FALSE,30,24,12,FALSE,
 310,82,18,15,45,62,FALSE,41,FALSE,
 TRUE,FALSE,15,FALSE,FALSE,FALSE,FALSE,FALSE,38,40,450,
 FALSE,'monthly',FALSE,FALSE,FALSE,30,40,
 FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,1,
 FALSE,FALSE,FALSE,FALSE,FALSE,78,
 '2023-12-01','2025-12-01','2026-03-21'),

-- CHU Tunis (bon)
(7,'chu_audit_2026.pdf','CHU Tunis','Santé',79,TRUE,3,'pending',
 TRUE,TRUE,'2024-02-14',TRUE,TRUE,120000,4.5,65,
 TRUE,TRUE,TRUE,82,6,3,TRUE,
 420,28,5,18,82,91,TRUE,8,TRUE,
 TRUE,TRUE,60,FALSE,TRUE,TRUE,TRUE,FALSE,12,80,1500,
 TRUE,'daily',TRUE,TRUE,FALSE,180,85,
 TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,2,
 FALSE,TRUE,TRUE,FALSE,TRUE,28,
 '2024-11-10','2026-11-10','2026-03-22'),

-- Hôpital Régional Sfax (moyen)
(8,'hrs_audit_2026.pdf','Hôpital Régional Sfax','Santé',61,TRUE,2,'pending',
 TRUE,FALSE,NULL,FALSE,FALSE,45000,2.8,38,
 FALSE,TRUE,FALSE,45,18,8,FALSE,
 180,42,9,8,62,78,FALSE,18,FALSE,
 TRUE,FALSE,22,FALSE,FALSE,FALSE,FALSE,FALSE,20,55,620,
 FALSE,'weekly',FALSE,FALSE,FALSE,60,55,
 FALSE,FALSE,FALSE,TRUE,FALSE,FALSE,1,
 FALSE,FALSE,FALSE,FALSE,FALSE,62,
 '2024-05-20','2026-05-20','2026-03-28'),

-- Université de Tunis (moyen)
(9,'univ_audit_2026.pdf','Université de Tunis','Éducation',63,TRUE,3,'pending',
 TRUE,FALSE,NULL,TRUE,FALSE,80000,3.2,44,
 TRUE,FALSE,FALSE,60,12,6,FALSE,
 950,125,22,42,68,82,FALSE,28,TRUE,
 TRUE,FALSE,30,FALSE,FALSE,FALSE,FALSE,FALSE,18,65,4200,
 TRUE,'weekly',FALSE,FALSE,FALSE,90,65,
 FALSE,FALSE,FALSE,FALSE,FALSE,TRUE,1,
 FALSE,FALSE,FALSE,FALSE,FALSE,55,
 '2024-08-15','2026-08-15','2026-03-28'),

-- ISET Bizerte (faible)
(10,'iset_audit_2026.pdf','ISET Bizerte','Éducation',48,FALSE,2,'pending',
 FALSE,FALSE,NULL,FALSE,FALSE,25000,1.5,18,
 FALSE,FALSE,FALSE,25,24,12,FALSE,
 280,95,14,12,42,58,FALSE,35,FALSE,
 TRUE,FALSE,10,FALSE,FALSE,FALSE,FALSE,FALSE,28,42,1100,
 FALSE,'monthly',FALSE,FALSE,FALSE,30,40,
 FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,1,
 FALSE,FALSE,FALSE,FALSE,FALSE,72,
 '2023-06-01','2025-06-01','2026-04-01'),

-- Sup'Com (moyen)
(11,'supcom_audit_2026.pdf','Sup''Com','Éducation',58,TRUE,2,'pending',
 TRUE,FALSE,NULL,FALSE,FALSE,35000,2.0,30,
 FALSE,FALSE,FALSE,40,18,9,FALSE,
 320,58,10,16,58,72,FALSE,22,FALSE,
 TRUE,FALSE,20,FALSE,FALSE,FALSE,FALSE,FALSE,14,55,820,
 TRUE,'weekly',FALSE,FALSE,FALSE,60,58,
 FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,1,
 FALSE,FALSE,FALSE,FALSE,FALSE,65,
 '2024-01-10','2026-01-10','2026-04-01'),

-- Tunisie Telecom (moyen-bon)
(12,'tt_audit_2026.pdf','Tunisie Telecom','Télécoms',75,TRUE,3,'pending',
 TRUE,TRUE,'2024-08-10',TRUE,TRUE,350000,7.2,70,
 TRUE,TRUE,TRUE,78,6,2,TRUE,
 620,22,6,38,85,90,TRUE,14,TRUE,
 TRUE,TRUE,68,TRUE,TRUE,TRUE,TRUE,TRUE,25,72,2800,
 TRUE,'daily',TRUE,TRUE,TRUE,270,88,
 TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,3,
 FALSE,TRUE,TRUE,FALSE,TRUE,32,
 '2025-02-15','2026-02-15','2026-04-01');