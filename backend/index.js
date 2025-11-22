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

// ---------------------------------------------
// CONFIGURACIÓN DE COLUMNAS (Mapeo Inteligente)
// ---------------------------------------------
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

// ---------------------------------------------
// HELPERS DE LIMPIEZA
// ---------------------------------------------

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
  // Detecta texto como "No finalizado", "-", etc. y devuelve 0
  const str = String(value).replace(',', '.').trim();
  if (/[^0-9.]/.test(str)) return 0; 
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// ---------------------------------------------
// DETECTOR DE ENCABEZADOS (Soluciona el problema de A2, A3, A4...)
// ---------------------------------------------
function detectHeaderRow(worksheet) {
  const ref = worksheet['!ref'];
  if (!ref) return null;
  const range = xlsx.utils.decode_range(ref);

  // Escaneamos hasta la fila 25 buscando palabras clave
  const limit = Math.min(range.s.r + 25, range.e.r);

  for (let r = range.s.r; r <= limit; r++) {
    let rowValues = [];
    for (let c = range.s.c; c <= Math.min(range.e.c, 25); c++) {
      const cell = worksheet[xlsx.utils.encode_cell({ r, c })];
      if (cell && cell.v) {
        rowValues.push(normalizeString(cell.v));
      }
    }

    // La fila es Header si tiene "Nombre" Y ("Nota" o "Avance")
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

  // Aquí detectamos dinámicamente si empieza en A1, A3 o A4
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

// ---------------------------------------------
// SELECCIÓN DE MEJOR HOJA (LÓGICA MEJORADA)
// ---------------------------------------------

function getBestAvanceSheet(workbook) {
  const candidates = ['Avances', 'Sin Avances', 'Reporte Avances', 'Sin avances', 'Hoja1'];
  const actualSheetNames = workbook.SheetNames;
  
  let bestSheetData = [];
  let maxScore = -1; // Usamos un score para desempatar
  let winnerName = '';

  for (const candidate of candidates) {
    // Buscamos coincidencia parcial en el nombre
    const realName = actualSheetNames.find(n => normalizeString(n).includes(normalizeString(candidate)));
    
    if (realName) {
      const data = extractDataFromSheet(workbook, realName);
      
      if (data && data.length > 0) {
        // ¿Tiene la columna de avance?
        const sample = data[0];
        if (sample[COLUMNA_AVANCE] !== undefined) {
          
          // --- NUEVA LÓGICA DE PUNTAJE ---
          // Calculamos la "riqueza" de los datos. 
          // Sumamos todos los porcentajes encontrados.
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

          // Criterio de victoria:
          // 1. Priorizamos la hoja con mayor suma de avances (Score).
          // 2. Si hay empate técnico (ej: inicio de curso, todo 0), priorizamos la que tenga más filas.
          // 3. Si siguen empate, priorizamos si el nombre NO es "Sin Avances" (para Santo Tomás).
          
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

// ---------------------------------------------
// API
// ---------------------------------------------

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Sin archivo' });

  const filePath = req.file.path;
  try {
    const currentWeek = parseInt(req.body.currentWeek) || 1;
    const totalWeeks = parseInt(req.body.totalWeeks) || 4;
    const workbook = xlsx.readFile(filePath);

    // 1. Obtener datos INTELIGENTEMENTE
    const dataAvance = getBestAvanceSheet(workbook);
    const dataDiagnostica = getEvaluationSheet(workbook, ['Diagnostica', 'Diagnóstica']);
    const dataFinal = getEvaluationSheet(workbook, ['Final', 'Prueba Final']);

    const alumnosMap = new Map();

    // Procesar Avances
    dataAvance.forEach(row => {
      const nombre = row[COLUMNA_NOMBRE];
      if (!nombre || typeof nombre !== 'string') return;
      
      const id = normalizeString(nombre);
      if (id.length < 3 || id.includes('promedio')) return;

      let rawAvance = row[COLUMNA_AVANCE];
      let avanceNum = normalizeNumber(rawAvance);

      // Normalización 0-1 vs 0-100
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
    
    // Proyección lineal simple
    const tasaFinalizacionProyectada = (currentWeek > 0 && totalWeeks > 0)
        ? Math.min(100, (avancePromedioNum / currentWeek) * totalWeeks).toFixed(1)
        : '0.00';

    // Procesar Evaluaciones
    const emailsDiagnostica = new Set();
    const emailsFinal = new Set();
    const aprobadosFinal = new Set();

    const procesarEvaluacion = (dataset, setRendidos, setAprobados = null) => {
      dataset.forEach(row => {
        const email = row[COLUMNA_EMAIL];
        const nota = row[COLUMNA_NOTA];
        // Validar que exista nota (ignoramos celdas vacías)
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

    // Alertas (Lógica simplificada para el ejemplo)
    const alertas = [];
    if (cantidadSinAvance > 0) {
        alertas.push({
            priority: '2 (Alta)',
            action: `Contactar a ${cantidadSinAvance} alumnos sin avance.`,
            objective: 'Activar participación.'
        });
    }

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
    if (req.file) fs.unlink(req.file.path, () => {});
  }
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});