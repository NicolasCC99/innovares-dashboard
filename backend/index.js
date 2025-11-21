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

// --- CONFIGURACIÓN DE PARÁMETROS ---
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

// --- GESTIÓN DE SUBIDA DE ARCHIVOS ---
const upload = multer({ dest: path.join(__dirname, 'uploads/') });

/* ============================================================
   FUNCIONES DE AYUDA (HELPERS)
   ============================================================ */

// Normaliza un texto a un formato estándar
function normalizeString(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// Define alias para los nombres de las columnas
const COLUMN_ALIASES = {
  [COLUMNA_NOMBRE_AVANCE]: ['nombre', 'nombre ', 'nombre completo'],
  [COLUMNA_AVANCE]: ['porcentaje de avance total del curso', 'avance total', '% avance'],
  [COLUMNA_NOMBRE_PRUEBAS]: ['nombre completo', 'nombre'],
  [COLUMNA_EMAIL_PRUEBAS]: ['direccion de correo', 'correo', 'email'],
  [COLUMNA_NOTA]: ['nota', 'nota ', 'calificacion'],
};

// Mapea los nombres de las columnas del archivo a los nombres estándar
function remapColumns(rows) {
  if (!rows || rows.length === 0) return rows;

  const sample = rows[0];
  const keyMap = {};

  Object.keys(sample).forEach((origKey) => {
    const normKey = normalizeString(origKey);
    for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(normKey) && !keyMap[canonical]) {
        keyMap[canonical] = origKey;
      }
    }
  });

  return rows.map((row) => {
    const newRow = { ...row };
    for (const [canonical, origKey] of Object.entries(keyMap)) {
      if (!(canonical in newRow) && origKey in row) {
        newRow[canonical] = row[origKey];
      }
    }
    return newRow;
  });
}

// Detecta la fila de cabecera en la hoja de cálculo
function detectHeaderRow(worksheet) {
  const ref = worksheet['!ref'];
  if (!ref) return null;

  const range = xlsx.utils.decode_range(ref);

  // Escaneamos primeras 10 filas buscando palabras típicas de header
  for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
    let rowValues = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = worksheet[xlsx.utils.encode_cell({ r, c })];
      rowValues.push(cell ? String(cell.v).toLowerCase() : '');
    }

    if (
      rowValues.some(
        (v) =>
          v.includes('nombre') ||
          v.includes('nota') ||
          v.includes('correo') ||
          v.includes('avance')
      )
    ) {
      return r;
    }
  }

  return null;
}

// Busca una hoja en el libro por su nombre
function findSheetName(workbook, preferredNames) {
  const normalizedMap = new Map();
  workbook.SheetNames.forEach((name) => {
    normalizedMap.set(normalizeString(name), name);
  });

  // 1) Coincidencia exacta (normalizada)
  for (const candidate of preferredNames) {
    const norm = normalizeString(candidate);
    if (normalizedMap.has(norm)) {
      return normalizedMap.get(norm);
    }
  }

  // 2) Coincidencia por substring (p.ej. "avance", "diagnostica", etc.)
  for (const candidate of preferredNames) {
    const normCandidate = normalizeString(candidate);
    for (const [normName, originalName] of normalizedMap.entries()) {
      if (normName.includes(normCandidate)) {
        return originalName;
      }
    }
  }

  throw new Error(
    `No se encontró ninguna hoja similar a: ${preferredNames.join(', ')}`
  );
}

// Lee los datos de una hoja de cálculo de forma flexible
function leerHojaFlexible(workbook, preferredNames) {
  const sheetName = findSheetName(workbook, preferredNames);
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Hoja "${sheetName}" no encontrada en el archivo.`);
  }

  const headerRow = detectHeaderRow(worksheet);
  if (headerRow === null) {
    throw new Error(
      `No se pudo detectar la fila de encabezados en la hoja "${sheetName}".`
    );
  }

  // Leemos todo como arrays (header:1)
  const allRows = xlsx.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: null,
  });

  const headers = allRows[headerRow];
  const dataRows = allRows.slice(headerRow + 1);

  const objects = dataRows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h != null && h !== '') {
        obj[String(h).trim()] = row[i];
      }
    });
    return obj;
  });

  // Remapeamos columnas a los nombres canónicos
  return remapColumns(objects);
}

// Convierte un valor a número, manejando comas decimales
function normalizeNumber(value) {
  if (value === null || value === undefined) return NaN;
  const str = String(value).replace(',', '.').trim();
  const num = parseFloat(str);
  return isNaN(num) ? NaN : num;
}

/* ============================================================
   GENERACIÓN DE ALERTAS
   ============================================================ */

function generateAlerts(kpis, currentWeek, totalWeeks) {
  const alerts = [];
  if (!kpis) return alerts;

  const {
    cantidadSinAvance,
    porcentajeSinAvance,
    detalleEvaluaciones,
    indiceCumplimiento,
    totalInscritos,
    distribucionAvance,
  } = kpis;

  if (
    !detalleEvaluaciones ||
    !distribucionAvance ||
    totalInscritos === undefined ||
    totalInscritos === null
  ) {
    console.warn('Faltan datos clave para generar alertas.');
    return alerts;
  }

  const isLastWeek = currentWeek === totalWeeks;

  if (isLastWeek) {
    // --- Lógica para la última semana ---
    const finalRendidaNum = parseFloat(detalleEvaluaciones.final || 0);
    if (finalRendidaNum < 100) {
      const pendientesFinal =
        totalInscritos -
        Math.round(totalInscritos * (finalRendidaNum / 100));
      alerts.push({
        priority: '1 (Muy Alta)',
        action: `¡Última Semana! Recordar URGENTEMENTE a los ${pendientesFinal} (${(
          100 - finalRendidaNum
        ).toFixed(0)}%) pendientes de rendir Prueba Final.`,
        objective: 'Lograr 100% rendición antes del cierre.',
      });
    }

    const alumnosTramo0 =
      distribucionAvance.find((t) => t.name === '0%')?.Alumnos || 0;
    const alumnosTramo1_25 =
      distribucionAvance.find((t) => t.name === '1-25%')?.Alumnos || 0;
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
      action:
        'Recordar a todos completar Encuesta de Satisfacción (obligatoria para certificación).',
      objective: 'Asegurar cumplimiento requisitos administrativos.',
    });
  } else {
    // --- Lógica para semanas intermedias ---
    if (cantidadSinAvance > 0) {
      alerts.push({
        priority:
          parseFloat(porcentajeSinAvance) >= 20.0 ? '2 (Alta)' : '3 (Media)',
        action: `Contactar a ${cantidadSinAvance} (${porcentajeSinAvance}%) alumnos sin avance. Ofrecer apoyo.`,
        objective: 'Activar participación.',
      });
    }

    const alumnosPrimerTramo =
      distribucionAvance.find((t) => t.name === '1-25%')?.Alumnos || 0;
    const porcPrimerTramo =
      totalInscritos > 0
        ? (alumnosPrimerTramo / totalInscritos) * 100
        : 0;

    if (porcPrimerTramo > 15.0) {
      alerts.push({
        priority: '3 (Media)',
        action: `Apoyar a ${alumnosPrimerTramo} (${porcPrimerTramo.toFixed(
          0
        )}%) alumnos con avance 1-25%. Posible cuello de botella.`,
        objective: 'Superar barreras iniciales.',
      });
    }

    const finalRendidaNum = parseFloat(detalleEvaluaciones.final || 0);
    if (finalRendidaNum < 30.0) {
      alerts.push({
        priority: '1 (Crítica)',
        action: `¡CRÍTICO! Muy baja rendición Prueba Final (${(
          100 - finalRendidaNum
        ).toFixed(0)}% pendiente). Reforzar comunicación URGENTE.`,
        objective: 'Evitar riesgo masivo de certificación.',
      });
    } else if (finalRendidaNum < 50.0) {
      alerts.push({
        priority: '2 (Alta)',
        action: `Baja rendición Prueba Final (${(
          100 - finalRendidaNum
        ).toFixed(0)}% pendiente). Reforzar comunicación.`,
        objective: 'Anticipar problemas certificación.',
      });
    }

    const indiceCumplimientoNum = parseFloat(indiceCumplimiento || 0);
    if (indiceCumplimientoNum < 25.0) {
      alerts.push({
        priority: '1 (Crítica)',
        action: `¡CRÍTICO! Muy bajo cumplimiento ambas evaluaciones (${(
          100 - indiceCumplimientoNum
        ).toFixed(0)}% pendiente). Revisar barreras.`,
        objective: 'Asegurar cumplimiento requisitos SENCE.',
      });
    } else if (indiceCumplimientoNum < 40.0) {
      alerts.push({
        priority: '2 (Alta)',
        action: `Bajo cumplimiento ambas evaluaciones (${(
          100 - indiceCumplimientoNum
        ).toFixed(0)}% pendiente). Verificar problemas.`,
        objective: 'Prevenir problemas SENCE.',
      });
    }
  }

  const priorityOrder = {
    '1 (Crítica)': 1,
    '1 (Muy Alta)': 2,
    '2 (Alta)': 3,
    '3 (Media)': 4,
    Informativa: 5,
  };

  alerts.sort(
    (a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99)
  );

  return alerts;
}

/* ============================================================
   RUTA DE LA API PARA SUBIDA DE ARCHIVOS
   ============================================================ */

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: 'No se subió ningún archivo.' });

  const filePath = req.file.path;

  try {
    const currentWeek = parseInt(req.body.currentWeek);
    const totalWeeks = parseInt(req.body.totalWeeks);

    if (
      isNaN(currentWeek) ||
      isNaN(totalWeeks) ||
      currentWeek <= 0 ||
      totalWeeks <= 0 ||
      currentWeek > totalWeeks
    ) {
      throw new Error('Número de semanas inválido recibido del frontend.');
    }

    const workbook = xlsx.readFile(filePath);

    // --- LECTURA DE HOJAS DE CÁLCULO ---
    let dataAvance = leerHojaFlexible(workbook, [
  'Sin Avances',
  'Sin avances',
  'Avances',
]);

    let dataDiagnostica = leerHojaFlexible(workbook, [HOJA_DIAGNOSTICA]);
    let dataFinal = leerHojaFlexible(workbook, [HOJA_FINAL]);

    // --- VALIDACIÓN DE DATOS ---
    if (dataAvance.length === 0) {
      throw new Error(`Hoja de avance ("${HOJA_AVANCE}" o similar) vacía.`);
    }

    if (!(COLUMNA_NOMBRE_AVANCE in dataAvance[0])) {
      throw new Error(
        `Falta la columna "${COLUMNA_NOMBRE_AVANCE}" en la hoja de avance.`
      );
    }

    if (!(COLUMNA_AVANCE in dataAvance[0])) {
      throw new Error(
        `Falta la columna "${COLUMNA_AVANCE}" en la hoja de avance.`
      );
    }

        // --- PROCESAMIENTO DE DATOS DE AVANCE ---
const alumnosMap = new Map();
dataAvance.forEach((a) => {
  const nombreKey = String(a[COLUMNA_NOMBRE_AVANCE] || '')
    .trim()
    .toLowerCase();
  if (!nombreKey) return;

  let avanceValor = normalizeNumber(a[COLUMNA_AVANCE]);
  if (isNaN(avanceValor) || avanceValor < 0) avanceValor = 0;

  let avanceDecimal = avanceValor > 1 ? avanceValor / 100 : avanceValor;
  if (avanceDecimal > 1) avanceDecimal = 1;

  // Se guarda el mayor avance registrado para cada alumno
  const existing = alumnosMap.get(nombreKey);
  if (existing === undefined || avanceDecimal > existing) {
    alumnosMap.set(nombreKey, avanceDecimal);
  }
});

// --- CÁLCULO DEL TOTAL DE INSCRITOS ---
const totalInscritos = alumnosMap.size;
if (totalInscritos === 0) {
  throw new Error('No se encontraron alumnos válidos.');
}

// --- CÁLCULO DE KPIs DE AVANCE ---
let sumaAvances = 0;
let cantidadSinAvance = 0;
let tramos = {
  '0%': 0,
  '1-25%': 0,
  '26-50%': 0,
  '51-75%': 0,
  '76-99%': 0,
  '100%': 0,
};

for (const avanceDecimal of alumnosMap.values()) {
  sumaAvances += avanceDecimal;
  const avancePorcentaje = avanceDecimal * 100;

  if (avancePorcentaje === 0) {
    cantidadSinAvance++;
    tramos['0%']++;
  } else if (avancePorcentaje > 0 && avancePorcentaje <= 25) {
    tramos['1-25%']++;
  } else if (avancePorcentaje > 25 && avancePorcentaje <= 50) {
    tramos['26-50%']++;
  } else if (avancePorcentaje > 50 && avancePorcentaje <= 75) {
    tramos['51-75%']++;
  } else if (avancePorcentaje > 75 && avancePorcentaje < 100) {
    tramos['76-99%']++;
  } else {
    tramos['100%']++;
  }
}


    const avancePromedioNum =
      totalInscritos > 0 ? (sumaAvances / totalInscritos) * 100 : 0;
    const avancePromedio = avancePromedioNum.toFixed(2);

    const porcentajeSinAvance =
      totalInscritos > 0
        ? ((cantidadSinAvance / totalInscritos) * 100).toFixed(2)
        : '0.00';

    const cantidadActivos = totalInscritos - cantidadSinAvance;
    const tasaActivacion =
      totalInscritos > 0
        ? ((cantidadActivos / totalInscritos) * 100).toFixed(2)
        : '0.00';

    const brechaCompromiso = (100 - avancePromedioNum).toFixed(2);

    const tasaFinalizacionProyectada =
      currentWeek > 0 && totalWeeks > 0
        ? Math.min(100, (avancePromedioNum / currentWeek) * totalWeeks).toFixed(
            2
          )
        : '0.00';

    const distribucionAvance = [
      { name: '0%', Alumnos: tramos['0%'] },
      { name: '1-25%', Alumnos: tramos['1-25%'] },
      { name: '26-50%', Alumnos: tramos['26-50%'] },
      { name: '51-75%', Alumnos: tramos['51-75%'] },
      { name: '76-99%', Alumnos: tramos['76-99%'] },
      { name: '100%', Alumnos: tramos['100%'] },
    ];

    // --- CÁLCULO DE KPIs DE EVALUACIONES ---
    const emailsDiagnostica = new Set();
    dataDiagnostica.forEach((a) => {
      const email = String(a[COLUMNA_EMAIL_PRUEBAS] || '')
        .trim()
        .toLowerCase();
      const notaValue =
        COLUMNA_NOTA in a ? a[COLUMNA_NOTA] : undefined;
      const nombreCompleto = String(
        a[COLUMNA_NOMBRE_PRUEBAS] || ''
      ).toLowerCase();

      if (
        email &&
        email.includes('@') &&
        notaValue !== null &&
        notaValue !== undefined &&
        !nombreCompleto.includes('promedio')
      ) {
        emailsDiagnostica.add(email);
      }
    });

    const emailsFinal = new Set();
    const emailsAprobadosUnicos = new Set();

    dataFinal.forEach((a) => {
      const email = String(a[COLUMNA_EMAIL_PRUEBAS] || '')
        .trim()
        .toLowerCase();
      const notaValue =
        COLUMNA_NOTA in a ? a[COLUMNA_NOTA] : undefined;
      const nombreCompleto = String(
        a[COLUMNA_NOMBRE_PRUEBAS] || ''
      ).toLowerCase();

      if (
        email &&
        email.includes('@') &&
        notaValue !== null &&
        notaValue !== undefined &&
        !nombreCompleto.includes('promedio')
      ) {
        emailsFinal.add(email);
        const notaNum = normalizeNumber(notaValue);
        if (!isNaN(notaNum) && notaNum >= NOTA_MINIMA_APROBACION) {
          emailsAprobadosUnicos.add(email);
        }
      }
    });

    const diagnosticaRendida = emailsDiagnostica.size;
    const finalRendida = emailsFinal.size;

    const porcDiagnosticaRendida =
      totalInscritos > 0
        ? ((diagnosticaRendida / totalInscritos) * 100).toFixed(2)
        : '0.00';

    const porcFinalRendida =
      totalInscritos > 0
        ? ((finalRendida / totalInscritos) * 100).toFixed(2)
        : '0.00';

    let ambasRendidas = 0;
    emailsDiagnostica.forEach((email) => {
      if (email && emailsFinal.has(email)) ambasRendidas++;
    });

    const indiceCumplimiento =
      totalInscritos > 0
        ? ((ambasRendidas / totalInscritos) * 100).toFixed(2)
        : '0.00';

    const cantidadAprobados = emailsAprobadosUnicos.size;
    const tasaAprobacion =
      totalInscritos > 0
        ? ((cantidadAprobados / totalInscritos) * 100).toFixed(2)
        : '0.00';

    // --- COMPILACIÓN DE RESULTADOS ---
    const kpiResults = {
      avancePromedio,
      tasaAprobacion,
      tasaActivacion,
      cantidadSinAvance,
      porcentajeSinAvance,
      indiceCumplimiento,
      brechaCompromiso,
      tasaFinalizacionProyectada,
      distribucionAvance,
      detalleEvaluaciones: {
        diagnostica: porcDiagnosticaRendida,
        final: porcFinalRendida,
      },
      totalInscritos,
    };

    const generatedAlerts = generateAlerts(kpiResults, currentWeek, totalWeeks);

    const finalDashboardData = {
      ...kpiResults,
      alertas: generatedAlerts,
    };

    res.json(finalDashboardData);
  } catch (error) {
    console.error('Error detallado al procesar:', error);
    res
      .status(500)
      .json({ message: `Error al procesar el archivo: ${error.message}` });
  } finally {
    // --- LIMPIEZA DE ARCHIVOS TEMPORALES ---
    if (req.file && filePath) {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error al borrar archivo temporal:', err);
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
