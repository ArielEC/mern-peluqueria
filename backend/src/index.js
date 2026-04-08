import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';
import connectDB from './config/db.js';

// Cargar variables de entorno
dotenv.config();

// Conectar a MongoDB
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiter global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 100, // máximo 100 requests por IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta de nuevo más tarde' }
});

// Middlewares globales
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(limiter);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Importar rutas
import authRoutes from './routes/auth.routes.js';
// import appointmentRoutes from './routes/appointment.routes.js';
import professionalRoutes from './routes/professional.routes.js';
import serviceRoutes from './routes/service.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import blockerRoutes from './routes/blocker.routes.js';
import technicalNoteRoutes from './routes/technicalNote.routes.js';
import availabilityRoutes from './routes/availability.routes.js';

// Rutas de la API
app.use('/api/auth', authRoutes);
// app.use('/api/appointments', appointmentRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/blockers', blockerRoutes);
app.use('/api/technical-notes', technicalNoteRoutes);
app.use('/api/availability', availabilityRoutes);

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
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
