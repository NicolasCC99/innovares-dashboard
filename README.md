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

## ▶️ Ejecución del Proyecto

### Iniciar Backend

```bash
cd backend
npm run dev
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

## 🚨 Sistema de Alertas Inteligentes

### Última Semana

- Pendientes de rendir Final
- Avance bajo (≤ 25%)
- Encuesta de satisfacción

### Semanas Previas

- Sin avance elevado
- Bajo avance inicial
- Baja rendición de pruebas
- Cumplimiento insuficiente

**Alertas ordenadas por prioridad:** Crítica → Informativa

## 🧰 API REST

### POST `/api/upload`

**Body (FormData):**

- `file` - Archivo Excel
- `currentWeek` - Semana actual
- `totalWeeks` - Total de semanas

**Respuesta:** KPIs, distribución, evaluaciones y alertas.

## 🎨 Tema y Exportación

- Modo oscuro por defecto.
- Exportación en modo claro.
- Exportación ZIP con:
  - Gráficos PNG
  - Alertas
  - KPIs

## ⚠️ Limitaciones

- Cambios radicales en nombres de hojas o columnas pueden afectar el procesamiento.
- Tamaño máximo de archivo recomendado: 50 MB.
- Requiere Node 18+ para full compatibilidad.

## 🔄 Flujo del Sistema

```
1. Usuario sube Excel
2. Backend detecta hojas y columnas
3. Calcula KPIs y alertas
4. Envía datos al frontend
5. Frontend muestra métricas y gráficos
6. Usuario exporta ZIP con reportes
```

🧪 Pruebas Realizadas

- Hospital del Profesor (4/4)
- DEA (2/4)
- Urgencias Respiratorias (2/4)
- Variación de hojas (Sin Avances, Avances)
- Encabezados desplazados
- Avance 0–1 y 0–100
- Notas con coma
- Final vacía

```

```
