import express from 'express';
import cors from 'cors';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
app.use(cors());
// Quitamos app.use(express.json()); // Ya no es necesario
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// --- CONFIGURACIÓN CLAVE ---
const HOJA_AVANCE = 'Sin Avances';
const HOJA_DIAGNOSTICA = 'Prueba Diagnóstica';
const HOJA_FINAL = 'Prueba Final';
const COLUMNA_NOMBRE_AVANCE = 'NOMBRE';
const COLUMNA_NOMBRE_PRUEBAS = 'Nombre completo';
const COLUMNA_EMAIL_PRUEBAS = 'Dirección de correo';
const COLUMNA_AVANCE = 'PORCENTAJE DE AVANCE TOTAL DEL CURSO';
const COLUMNA_NOTA = 'Nota';
const NOTA_MINIMA_APROBACION = 4.0;
// ---------------------------

// --- FUNCIÓN PARA GENERAR ALERTAS DINÁMICAS ---
function generateAlerts(kpis, currentWeek, totalWeeks) {
  const alerts = [];
  if (!kpis) return alerts;
  
  const {
    cantidadSinAvance, porcentajeSinAvance, detalleEvaluaciones,
    indiceCumplimiento, totalInscritos, distribucionAvance
  } = kpis;

  if (!detalleEvaluaciones || !distribucionAvance || totalInscritos === undefined || totalInscritos === null) {
      console.warn("Faltan datos clave para generar alertas."); return alerts;
  }

  const isLastWeek = currentWeek === totalWeeks;

  // --- Lógica de Alertas ---
  if (isLastWeek) {
      // --- Alertas Específicas de la Última Semana (Prioridad Muy Alta) ---
      const finalRendidaNum = parseFloat(detalleEvaluaciones.final || 0);
      if (finalRendidaNum < 100) {
          const pendientesFinal = totalInscritos - Math.round(totalInscritos * (finalRendidaNum / 100));
          alerts.push({
              priority: '1 (Muy Alta)',
              action: `¡Última Semana! Recordar URGENTEMENTE a los ${pendientesFinal} (${(100 - finalRendidaNum).toFixed(0)}%) pendientes de rendir Prueba Final.`,
              objective: 'Lograr 100% rendición antes del cierre.',
          });
      }
      const alumnosTramo0 = distribucionAvance.find(t => t.name === '0%')?.Alumnos || 0;
      const alumnosTramo1_25 = distribucionAvance.find(t => t.name === '1-25%')?.Alumnos || 0;
      const alumnosBajoAvance = alumnosTramo0 + alumnosTramo1_25;
      if (alumnosBajoAvance > 0) {
         alerts.push({
             priority: '1 (Muy Alta)',
             action: `¡Última Semana! Contacto URGENTE a los ${alumnosBajoAvance} alumnos con avance <= 25% para recuperación.`,
             objective: 'Minimizar reprobación.',
         });
      }
       alerts.push({ 
            priority: 'Informativa',
            action: 'Recordar a todos completar Encuesta de Satisfacción (obligatoria para certificación).',
            objective: 'Asegurar cumplimiento requisitos administrativos.',
       });

  } else {
      // --- Alertas Generales (Aplicables en cualquier semana intermedia) ---
      if (cantidadSinAvance > 0) {
          alerts.push({
              priority: parseFloat(porcentajeSinAvance) >= 20.0 ? '2 (Alta)' : '3 (Media)',
              action: `Contactar a ${cantidadSinAvance} (${porcentajeSinAvance}%) alumnos sin avance. Ofrecer apoyo.`,
              objective: 'Activar participación.',
          });
      }
      const alumnosPrimerTramo = distribucionAvance.find(t => t.name === '1-25%')?.Alumnos || 0;
      const porcPrimerTramo = totalInscritos > 0 ? (alumnosPrimerTramo / totalInscritos) * 100 : 0;
      if (porcPrimerTramo > 15.0) {
         alerts.push({
             priority: '3 (Media)',
             action: `Apoyar a ${alumnosPrimerTramo} (${porcPrimerTramo.toFixed(0)}%) alumnos con avance 1-25%. Posible cuello de botella.`,
             objective: 'Superar barreras iniciales.',
         });
      }
      const finalRendidaNum = parseFloat(detalleEvaluaciones.final || 0);
      if (finalRendidaNum < 30.0) {
          alerts.push({
              priority: '1 (Crítica)',
              action: `¡CRÍTICO! Muy baja rendición Prueba Final (${(100 - finalRendidaNum).toFixed(0)}% pendiente). Reforzar comunicación URGENTE.`,
              objective: 'Evitar riesgo masivo de certificación.',
          });
      } else if (finalRendidaNum < 50.0) {
          alerts.push({
              priority: '2 (Alta)',
              action: `Baja rendición Prueba Final (${(100 - finalRendidaNum).toFixed(0)}% pendiente). Reforzar comunicación.`,
              objective: 'Anticipar problemas certificación.',
           });
      }
      const indiceCumplimientoNum = parseFloat(indiceCumplimiento || 0);
      if (indiceCumplimientoNum < 25.0) {
         alerts.push({
             priority: '1 (Crítica)',
             action: `¡CRÍTICO! Muy bajo cumplimiento ambas evaluaciones (${(100 - indiceCumplimientoNum).toFixed(0)}% pendiente). Revisar barreras.`,
             objective: 'Asegurar cumplimiento requisitos SENCE.',
         });
      } else if (indiceCumplimientoNum < 40.0) {
          alerts.push({
              priority: '2 (Alta)',
              action: `Bajo cumplimiento ambas evaluaciones (${(100 - indiceCumplimientoNum).toFixed(0)}% pendiente). Verificar problemas.`,
              objective: 'Prevenir problemas SENCE.',
           });
      }
  }
  const priorityOrder = { '1 (Crítica)': 1, '1 (Muy Alta)': 2, '2 (Alta)': 3, '3 (Media)': 4, 'Informativa': 5 };
  alerts.sort((a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99));
  return alerts;
}
// ------------------------------------------

// --- RUTA PRINCIPAL PARA SUBIR Y PROCESAR ARCHIVO ---
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No se subió ningún archivo.' });
  const filePath = req.file.path;

  try {
    const currentWeek = parseInt(req.body.currentWeek);
    const totalWeeks = parseInt(req.body.totalWeeks);
    if (isNaN(currentWeek) || isNaN(totalWeeks) || currentWeek <= 0 || totalWeeks <= 0 || currentWeek > totalWeeks) {
      throw new Error('Número de semanas inválido recibido del frontend.');
    }

    const workbook = xlsx.readFile(filePath);
    const leerHoja = (nombreHoja) => {
         if (!workbook.SheetNames.includes(nombreHoja)) { console.warn(`Advertencia: Hoja "${nombreHoja}" no encontrada.`); return []; }
         const worksheet = workbook.Sheets[nombreHoja];
         return xlsx.utils.sheet_to_json(worksheet, { defval: null });
    };

    const dataAvance = leerHoja(HOJA_AVANCE);
    const dataDiagnostica = leerHoja(HOJA_DIAGNOSTICA);
    const dataFinal = leerHoja(HOJA_FINAL);

    // Validaciones
    if (dataAvance.length === 0) throw new Error(`"${HOJA_AVANCE}" vacía.`);
    if (!(COLUMNA_NOMBRE_AVANCE in dataAvance[0])) throw new Error(`Falta "${COLUMNA_NOMBRE_AVANCE}" en "${HOJA_AVANCE}".`);
    if (!(COLUMNA_AVANCE in dataAvance[0])) throw new Error(`Falta "${COLUMNA_AVANCE}" en "${HOJA_AVANCE}".`);

    // --- Cálculos ---
    const nombresUnicos = new Set(
      dataAvance
        .map(a => String(a[COLUMNA_NOMBRE_AVANCE] || '').trim().toLowerCase())
        .filter(nombre => nombre !== '')
    );
    const totalInscritos = nombresUnicos.size;
    if (totalInscritos === 0) throw new Error('No se encontraron alumnos válidos.');

    // 1. KPIs de Avance
    let sumaAvances = 0;
    let cantidadSinAvance = 0;
    let tramos = { '0%': 0, '1-25%': 0, '26-50%': 0, '51-75%': 0, '76-99%': 0, '100%': 0 };

    dataAvance.forEach(a => {
        let avanceDecimal = parseFloat(a[COLUMNA_AVANCE]);
        if (isNaN(avanceDecimal) || avanceDecimal < 0) avanceDecimal = 0;
        avanceDecimal = Math.min(avanceDecimal, 1);
        sumaAvances += avanceDecimal;
        const avancePorcentaje = avanceDecimal * 100;

        if (avancePorcentaje === 0) { cantidadSinAvance++; tramos['0%']++; }
        else if (avancePorcentaje > 0 && avancePorcentaje <= 25) { tramos['1-25%']++; }
        else if (avancePorcentaje > 25 && avancePorcentaje <= 50) { tramos['26-50%']++; }
        else if (avancePorcentaje > 50 && avancePorcentaje <= 75) { tramos['51-75%']++; }
        else if (avancePorcentaje > 75 && avancePorcentaje < 100) { tramos['76-99%']++; }
        else { tramos['100%']++; }
    });
    
    const avancePromedioNum = totalInscritos > 0 ? ((sumaAvances / totalInscritos) * 100) : 0;
    const avancePromedio = avancePromedioNum.toFixed(2);
    const porcentajeSinAvance = totalInscritos > 0 ? ((cantidadSinAvance / totalInscritos) * 100).toFixed(2) : '0.00';
    const cantidadActivos = totalInscritos - cantidadSinAvance;
    const tasaActivacion = totalInscritos > 0 ? ((cantidadActivos / totalInscritos) * 100).toFixed(2) : '0.00';
    const brechaCompromiso = (100 - avancePromedioNum).toFixed(2);
    const tasaFinalizacionProyectada = currentWeek > 0 && totalWeeks > 0 ? Math.min(100, (avancePromedioNum / currentWeek) * totalWeeks).toFixed(2) : '0.00'; 
    const distribucionAvance = [
         { name: '0%', Alumnos: tramos['0%'] }, { name: '1-25%', Alumnos: tramos['1-25%'] },
         { name: '26-50%', Alumnos: tramos['26-50%'] }, { name: '51-75%', Alumnos: tramos['51-75%'] },
         { name: '76-99%', Alumnos: tramos['76-99%'] }, { name: '100%', Alumnos: tramos['100%'] },
    ];

    // 2. KPIs de Evaluaciones
    const emailsDiagnostica = new Set();
    dataDiagnostica.forEach(a => {
        const email = String(a[COLUMNA_EMAIL_PRUEBAS] || '').trim().toLowerCase();
        const notaValue = COLUMNA_NOTA in a ? a[COLUMNA_NOTA] : undefined;
        const nombreCompleto = String(a[COLUMNA_NOMBRE_PRUEBAS] || '').toLowerCase();
        if (email && email.includes('@') && notaValue !== null && notaValue !== undefined && !nombreCompleto.includes('promedio')) {
            emailsDiagnostica.add(email);
        }
    });

    const emailsFinal = new Set();
    const emailsAprobadosUnicos = new Set();
    dataFinal.forEach(a => {
        const email = String(a[COLUMNA_EMAIL_PRUEBAS] || '').trim().toLowerCase();
        const notaValue = COLUMNA_NOTA in a ? a[COLUMNA_NOTA] : undefined;
        const nombreCompleto = String(a[COLUMNA_NOMBRE_PRUEBAS] || '').toLowerCase();
        if (email && email.includes('@') && notaValue !== null && notaValue !== undefined && !nombreCompleto.includes('promedio')) {
            emailsFinal.add(email);
            const notaNum = parseFloat(notaValue);
            if (!isNaN(notaNum) && notaNum >= NOTA_MINIMA_APROBACION) {
                emailsAprobadosUnicos.add(email);
            }
        }
    });

    const diagnosticaRendida = emailsDiagnostica.size;
    const finalRendida = emailsFinal.size;
    const porcDiagnosticaRendida = totalInscritos > 0 ? ((diagnosticaRendida / totalInscritos) * 100).toFixed(2) : '0.00';
    const porcFinalRendida = totalInscritos > 0 ? ((finalRendida / totalInscritos) * 100).toFixed(2) : '0.00';

    let ambasRendidas = 0;
    emailsDiagnostica.forEach(email => { if (email && emailsFinal.has(email)) ambasRendidas++; });
    const indiceCumplimiento = totalInscritos > 0 ? ((ambasRendidas / totalInscritos) * 100).toFixed(2) : '0.00';

    const cantidadAprobados = emailsAprobadosUnicos.size;
    const tasaAprobacion = totalInscritos > 0 ? ((cantidadAprobados / totalInscritos) * 100).toFixed(2) : '0.00';

    // --- Preparamos el objeto de respuesta ---
    const kpiResults = {
      avancePromedio, tasaAprobacion, tasaActivacion, cantidadSinAvance,
      porcentajeSinAvance, indiceCumplimiento, brechaCompromiso,
      tasaFinalizacionProyectada, distribucionAvance,
      detalleEvaluaciones: { diagnostica: porcDiagnosticaRendida, final: porcFinalRendida },
      totalInscritos,
    };

    // --- Generamos las Alertas ---
    const generatedAlerts = generateAlerts(kpiResults, currentWeek, totalWeeks);

    const finalDashboardData = {
      ...kpiResults,
      alertas: generatedAlerts,
    };
    res.json(finalDashboardData);

  } catch (error) {
    console.error('Error detallado al procesar:', error);
    res.status(500).json({ message: `Error al procesar el archivo: ${error.message}` });
  } finally {
     if (req.file && filePath) {
         fs.unlink(filePath, (err) => {
             if (err) console.error("Error al borrar archivo temporal:", err);
         });
     }
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});