import { forwardRef } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = {
  green: '#34d399',
  yellow: '#fbbf24',
  red: '#ef4444',
  base: '#4b5563'
};

const STATUS_CRITERIA = {
  // Para métricas donde un valor alto es mejor (ej: Avance, Aprobación)
  positive: {
    good: { threshold: 70, color: COLORS.green, label: 'Satisfactorio' },
    medium: { threshold: 50, color: COLORS.yellow, label: 'En Proceso' },
    low: { color: COLORS.red, label: 'Requiere Atención' }
  },
  // Para métricas donde un valor bajo es mejor (ej: Sin Avance)
  negative: {
    good: { threshold: 15, color: COLORS.green, label: 'Satisfactorio' },
    medium: { threshold: 30, color: COLORS.yellow, label: 'En Proceso' },
    low: { color: COLORS.red, label: 'Requiere Atención' }
  }
};

// Función para determinar el estado del indicador
const getGaugeStatus = (value, title) => {
  const numericValue = parseFloat(value) || 0;
  const isNegativeMetric = title.includes('Sin Avance');
  const criteria = isNegativeMetric ? STATUS_CRITERIA.negative : STATUS_CRITERIA.positive;
  
  if (isNegativeMetric) {
    // Para métricas donde un valor bajo es mejor
    if (numericValue <= criteria.good.threshold) return criteria.good;
    if (numericValue <= criteria.medium.threshold) return criteria.medium;
    return criteria.low;
  } else {
    // Para métricas donde un valor alto es mejor
    if (numericValue >= criteria.good.threshold) return criteria.good;
    if (numericValue >= criteria.medium.threshold) return criteria.medium;
    return criteria.low;
  }
};


const GaugeChartCard = forwardRef(({ title, value, numerator, denominator }, ref) => {
  const numericValue = Math.max(0, Math.min(100, parseFloat(value) || 0));
  const status = getGaugeStatus(numericValue, title);
  
  const data = [
    { name: 'value', value: numericValue },
    { name: 'base', value: 100 - numericValue },
  ];

  // Determinamos el mensaje explicativo según el tipo de métrica
  const getMetricExplanation = () => {
    const isNegativeMetric = title.includes('Sin Avance');
    if (isNegativeMetric) {
      return {
        good: '≤ 15% es ideal',
        medium: '15-30% necesita seguimiento',
        high: '> 30% requiere intervención'
      };
    }
    return {
      good: '≥ 70% es ideal',
      medium: '50-70% necesita seguimiento',
      low: '< 50% requiere intervención'
    };
  };

  const explanation = getMetricExplanation();

  return (
    <div ref={ref} className="p-4 flex flex-col items-center justify-between min-h-[220px]">
      <div className="flex flex-col items-center gap-2 mb-2">
        <h3 className="text-sm font-medium text-white text-center">{title}</h3>
        <span className="text-xs font-medium" style={{ color: status.color }}>
          {status.label}
        </span>
      </div>
      
      <div style={{ width: '100%', height: 120 }} className="relative">
        <ResponsiveContainer>
          <PieChart>
            <Pie 
              data={data} 
              dataKey="value" 
              cx="50%" 
              cy="50%" 
              innerRadius="70%" 
              outerRadius="90%" 
              startAngle={90} 
              endAngle={-270} 
              paddingAngle={0} 
              cornerRadius={6}
            >
              <Cell fill={status.color} />
              <Cell fill={COLORS.base} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="text-white text-2xl font-bold">
            {`${numericValue.toFixed(0)}%`}
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-col items-center gap-1">
        {numerator !== undefined && denominator !== undefined && !title.includes('Sin Avance') && (
          <span className="text-xs text-gray-300">
            {numerator} de {denominator} alumnos
          </span>
        )}
        
        {/* Tooltip con la explicación de los rangos */}
        <div className="group relative">
          <button className="text-xs text-gray-400 hover:text-white">
            Ver criterios de evaluación
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 rounded-lg shadow-lg text-xs">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.green }}></span>
                <span className="text-gray-300">{explanation.good}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.yellow }}></span>
                <span className="text-gray-300">{explanation.medium}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.red }}></span>
                <span className="text-gray-300">{explanation.low}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default GaugeChartCard;