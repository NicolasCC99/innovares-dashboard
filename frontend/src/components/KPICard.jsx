import { forwardRef } from 'react';

// --- (Función renderIcon() completa aquí) ---
// Define qué ícono SVG mostrar basado en el título
const renderIcon = (title, value, totalInscritos) => {
  const status = getValueStatus(title, value, totalInscritos);
  
  if (status.icon === 'check') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${status.color}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  
  if (status.icon === 'warning') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${status.color}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    );
  }
  
  if (status.icon === 'alert') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${status.color}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    );
  }

  if (status.icon === 'info') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${status.color}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
      </svg>
    );
  }

  return null;
};

// --- Lógica de estado y color basada en porcentajes del total ---
const getValueStatus = (title, value, totalInscritos) => {
  const numValue = parseFloat(value) || 0;
  const total = parseInt(totalInscritos) || 0;

  // Si es el total de inscritos, retornamos un estado neutral
  if (title.includes('Total')) {
    return {
      color: 'text-blue-500',
      icon: 'info',
      label: 'Informativo'
    };
  }

  // Calculamos el porcentaje según el tipo de métrica
  let percentage;
  if (title.includes('%') || title.toLowerCase().includes('tasa') || title.toLowerCase().includes('porcentaje')) {
    percentage = numValue; // Ya es un porcentaje
  } else {
    percentage = total > 0 ? (numValue / total) * 100 : 0;
  }

  // Definimos los umbrales según el tipo de métrica
  if (title.includes('sin Avance') || title.includes('Brecha')) {
    // Métricas donde un valor bajo es mejor
    if (percentage <= 10) {
      return {
        color: 'text-green-500',
        icon: 'check',
        label: 'Bueno'
      };
    }
    if (percentage <= 25) {
      return {
        color: 'text-yellow-500',
        icon: 'warning',
        label: 'Regular'
      };
    }
    return {
      color: 'text-red-500',
      icon: 'alert',
      label: 'Necesita Atención'
    };
  } else {
    // Métricas donde un valor alto es mejor
    if (percentage >= 80) {
      return {
        color: 'text-green-500',
        icon: 'check',
        label: 'Bueno'
      };
    }
    if (percentage >= 60) {
      return {
        color: 'text-yellow-500',
        icon: 'warning',
        label: 'Regular'
      };
    }
    return {
      color: 'text-red-500',
      icon: 'alert',
      label: 'Necesita Atención'
    };
  }
};

// --- KPICard con nueva lógica de estado ---
const KPICard = forwardRef(({ title, value, unit, totalInscritos }, ref) => {
  const status = getValueStatus(title, value, totalInscritos);
  
  return (
    <div ref={ref} className="p-4">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white">{title}</h3>
          <span className={`text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
        {renderIcon(title, value, totalInscritos)}
      </div>
      <p className={`text-3xl font-bold mt-1 ${status.color} transition-colors duration-200`}>
        {value}
        <span className="text-xl font-semibold text-gray-300 ml-1">{unit}</span>
      </p>
    </div>
  );
});

export default KPICard;