const db = require('../utils/db');

/* ─────────────────────────────────────────────
   SOUMETTRE UN RAPPORT (client)
   POST /api/reports/upload
───────────────────────────────────────────── */
const uploadReport = async (req, res) => {
  try {
    const {
      filename,
      compliance_score,
      is_compliant,
      organism_name,
      organism_sector,
      extracted_data,
    } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Nom de fichier manquant' });
    }

    // Get organism info from user profile if not provided
    const userResult = await db.query('SELECT company_name, sector FROM users WHERE id = $1', [req.user.id]);
    const userProfile = userResult.rows[0] || {};

    const finalOrganismName   = organism_name   || userProfile.company_name || 'Organisme inconnu';
    const finalOrganismSector = organism_sector || userProfile.sector       || 'Non défini';
    const finalIsCompliant    = is_compliant    !== undefined ? is_compliant : (compliance_score >= 75);

    const result = await db.query(
      `INSERT INTO reports
         (user_id, file_name, upload_date, status, compliance_score,
          is_compliant, organism_name, organism_sector, compliance_details)
       VALUES ($1, $2, NOW(), 'pending', $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        filename,
        compliance_score || null,
        finalIsCompliant,
        finalOrganismName,
        finalOrganismSector,
        extracted_data ? JSON.stringify(extracted_data) : null,
      ]
    );

    res.status(201).json({ message: 'Rapport soumis avec succès', report: result.rows[0] });
  } catch (error) {
    console.error('Erreur uploadReport:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/* ─────────────────────────────────────────────
   RAPPORTS DE L'UTILISATEUR CONNECTÉ (client)
   GET /api/reports/my
───────────────────────────────────────────── */
const getUserReports = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const [data, count] = await Promise.all([
      db.query(
        `SELECT id, file_name, upload_date, status, compliance_score,
                organism_name, organism_sector, maturity_level, risk_score,
                has_rssi, has_pssi
         FROM reports WHERE user_id = $1
         ORDER BY upload_date DESC LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset]
      ),
      db.query('SELECT COUNT(*) AS total FROM reports WHERE user_id = $1', [req.user.id]),
    ]);

    res.json({
      data: data.rows,
      pagination: {
        page, limit,
        total:      parseInt(count.rows[0].total),
        totalPages: Math.ceil(count.rows[0].total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur getUserReports:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/* ─────────────────────────────────────────────
   TOUS LES RAPPORTS (admin)
   GET /api/reports/all
───────────────────────────────────────────── */
const getAllReports = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)   || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;
    const status = req.query.status || null;
    const sector = req.query.sector || null;

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (status) { conditions.push(`r.status = $${idx++}`); params.push(status); }
    if (sector) { conditions.push(`r.organism_sector = $${idx++}`); params.push(sector); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      db.query(
        `SELECT 
           r.id,
           r.file_name,
           r.upload_date,
           r.status,
           r.compliance_score,
           r.organism_name   AS company_name,
           r.organism_sector AS sector,
           r.has_rssi,
           r.has_pssi,
           r.maturity_level,
           r.risk_score,
           r.incidents_count,
           r.critical_vulns_open,
           r.has_pca,
           r.has_pra,
           u.email
         FROM reports r
         LEFT JOIN users u ON r.user_id = u.id
         ${where}
         ORDER BY r.upload_date DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      db.query(
        `SELECT COUNT(*) AS total FROM reports r ${where}`,
        params
      ),
    ]);

    res.json({
      data: data.rows,
      pagination: {
        page, limit,
        total:      parseInt(count.rows[0].total),
        totalPages: Math.ceil(count.rows[0].total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur getAllReports:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

/* ─────────────────────────────────────────────
   CHANGER STATUT D'UN RAPPORT (admin)
   PATCH /api/reports/:id/status
───────────────────────────────────────────── */
const updateReportStatus = async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;

    const allowed = ['pending', 'valid', 'validated', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide. Valeurs: pending, valid, validated, rejected' });
    }

    const result = await db.query(
      `UPDATE reports 
       SET status = $1, validation_date = NOW(), validated_by = $2
       WHERE id = $3 RETURNING *`,
      [status, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rapport introuvable' });
    }

    res.json({ message: 'Statut mis à jour', report: result.rows[0] });
  } catch (error) {
    console.error('Erreur updateReportStatus:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

module.exports = { uploadReport, getUserReports, getAllReports, updateReportStatus };