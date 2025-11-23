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

// Configuración de columnas y mapeo inteligente
const COLUMNA_NOMBRE = 'nombre_canonico';
const COLUMNA_EMAIL = 'email_canonico';
const COLUMNA_AVANCE = 'avance_canonico';
const COLUMNA_NOTA = 'nota_canonico';

const NOTA_MINIMA_APROBACION = 4.0;

const COLUMN_ALIASES = {
  [COLUMNA_NOMBRE]: ['nombre', 'nombre completo', 'nombres', 'nombre '],
  [COLUMNA_AVANCE]: [
    'porcentaje de avance total del curso',
    'porcentaje de avance del curso',
    'avance total',
    '% avance',
    'avance'
  ],
  [COLUMNA_EMAIL]: ['dirección de correo', 'direccion de correo', 'correo', 'email', 'e-mail'],
  [COLUMNA_NOTA]: ['nota', 'nota ', 'nota \n', 'calificación', 'calificacion']
};

const upload = multer({ dest: path.join(__dirname, 'uploads/') });

// Helpers de limpieza y normalización

function normalizeString(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\r\n]+/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeNumber(value) {
  if (value === null || value === undefined) return 0;

  const str = String(value).replace(',', '.').trim();
  if (/[^0-9.]/.test(str)) return 0;
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Detector de encabezados para manejar filas desplazadas
function detectHeaderRow(worksheet) {
  const ref = worksheet['!ref'];
  if (!ref) return null;
  const range = xlsx.utils.decode_range(ref);


  const limit = Math.min(range.s.r + 25, range.e.r);

  for (let r = range.s.r; r <= limit; r++) {
    let rowValues = [];
    for (let c = range.s.c; c <= Math.min(range.e.c, 25); c++) {
      const cell = worksheet[xlsx.utils.encode_cell({ r, c })];
      if (cell && cell.v) {
        rowValues.push(normalizeString(cell.v));
      }
    }


    const hasName = rowValues.some(v => v.includes('nombre'));
    const hasKeyData = rowValues.some(v =>
      v.includes('nota') || v.includes('correo') || v.includes('avance')
    );

    if (hasName && hasKeyData) {
      return r;
    }
  }
  return null;
}

function remapRows(rows) {
  if (!rows || rows.length === 0) return rows;
  const headers = rows[0];

  const keyMap = {};

  Object.keys(headers).forEach(origKey => {
    const normKey = normalizeString(origKey);
    for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some(alias => normKey === alias || normKey.includes(alias)) && !keyMap[canonical]) {
        keyMap[canonical] = origKey;
        break;
      }
    }
  });

  return rows.map(row => {
    const newRow = { ...row };
    for (const [canonical, origKey] of Object.entries(keyMap)) {
      if (row[origKey] !== undefined) {
        newRow[canonical] = row[origKey];
      }
    }
    return newRow;
  });
}

function extractDataFromSheet(workbook, sheetName) {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) return null;


  const headerRowIndex = detectHeaderRow(worksheet);
  if (headerRowIndex === null) return null;

  const rawData = xlsx.utils.sheet_to_json(worksheet, {
    range: headerRowIndex,
    defval: null
  });

  const cleanData = remapRows(rawData);
  if (cleanData.length === 0) return null;

  return cleanData;
}

// Selección de la mejor hoja de avances basada en puntaje de datos

function getBestAvanceSheet(workbook) {
  const candidates = ['Avances', 'Sin Avances', 'Reporte Avances', 'Sin avances', 'Hoja1'];
  const actualSheetNames = workbook.SheetNames;

  let bestSheetData = [];
  let maxScore = -1;
  let winnerName = '';

  for (const candidate of candidates) {

    const realName = actualSheetNames.find(n => normalizeString(n).includes(normalizeString(candidate)));

    if (realName) {
      const data = extractDataFromSheet(workbook, realName);

      if (data && data.length > 0) {

        const sample = data[0];
        if (sample[COLUMNA_AVANCE] !== undefined) {

          // Calculamos puntaje basado en la calidad de los datos
          let currentScore = 0;
          let validRows = 0;

          data.forEach(row => {
            const val = normalizeNumber(row[COLUMNA_AVANCE]);
            if (val > 0) {
              currentScore += val;
              validRows++;
            }
          });

          console.log(`>>> Evaluando hoja "${realName}": Filas=${data.length}, DatosValidos=${validRows}, Score=${currentScore}`);

          // Prioriza la hoja con mayor score y cantidad de datos válidos

          let isBetter = false;

          if (currentScore > maxScore) {
            isBetter = true;
          } else if (currentScore === maxScore) {
            // Empate en datos, desempatamos por cantidad de filas
            if (data.length > bestSheetData.length) {
              isBetter = true;
            }
          }

          if (isBetter) {
            maxScore = currentScore;
            bestSheetData = data;
            winnerName = realName;
          }
        }
      }
    }
  }

  if (bestSheetData.length === 0) {
    throw new Error("No se encontró ninguna hoja con datos de avance válidos.");
  }

  console.log(`>>> GANADOR FINAL: "${winnerName}" (Score: ${maxScore})`);
  return bestSheetData;
}

function getEvaluationSheet(workbook, keywords) {
  const actualSheetNames = workbook.SheetNames;
  const matchName = actualSheetNames.find(name => {
    const norm = normalizeString(name);
    return keywords.some(k => norm.includes(normalizeString(k)));
  });

  if (!matchName) return [];
  return extractDataFromSheet(workbook, matchName) || [];
}

// Endpoints de la API

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Sin archivo' });

  const filePath = req.file.path;
  try {
    const currentWeek = parseInt(req.body.currentWeek) || 1;
    const totalWeeks = parseInt(req.body.totalWeeks) || 4;
    const workbook = xlsx.readFile(filePath);

    // Obtener datos de las hojas correspondientes
    const dataAvance = getBestAvanceSheet(workbook);
    const dataDiagnostica = getEvaluationSheet(workbook, ['Diagnostica', 'Diagnóstica']);
    const dataFinal = getEvaluationSheet(workbook, ['Final', 'Prueba Final']);

    const alumnosMap = new Map();

    // Procesar datos de avance
    dataAvance.forEach(row => {
      const nombre = row[COLUMNA_NOMBRE];
      if (!nombre || typeof nombre !== 'string') return;

      const id = normalizeString(nombre);
      if (id.length < 3 || id.includes('promedio')) return;

      let rawAvance = row[COLUMNA_AVANCE];
      let avanceNum = normalizeNumber(rawAvance);


      if (avanceNum > 1.0) avanceNum = avanceNum / 100;
      if (avanceNum > 1.0) avanceNum = 1.0;

      alumnosMap.set(id, avanceNum);
    });

    const totalInscritos = alumnosMap.size;
    let tramos = { '0%': 0, '1-25%': 0, '26-50%': 0, '51-75%': 0, '76-99%': 0, '100%': 0 };
    let sumaAvances = 0;
    let cantidadSinAvance = 0;

    for (const avance of alumnosMap.values()) {
      sumaAvances += avance;
      const pct = avance * 100;

      if (pct < 0.1) { tramos['0%']++; cantidadSinAvance++; }
      else if (pct <= 25) tramos['1-25%']++;
      else if (pct <= 50) tramos['26-50%']++;
      else if (pct <= 75) tramos['51-75%']++;
      else if (pct < 99.9) tramos['76-99%']++;
      else tramos['100%']++;
    }

    const avancePromedioNum = totalInscritos > 0 ? (sumaAvances / totalInscritos) * 100 : 0;
    const avancePromedio = avancePromedioNum.toFixed(1);
    const porcentajeSinAvance = totalInscritos > 0 ? ((cantidadSinAvance / totalInscritos) * 100).toFixed(1) : 0;
    const cantidadActivos = totalInscritos - cantidadSinAvance;
    const tasaActivacion = totalInscritos > 0 ? ((cantidadActivos / totalInscritos) * 100).toFixed(1) : 0;
    const brechaCompromiso = (100 - avancePromedioNum).toFixed(1);


    const tasaFinalizacionProyectada = (currentWeek > 0 && totalWeeks > 0)
      ? Math.min(100, (avancePromedioNum / currentWeek) * totalWeeks).toFixed(1)
      : '0.00';

    // Procesar evaluaciones (Diagnóstica y Final)
    const emailsDiagnostica = new Set();
    const emailsFinal = new Set();
    const aprobadosFinal = new Set();

    const procesarEvaluacion = (dataset, setRendidos, setAprobados = null) => {
      dataset.forEach(row => {
        const email = row[COLUMNA_EMAIL];
        const nota = row[COLUMNA_NOTA];

        if (email && String(email).includes('@') && normalizeNumber(nota) > 0) {
          const emailNorm = normalizeString(email);
          setRendidos.add(emailNorm);
          if (setAprobados) {
            const notaNum = normalizeNumber(nota);
            if (notaNum >= NOTA_MINIMA_APROBACION) setAprobados.add(emailNorm);
          }
        }
      });
    };

    procesarEvaluacion(dataDiagnostica, emailsDiagnostica);
    procesarEvaluacion(dataFinal, emailsFinal, aprobadosFinal);

    const pctDiagnostica = totalInscritos > 0 ? ((emailsDiagnostica.size / totalInscritos) * 100).toFixed(1) : 0;
    const pctFinal = totalInscritos > 0 ? ((emailsFinal.size / totalInscritos) * 100).toFixed(1) : 0;
    const tasaAprobacion = totalInscritos > 0 ? ((aprobadosFinal.size / totalInscritos) * 100).toFixed(1) : 0;

    let ambas = 0;
    emailsDiagnostica.forEach(e => { if (emailsFinal.has(e)) ambas++; });
    const indiceCumplimiento = totalInscritos > 0 ? ((ambas / totalInscritos) * 100).toFixed(1) : 0;

    // Generación de alertas inteligentes
    const alertas = [];
    const isLastWeek = currentWeek === totalWeeks;

    // Alertas para la última semana
    if (isLastWeek) {
      if (pctFinal < 100) {
        alertas.push({
          priority: '1 (Crítica)',
          action: `${100 - pctFinal}% de alumnos aún no rinden la Prueba Final.`,
          objective: 'Contacto urgente para evitar reprobar por no presentar.'
        });
      }

      if (tramos['0%'] + tramos['1-25%'] > 0) {
        alertas.push({
          priority: '1 (Crítica)',
          action: `${tramos['0%'] + tramos['1-25%']} alumnos con avance ≤ 25%.`,
          objective: 'Contacto inmediato para apoyo o refuerzo.'
        });
      }

      alertas.push({
        priority: 'Informativa',
        action: 'Recordar completar Encuesta de Satisfacción.',
        objective: 'Cumplimiento administrativo.'
      });
    }

    // Alertas para semanas intermedias
    else {

      const pctSinAvanceNum = parseFloat(porcentajeSinAvance);
      if (pctSinAvanceNum >= 20) {
        alertas.push({
          priority: '2 (Alta)',
          action: `${cantidadSinAvance} alumnos sin avance (${porcentajeSinAvance}%).`,
          objective: 'Activar participación temprana.'
        });
      } else if (pctSinAvanceNum > 0) {
        alertas.push({
          priority: '3 (Media)',
          action: `${cantidadSinAvance} alumnos sin avance (${porcentajeSinAvance}%).`,
          objective: 'Monitorear participación.'
        });
      }


      const pctBajo = totalInscritos > 0 ? ((tramos['1-25%'] / totalInscritos) * 100).toFixed(1) : 0;
      if (pctBajo >= 15) {
        alertas.push({
          priority: '3 (Media)',
          action: `${tramos['1-25%']} alumnos con avance 1–25% (${pctBajo}%).`,
          objective: 'Detectar barreras iniciales.'
        });
      }


      const pctFinalNum = parseFloat(pctFinal);
      if (pctFinalNum < 30) {
        alertas.push({
          priority: '1 (Crítica)',
          action: `Solo ${pctFinal}% de alumnos ha rendido Prueba Final.`,
          objective: 'Evitar colapso de última hora.'
        });
      } else if (pctFinalNum < 50) {
        alertas.push({
          priority: '2 (Alta)',
          action: `Solo ${pctFinal}% de alumnos ha rendido Prueba Final.`,
          objective: 'Anticipar pendientes.'
        });
      }


      const indiceCumplimientoNum = parseFloat(indiceCumplimiento);
      if (indiceCumplimientoNum < 25) {
        alertas.push({
          priority: '1 (Crítica)',
          action: `Solo ${indiceCumplimiento}% cumplió ambas evaluaciones.`,
          objective: 'Garantizar completitud del ciclo evaluativo.'
        });
      } else if (indiceCumplimientoNum < 40) {
        alertas.push({
          priority: '2 (Alta)',
          action: `Solo ${indiceCumplimiento}% cumplió ambas evaluaciones.`,
          objective: 'Reforzar importancia de ambas pruebas.'
        });
      }
    }


    const priorityOrder = {
      '1 (Crítica)': 0,
      '1 (Muy Alta)': 1,
      '2 (Alta)': 2,
      '3 (Media)': 3,
      'Informativa': 4
    };
    alertas.sort((a, b) => (priorityOrder[a.priority] || 999) - (priorityOrder[b.priority] || 999));

    res.json({
      avancePromedio,
      tasaAprobacion,
      tasaActivacion,
      cantidadSinAvance,
      porcentajeSinAvance,
      indiceCumplimiento,
      brechaCompromiso,
      tasaFinalizacionProyectada,
      distribucionAvance: [
        { name: '0%', Alumnos: tramos['0%'] },
        { name: '1-25%', Alumnos: tramos['1-25%'] },
        { name: '26-50%', Alumnos: tramos['26-50%'] },
        { name: '51-75%', Alumnos: tramos['51-75%'] },
        { name: '76-99%', Alumnos: tramos['76-99%'] },
        { name: '100%', Alumnos: tramos['100%'] },
      ],
      detalleEvaluaciones: {
        diagnostica: pctDiagnostica,
        final: pctFinal
      },
      totalInscritos,
      alertas
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  } finally {
    if (req.file) fs.unlink(req.file.path, () => { });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});