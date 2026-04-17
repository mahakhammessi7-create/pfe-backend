const db = require('../utils/db');

const getNationalStats = async (req, res) => {
  try {
    const [global, sectors, auditsByYear, complexIndicators] = await Promise.all([

      // ── Global KPIs
      db.query(`
        SELECT
          COUNT(*)                                                        AS total_reports,
          ROUND(AVG(compliance_score)::numeric, 1)                       AS avg_score,
          COUNT(CASE WHEN status = 'pending'   THEN 1 END)               AS pending_count,
          COUNT(CASE WHEN status IN ('valid','validated') THEN 1 END)    AS validated_count,
          COUNT(CASE WHEN has_rssi = true      THEN 1 END)               AS with_rssi,
          COUNT(CASE WHEN has_pssi = true      THEN 1 END)               AS with_pssi,
          COUNT(DISTINCT user_id)                                        AS total_organisms
        FROM reports
        WHERE user_id IS NOT NULL
      `),

      // ── Score par secteur (using organism_sector)
      db.query(`
        SELECT
          COALESCE(organism_sector, 'Non défini') AS sector,
          COUNT(*)                                                        AS total,
          ROUND(AVG(compliance_score)::numeric, 1)                       AS avg_score
        FROM reports
        WHERE organism_sector IS NOT NULL AND organism_sector != ''
        GROUP BY organism_sector
        ORDER BY avg_score DESC
      `),

      // ── Évolution audits par année
      db.query(`
        SELECT
          EXTRACT(YEAR FROM upload_date)::integer AS year,
          COUNT(*)                                AS total,
          ROUND(AVG(compliance_score)::numeric,1) AS avg_score
        FROM reports
        WHERE upload_date IS NOT NULL
        GROUP BY EXTRACT(YEAR FROM upload_date)
        ORDER BY year ASC
      `),

      // ── Indicateurs complexes
      db.query(`
        SELECT
          COUNT(CASE WHEN has_rssi = true AND has_pssi = true THEN 1 END)  AS rssi_and_pssi,
          COUNT(CASE WHEN organism_sector = 'Finance'
                      AND (has_pssi = false OR has_pssi IS NULL) THEN 1 END) AS finance_no_pssi,
          COUNT(CASE WHEN has_rssi = true
                      AND (last_audit_date IS NULL
                           OR last_audit_date < NOW() - INTERVAL '2 years') THEN 1 END) AS rssi_not_audited_2y,
          COUNT(*) AS total
        FROM reports
      `),
    ]);

    res.json({
      global:            global.rows[0]            || {},
      sectors:           sectors.rows              || [],
      auditsByYear:      auditsByYear.rows          || [],
      complexIndicators: complexIndicators.rows[0] || {},
    });
  } catch (err) {
    console.error('Erreur stats:', err);
    res.status(500).json({ error: 'Erreur serveur', details: err.message });
  }
};

module.exports = { getNationalStats };