# 📊 Dashboard de Avance de Cursos – Innovares

Dashboard interactivo para monitorear el progreso de cursos en línea dictados en plataformas OTEC/Moodle.  
Automatiza el cálculo de métricas, evaluación del progreso, generación de alertas y exportación de gráficos, reemplazando procesos manuales lentos y propensos a errores.

---

## 🚀 Características Principales

- **Procesamiento automático de Excel**  
  Detecta la hoja correcta del reporte, normaliza columnas y calcula KPIs.

- **10 KPIs Clave**  
  Avance promedio, tasa de activación, tasa de aprobación, índice de cumplimiento, brecha de compromiso, distribución de avance y más.

- **Alertas Inteligentes**  
  Mensajes generados dinámicamente según rendimiento y semana del curso.

- **Visualización Interactiva**  
  Gráficos circulares, barras, tarjetas numéricas y barras de progreso.

- **Exportación a PNG + ZIP**  
  Todos los gráficos se exportan listos para entregar a empresas.

- **Compatibilidad con Plantillas Moodle**  
  Soporta variaciones comunes de formato (nombres de hojas, encabezados desplazados, avance 0–1 o 0–100).

---

## 📁 Estructura del Proyecto

```
innovares-dashboard/
├── backend/
│   ├── index.js
│   ├── package.json
│   └── uploads/
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   ├── components/
│   │   │   ├── GaugeChartCard.jsx
│   │   │   ├── KPICard.jsx
│   │   │   ├── BarChartComponent.jsx
│   │   │   ├── ProgressBarComponent.jsx
│   │   │   ├── AlertsTable.jsx
│   │   │   └── FileUpload.jsx
│   └── package.json
│
└── README.md
```

---

## 🔧 Requisitos Técnicos Obligatorios

### 📌 Backend

- Node.js **v18 o superior**
- npm **v9 o superior**
- Dependencias:
  - `express`
  - `multer`
  - `xlsx`
  - `cors`

### 📌 Frontend

- Node.js **v18+**
- React **18+**
- Vite **4+**
- Dependencias:
  - `recharts`
  - `jszip`
  - `html2canvas`
  - `tailwindcss`

### 📱 Navegadores Compatibles

- Chrome 100+
- Edge 100+
- Firefox 100+

⚠️ Safari móvil tiene limitaciones con exportación PNG/ZIP.

---

## 📦 Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd innovares-dashboard
```

### 2. Backend

```bash
cd backend
npm install
```

### 3. Frontend

```bash
cd ../frontend
npm install
```

---

## ▶️ Ejecución del Proyecto

### Iniciar Backend

```bash
cd backend
node index.js
# o
npm start
```

Backend disponible en: `http://localhost:3001`

### Iniciar Frontend

```bash
cd frontend
npm run dev
```

Frontend disponible en: `http://localhost:5173`

---

## 📊 Preparación del Archivo Excel

Compatible con reportes estándar exportados desde Moodle/OTEC.

### 🟦 Hoja de Avance

Puede llamarse:

- `Sin Avances`
- `Sin avances`
- `Avances`

**Columnas requeridas** (o equivalentes):

- `NOMBRE` / `Nombre` / `Nombre completo`
- `PORCENTAJE DE AVANCE TOTAL DEL CURSO` (0–1 o 0–100)

### 🟩 Prueba Diagnóstica

**Columnas requeridas:**

- `Nombre completo`
- `Dirección de correo`
- `Nota`

### 🟧 Prueba Final

**Columnas requeridas:**

- `Nombre completo`
- `Dirección de correo`
- `Nota`

⚠️ **Nota:** Encabezados pueden estar en B2, C3 o filas/columnas desplazadas.

---

## 📉 KPIs Calculados

Se calculan **10 KPIs oficiales**:

1. **Avance Promedio (%)** - Promedio del progreso de todos los alumnos.

2. **Alumnos Sin Avance** - Cantidad con avance = 0%.

3. **Porcentaje Sin Avance** - (cantidadSinAvance / totalInscritos) × 100

4. **Distribución por Tramos** - 0%, 1–25%, 26–50%, 51–75%, 76–99%, 100%.

5. **Rendición de Pruebas (%)** - Diagnóstica y Final.

6. **Tasa de Activación (%)** - Alumnos con avance ≥ 1%.

7. **Brecha de Compromiso** - 100 − avancePromedio

8. **Tasa de Finalización Proyectada** - min(100, (avancePromedioActual / semanaActual) × totalSemanas)

9. **Índice de Cumplimiento (%)** - Diagnóstica + Final.

10. **Tasa de Aprobación (%)** - Alumnos aprobados sobre el total inscrito.

---

## 🚨 Sistema de Alertas Inteligentes

El sistema genera alertas automáticas basadas en los KPIs calculados y en la semana actual del curso.  
Estas alertas ayudan a identificar riesgos tempranos, priorizar acciones y dar seguimiento efectivo a los alumnos.

Las alertas vienen ordenadas por prioridad, desde Crítica hasta Informativa.

### 🔴 Alertas en la Última Semana (Prioridad Muy Alta / Crítica)

Activadas cuando: `currentWeek === totalWeeks`

**Pendientes de rendir Prueba Final**

- Si el porcentaje de alumnos que han rendido la Prueba Final es < 100%
- Prioridad: 1 (Muy Alta)
- Acción: Contactar urgentemente a los alumnos que aún no rinden
- Objetivo: Evitar reprobar por no presentar evaluación

**Alumnos con avance ≤ 25%**

- Si existen alumnos en tramos 0% o 1–25%
- Prioridad: 1 (Muy Alta)
- Acción: Contacto inmediato para apoyo o refuerzo
- Objetivo: Minimizar riesgo de abandono

**Encuesta de Satisfacción pendiente**

- Siempre se incluye en semana final
- Prioridad: Informativa
- Acción: Recordar completar encuesta
- Objetivo: Cumplimiento administrativo / certificación

### 🟠 Alertas en Semanas Intermedias

**Alumnos Sin Avance**

- Condición: porcentajeSinAvance ≥ 20%
  - 20% o más → Prioridad 2 (Alta)
  - Menos de 20% → Prioridad 3 (Media)
- Objetivo: Activar participación temprana

**Avance Bajo (1–25%)**

- Condición: (Alumnos en tramo 1–25%) ≥ 15% del total
- Prioridad: 3 (Media)
- Acción: Detectar barreras iniciales

**Baja rendición de Prueba Final**

- Se mide aunque no sea semana final
  - < 30% → 1 (Crítica)
  - < 50% → 2 (Alta)
- Objetivo: Evitar colapsos de última hora

**Índice de Cumplimiento (Diagnóstica + Final)**

- Condición:
  - < 25% → 1 (Crítica)
  - < 40% → 2 (Alta)
- Objetivo: Garantizar que los alumnos completen ambas evaluaciones

### 🟡 Orden de Prioridad

El sistema ordena automáticamente todas las alertas usando esta jerarquía:

1. Crítica
2. Muy Alta
3. Alta
4. Media
5. Informativa

| Situación                         | Prioridad | Semana |
| --------------------------------- | --------- | ------ |
| Final rendida < 30%               | 1         | Todas  |
| Cumplimiento < 25%                | 1         | Todas  |
| Avance ≤ 25% en última semana     | 1         | Última |
| Final no rendida en última semana | 1         | Última |
| Sin avance ≥ 20%                  | 2–3       | Todas  |
| Rendición Final < 50%             | 2         | Todas  |
| Avance 1–25% ≥ 15%                | 3         | Todas  |
| Encuesta de satisfacción          | Info      | Última |

---

## 🧰 API REST

### POST `/api/upload`

**Body (FormData):**

- `file` - Archivo Excel
- `currentWeek` - Semana actual
- `totalWeeks` - Total de semanas

**Respuesta:** KPIs, distribución, evaluaciones y alertas.

---

## 🎨 Tema y Exportación

- Modo oscuro por defecto
- Exportación en modo claro
- Exportación ZIP con:
  - Gráficos PNG
  - Alertas
  - KPIs

---

## ⚠️ Limitaciones

- Cambios radicales en nombres de hojas o columnas pueden afectar el procesamiento
- Tamaño máximo de archivo recomendado: 50 MB
- Requiere Node 18+ para full compatibilidad

---

## 🔄 Flujo del Sistema

```
1. Usuario sube Excel
2. Backend detecta hojas y columnas
3. Calcula KPIs y alertas
4. Envía datos al frontend
5. Frontend muestra métricas y gráficos
6. Usuario exporta ZIP con reportes
```

---

## 🧪 Pruebas Realizadas

- Hospital del Profesor (4/4)
- DEA (2/4)
- Urgencias Respiratorias (2/4)
- Variación de hojas (Sin Avances, Avances)
- Encabezados desplazados
- Avance 0–1 y 0–100
- Notas con coma
- Final vacía

---

## 🔐 Consideraciones de Seguridad y Vulnerabilidades

El proyecto utiliza la librería `xlsx` para procesar archivos Excel.  
Actualmente, `npm audit` reporta una vulnerabilidad conocida asociada a esta dependencia:

- Prototype Pollution
- Regular Expression Denial of Service (ReDoS)
- No existe parche disponible al momento del desarrollo

### ⚠️ Impacto real en el proyecto

Para el uso actual dentro de Innovares, este riesgo es bajo, debido a que:

- Los archivos Excel provienen de fuentes controladas (Moodle/OTEC), no de usuarios externos anónimos
- El sistema no es público ni accesible a internet como API abierta
- No se procesan archivos arbitrarios cargados por terceros
- El backend solo funciona en entorno interno/local

### 🧩 Recomendación a futuro

Se recomienda:

- Actualizar `xlsx` cuando la comunidad libere una versión corregida
- Mantener `npm audit` como herramienta de monitoreo en instalaciones futuras

### ✔️ Conclusión

La vulnerabilidad no afecta el funcionamiento del sistema y, en el contexto de uso interno del proyecto, su impacto es mínimo.  
Aun así, se deja documentada para asegurar transparencia y buenas prácticas de seguridad.
