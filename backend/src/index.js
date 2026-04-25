import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import connectDB from './config/db.js';
import './config/loadEnv.js';

// ─── Validaciones de entorno en startup (SEC-4, DEUDA-6) ───────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET no definido o demasiado corto (mínimo 32 caracteres). Abortando.');
  process.exit(1);
}

const isProd = process.env.NODE_ENV === 'production';
if (isProd && !process.env.FRONTEND_URL) {
  console.error('FATAL: FRONTEND_URL no definido en producción. Abortando.');
  process.exit(1);
}
// ───────────────────────────────────────────────────────────────────────────

// Conectar a MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiter global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 500, // máximo 500 requests por IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde' }
});

// ─── Cabeceras de seguridad HTTP (DEUDA-2 — sin dependencia externa) ────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '0'); // Delegado a CSP en browsers modernos
  res.removeHeader('X-Powered-By');
  // Charset UTF-8 se fuerza solo en respuestas JSON para evitar interferir con otros tipos.
  // Express ya envía charset=utf-8 en res.json(), pero este hook lo asegura también
  // cuando algún middleware cambia el Content-Type sin charset.
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson(body);
  };
  next();
});
// ───────────────────────────────────────────────────────────────────────────

// Middlewares globales
app.use(cors({
  origin: function (origin, callback) {
    const allowed = process.env.FRONTEND_URL || 'http://localhost:5173';
    const allowedList = allowed.split(',').map(s => s.trim());
    // Permitir requests sin origin (curl, Postman, etc.) y orígenes permitidos
    if (!origin || allowedList.includes(origin)) {
      callback(null, true);
    } else if (!isProd && origin?.startsWith('http://localhost:')) {
      // En desarrollo, permitir cualquier puerto de localhost
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10kb' })); // DEUDA-1: límite explícito de payload
app.use(limiter);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Importar rutas
import authRoutes from './routes/auth.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import professionalRoutes from './routes/professional.routes.js';
import serviceRoutes from './routes/service.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import blockerRoutes from './routes/blocker.routes.js';
import technicalNoteRoutes from './routes/technicalNote.routes.js';
import availabilityRoutes from './routes/availability.routes.js';
import querySyncRoutes from './routes/querySync.routes.js';

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/blockers', blockerRoutes);
app.use('/api/technical-notes', technicalNoteRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/query-sync', querySyncRoutes);

// Manejo de errores global (SEC-2: no exponer err.message en 5xx de producción)
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  const exposeMessage = !isProd || status < 500;
  res.status(status).json({
    error: exposeMessage ? (err.message || 'Error interno del servidor') : 'Error interno del servidor'
  });
});

// Ruta 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
