const db = require('../utils/db');

const getNationalStats = async (req, res) => {
  try {
    const [global, sectors] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)                                            AS total_reports,
          ROUND(AVG(compliance_score)::numeric, 1)           AS avg_score,
          COUNT(CASE WHEN status   = 'pending' THEN 1 END)   AS pending_count,
          COUNT(CASE WHEN has_rssi = true      THEN 1 END)   AS with_rssi,
          COUNT(CASE WHEN status   = 'valid'   THEN 1 END)   AS validated_count
        FROM reports
      `),
      db.query(`
        SELECT u.sector,
               COUNT(r.id)                                 AS total,
               ROUND(AVG(r.compliance_score)::numeric, 1)  AS avg_score
        FROM reports r JOIN users u ON r.user_id = u.id
        WHERE u.sector IS NOT NULL
        GROUP BY u.sector ORDER BY total DESC LIMIT 10
      `),
    ]);

    res.json({ global: global.rows[0] || {}, sectors: sectors.rows || [] });
  } catch (err) {
    console.error('Erreur stats:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { getNationalStats };