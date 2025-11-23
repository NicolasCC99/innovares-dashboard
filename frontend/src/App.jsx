import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';

// Importación de componentes
import KPICard from './components/KPICard';
import GaugeChartCard from './components/GaugeChartCard';
import BarChartComponent from './components/BarChartComponent';
import ProgressBarComponent from './components/ProgressBarComponent';
import AlertsTable from './components/AlertsTable';
import FileUpload from './components/FileUpload';

function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Referencias para exportación a imagen
  const refGaugeAvance = useRef(null);
  const refGaugeAprobacion = useRef(null);
  const refGaugeActivacion = useRef(null);
  const refGaugeCumplimiento = useRef(null);
  const refGaugeSinAvance = useRef(null);
  const refKpiTotal = useRef(null);
  const refKpiCantidadSinAvance = useRef(null);
  const refKpiBrecha = useRef(null);
  const refKpiProyectada = useRef(null);
  const refBarChart = useRef(null);
  const refProgressBars = useRef(null);
  const refAlertsTable = useRef(null);

  // Manejadores de eventos
  const handleDataProcessed = (data) => {
    setDashboardData(data);
  };

  const handleDownloadZip = async () => {
    if (!dashboardData) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const addImageToZip = async (element, fileName) => {
        if (!element) {
          console.warn(`Elemento para ${fileName} no encontrado.`);
          return;
        }
        const canvas = await html2canvas(element, {
          backgroundColor: null,
          scale: 2,
          onclone: (clonedDoc) => {
            // Ajustes de estilo para la exportación (modo claro)
            const rootElement = clonedDoc.querySelector('.bg-\\[var\\(--color-fondo-tarjeta\\)\\]') || clonedDoc.querySelector('div');
            if (rootElement) {
              rootElement.classList.add('export-blanco');
            } else {
              clonedDoc.documentElement.classList.add('export-blanco');
            }

            clonedDoc.querySelectorAll('*').forEach(el => el.classList.add('export-blanco'));
          }
        });
        const imageData = canvas.toDataURL('image/png').split(';base64,')[1];
        zip.file(fileName, imageData, { base64: true });
      };

      const captureTasks = [
        { el: refGaugeAvance.current, name: '01-Avance_Promedio.png' },
        { el: refGaugeAprobacion.current, name: '02-Tasa_Aprobacion.png' },
        { el: refGaugeActivacion.current, name: '03-Tasa_Activacion.png' },
        { el: refGaugeCumplimiento.current, name: '04-Indice_Cumplimiento.png' },
        { el: refGaugeSinAvance.current, name: '05-Porc_Sin_Avance.png' },
        { el: refKpiTotal.current, name: '06-Total_Inscritos.png' },
        { el: refKpiCantidadSinAvance.current, name: '07-Cantidad_Sin_Avance.png' },
        { el: refKpiBrecha.current, name: '08-Brecha_Compromiso.png' },
        { el: refKpiProyectada.current, name: '09-Finalizacion_Proyectada.png' },
        { el: refBarChart.current, name: '10-Distribucion_Avance.png' },
        { el: refProgressBars.current, name: '11-Estado_Evaluaciones.png' },
        { el: refAlertsTable.current, name: '12-Alertas_Sugeridas.png' }
      ];

      for (const task of captureTasks) {
        await addImageToZip(task.el, task.name);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = "Reporte_Dashboard_Innovares.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error al generar el ZIP:', error);
    } finally {
      setIsDownloading(false);
    }
  };


  // Renderizado de la interfaz
  return (
    <div className="bg-[var(--color-fondo-pagina)] text-[var(--color-texto-principal)] min-h-screen p-8">
      <div className="max-w-7xl mx-auto">

        <header className="mb-8 pb-6 border-b border-[var(--color-borde)]">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold">Dashboard de Avance de Cursos</h1>
              <p className="text-[var(--color-texto-secundario)]">Reporte para Empresas - Innovares</p>
            </div>
            {dashboardData && (
              <button
                onClick={handleDownloadZip}
                disabled={isDownloading}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 hover:shadow-lg"
              >
                {isDownloading ? 'Generando ZIP...' : 'Descargar Paquete (.zip)'}
              </button>
            )}
          </div>
        </header>

        <div className="mb-8">
          <FileUpload onDataProcessed={handleDataProcessed} />
        </div>

        {dashboardData ? (
          <main className="space-y-8">

            <h2 className="text-2xl font-semibold -mb-4">Métricas de Progreso</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              <GaugeChartCard ref={refGaugeAvance} title="Avance Promedio" value={dashboardData.avancePromedio} />
              <GaugeChartCard ref={refGaugeAprobacion} title="Tasa de Aprobación" value={dashboardData.tasaAprobacion} numerator={dashboardData.cantidadAprobados} denominator={dashboardData.totalInscritos} />
              <GaugeChartCard ref={refGaugeActivacion} title="Tasa de Activación" value={dashboardData.tasaActivacion} numerator={dashboardData.cantidadActivos} denominator={dashboardData.totalInscritos} />
              <GaugeChartCard ref={refGaugeCumplimiento} title="Índice Cumplimiento" value={dashboardData.indiceCumplimiento} numerator={dashboardData.ambasRendidas} denominator={dashboardData.totalInscritos} />
              <GaugeChartCard ref={refGaugeSinAvance} title="Porcentaje Sin Avance" value={dashboardData.porcentajeSinAvance} numerator={dashboardData.cantidadSinAvance} denominator={dashboardData.totalInscritos} />
            </div>

            <h2 className="text-2xl font-semibold -mb-4">Indicadores Clave</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard
                ref={refKpiTotal}
                title="Total Inscritos"
                value={dashboardData.totalInscritos}
                unit=" alumnos"
                totalInscritos={dashboardData.totalInscritos}
              />
              <KPICard
                ref={refKpiCantidadSinAvance}
                title="Alumnos sin Avance"
                value={dashboardData.cantidadSinAvance}
                unit=" alumnos"
                totalInscritos={dashboardData.totalInscritos}
              />
              <KPICard
                ref={refKpiBrecha}
                title="Brecha de Compromiso"
                value={dashboardData.brechaCompromiso}
                unit="%"
                totalInscritos={dashboardData.totalInscritos}
              />
              <KPICard
                ref={refKpiProyectada}
                title="Tasa Finalización Proyectada"
                value={dashboardData.tasaFinalizacionProyectada}
                unit="%"
                totalInscritos={dashboardData.totalInscritos}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div ref={refBarChart} className="bg-[var(--color-fondo-tarjeta)] p-6 rounded-xl shadow-lg lg:col-span-2">
                <h2 className="text-xl font-semibold mb-4">Distribución de Avance (Total: {dashboardData.totalInscritos} Alumnos)</h2>
                <BarChartComponent data={dashboardData.distribucionAvance} />
              </div>
              <div ref={refProgressBars} className="bg-[var(--color-fondo-tarjeta)] p-6 rounded-xl shadow-lg flex flex-col gap-6">
                <h2 className="text-xl font-semibold">Estado de Evaluaciones (Base: {dashboardData.totalInscritos} Alumnos)</h2>
                <ProgressBarComponent title="Prueba Diagnóstica Rendida" percentage={dashboardData.detalleEvaluaciones?.diagnostica || 0} />
                <ProgressBarComponent title="Prueba Final Rendida" percentage={dashboardData.detalleEvaluaciones?.final || 0} />
              </div>
            </div>

            <div ref={refAlertsTable} className="bg-[var(--color-fondo-tarjeta)] p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-semibold mb-4">Alertas y Acciones Sugeridas</h2>
              <AlertsTable alertsData={dashboardData.alertas} />
            </div>

          </main>
        ) : (
          <div className="text-center bg-[var(--color-fondo-tarjeta)] p-8 rounded-xl">
            <p>Por favor, sube un archivo de reporte y completa las semanas para ver los datos.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;