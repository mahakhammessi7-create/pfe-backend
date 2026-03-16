require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const authRoutes   = require('./src/routes/authRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const statsRoutes  = require('./src/routes/statsRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/auth',    authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/stats',   statsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

app.listen(PORT, () => {
  console.log(`✅ Serveur PFE ANCS démarré sur http://localhost:${PORT}`);
});