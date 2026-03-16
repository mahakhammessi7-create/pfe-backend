const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db     = require('../utils/db');

/* ─────────────────────────────────────────────
   LOGIN
───────────────────────────────────────────── */
const login = async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password || !userType)
      return res.status(400).json({ error: 'Champs manquants' });

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user   = result.rows[0];

    const isValid = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!user || !isValid || user.role !== userType)
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    res.json({
      token,
      user: { id:user.id, username:user.username, email:user.email, role:user.role, company_name:user.company_name, sector:user.sector },
    });

  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/* ─────────────────────────────────────────────
   REGISTER CLIENT
───────────────────────────────────────────── */
const register = async (req, res) => {
  try {
    const { username, email, password, company_name, sector } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ error: 'Champs obligatoires manquants' });

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0)
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });

    const hash   = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, role, company_name, sector, created_at)
       VALUES ($1, $2, $3, 'client', $4, $5, NOW()) RETURNING *`,
      [username, email, hash, company_name || null, sector || null]
    );

    const u = result.rows[0];
    res.status(201).json({
      message: 'Inscription réussie',
      user: { id:u.id, username:u.username, email:u.email, role:u.role, company_name:u.company_name, sector:u.sector },
    });

  } catch (err) {
    console.error('Erreur register:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/* ─────────────────────────────────────────────
   REGISTER ADMIN
   Protégé par ADMIN_SECRET_KEY dans .env
   Exemple .env → ADMIN_SECRET_KEY=ancs2026admin
───────────────────────────────────────────── */
const registerAdmin = async (req, res) => {
  console.log('🔑 Clé reçue     :', req.body.adminSecretKey);
  console.log('🔑 Clé attendue  :', process.env.ADMIN_SECRET_KEY);
  try {
    const { username, email, password, adminSecretKey } = req.body;

    if (!username || !email || !password || !adminSecretKey)
      return res.status(400).json({ error: 'Tous les champs sont obligatoires' });

    // ✅ Vérification clé secrète
    if (adminSecretKey !== process.env.ADMIN_SECRET_KEY)
      return res.status(403).json({ error: 'Clé administrateur invalide' });

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0)
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });

    const hash   = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, 'admin', NOW()) RETURNING *`,
      [username, email, hash]
    );

    const u = result.rows[0];
    res.status(201).json({
      message: 'Compte administrateur créé avec succès',
      user: { id:u.id, username:u.username, email:u.email, role:u.role },
    });

  } catch (err) {
    console.error('Erreur registerAdmin:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { login, register, registerAdmin };