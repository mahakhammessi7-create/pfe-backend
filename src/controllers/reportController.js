const db = require('../utils/db');

/* ─────────────────────────────────────────────
   SOUMETTRE UN RAPPORT (client)
   POST /api/reports/upload
───────────────────────────────────────────── */
const uploadReport = async (req, res) => {
  try {
    const { filename, compliance_score, extracted_data } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Nom de fichier manquant' });
    }

    const result = await db.query(
      `INSERT INTO reports
         (user_id, filename, upload_date, status, compliance_score, extracted_data)
       VALUES ($1, $2, NOW(), 'pending', $3, $4)
       RETURNING *`,
      [
        req.user.id,
        filename,
        compliance_score || null,
        extracted_data ? JSON.stringify(extracted_data) : null,
      ]
    );

    res.status(201).json({ message: 'Rapport soumis avec succès', report: result.rows[0] });
  } catch (error) {
    console.error('Erreur uploadReport:', error);
    res.status(500).json({ error: 'Erreur serveur' });
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
        `SELECT id, filename, upload_date, status, compliance_score
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
    res.status(500).json({ error: 'Erreur serveur' });
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
    if (sector) { conditions.push(`u.sector = $${idx++}`); params.push(sector); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [data, count] = await Promise.all([
      db.query(
        `SELECT r.id, r.filename, r.upload_date, r.status, r.compliance_score,
                u.company_name, u.sector, u.email
         FROM reports r
         JOIN users u ON r.user_id = u.id
         ${where}
         ORDER BY r.upload_date DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      db.query(
        `SELECT COUNT(*) AS total FROM reports r JOIN users u ON r.user_id = u.id ${where}`,
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
    res.status(500).json({ error: 'Erreur serveur' });
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

    const allowed = ['pending', 'valid', 'rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide. Valeurs: pending, valid, rejected' });
    }

    const result = await db.query(
      `UPDATE reports SET status = $1, reviewed_at = NOW(), reviewed_by = $2
       WHERE id = $3 RETURNING *`,
      [status, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rapport introuvable' });
    }

    res.json({ message: 'Statut mis à jour', report: result.rows[0] });
  } catch (error) {
    console.error('Erreur updateReportStatus:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { uploadReport, getUserReports, getAllReports, updateReportStatus };