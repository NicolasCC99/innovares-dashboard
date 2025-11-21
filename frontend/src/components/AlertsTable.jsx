// Define el color de la fila según la prioridad
const getPriorityClass = (priority) => {
  const priorityText = String(priority).toLowerCase();


  if (priorityText.includes('crítica')) {

    return 'bg-[var(--color-alerta-critica-fondo)] border-red-700/50 hover:bg-red-800/80';
  }
  if (priorityText.includes('muy alta')) {
    return 'bg-red-800/80 border-red-600/50 hover:bg-red-700/80';
  }
  if (priorityText.includes('alta')) {
    return 'bg-[var(--color-alerta-alta-fondo)] border-amber-600/50 hover:bg-amber-700/80';
  }
  if (priorityText.includes('media')) {
    return 'bg-[var(--color-alerta-media-fondo)] border-lime-600/50 hover:bg-lime-700/80';
  }

  return 'bg-[var(--color-alerta-info-fondo)] border-[var(--color-borde)] hover:bg-gray-700/50';
};

function AlertsTable({ alertsData }) {

  if (!alertsData || alertsData.length === 0) {

    return <p className="text-[var(--color-texto-secundario)]">No hay alertas críticas por el momento.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg shadow-md border border-[var(--color-borde)]">
      <table className="min-w-full text-sm text-left">
        <thead className="text-xs uppercase bg-gray-700 text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-3">Prioridad</th>
            <th scope="col" className="px-6 py-3">Acción Sugerida</th>
            <th scope="col" className="px-6 py-3">Objetivo</th>
          </tr>
        </thead>
        <tbody className="text-[var(--color-texto-secundario)]">
          {alertsData.map((alert, index) => (
            <tr 
              key={index} 

              className={`border-b ${getPriorityClass(alert.priority)} transition-colors duration-150`}
            >

              <td className="px-6 py-4 font-medium text-[var(--color-texto-principal)]">{alert.priority}</td>
              <td className="px-6 py-4">{alert.action}</td>
              <td className="px-6 py-4">{alert.objective}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AlertsTable;