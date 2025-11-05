// --- 1. Lógica para elegir el color de la barra ---
const getBarColorClass = (percentage) => {
  const value = parseFloat(percentage) || 0;
  if (value < 40) return 'bg-red-500'; // Malo
  if (value < 75) return 'bg-amber-500'; // Regular
  return 'bg-emerald-500'; // Bueno
};

function ProgressBarComponent({ title, percentage }) {
  // --- 2. Obtenemos la clase de color ---
  const colorClass = getBarColorClass(percentage);

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-base font-medium text-[var(--color-texto-secundario)]">{title}</span>
        <span className="text-sm font-medium text-[var(--color-texto-secundario)]">{percentage}%</span>
      </div>
      <div className="w-full bg-[var(--color-grafico-base)] rounded-full h-2.5">
        {/* --- 3. Aplicamos la clase de color dinámica --- */}
        <div 
          className={`${colorClass} h-2.5 rounded-full transition-all duration-300 ease-in-out`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

export default ProgressBarComponent;