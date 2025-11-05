import { forwardRef } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = {
  green: '#34d399',
  yellow: '#fbbf24',
  red: '#ef4444',
  base: '#4b5563'
};

const STATUS_CRITERIA = {
  positive: {
    good: { threshold: 70, color: COLORS.green, label: 'Satisfactorio' },
    medium: { threshold: 50, color: COLORS.yellow, label: 'En Proceso' },
    low: { color: COLORS.red, label: 'Requiere Atención' }
  },
  negative: {
    good: { threshold: 15, color: COLORS.green, label: 'Satisfactorio' },
    medium: { threshold: 30, color: COLORS.yellow, label: 'En Proceso' },
    low: { color: COLORS.red, label: 'Requiere Atención' }
  }
};

const getGaugeStatus = (value, title) => {
  const numericValue = parseFloat(value) || 0;
  const isNegativeMetric = title.includes('Sin Avance');
  const criteria = isNegativeMetric ? STATUS_CRITERIA.negative : STATUS_CRITERIA.positive;
  
  if (isNegativeMetric) {
    if (numericValue <= criteria.good.threshold) return criteria.good;
    if (numericValue <= criteria.medium.threshold) return criteria.medium;
    return criteria.low;
  } else {
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
        <h3 className="text-sm font-medium text-[var(--color-titulo-grafico)] text-center">{title}</h3>
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
          <span className="text-2xl font-bold text-[var(--color-porcentaje-grafico)]">
            {`${numericValue.toFixed(0)}%`}
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-col items-center gap-1">
        {numerator !== undefined && denominator !== undefined && !title.includes('Sin Avance') && (
          <span className="text-xs text-[var(--color-texto-grafico-secundario)]">
            {numerator} de {denominator} alumnos
          </span>
        )}
        
        <div className="group relative">
          <button className="text-xs text-gray-400 hover:text-[var(--color-titulo-grafico)]">
            Ver criterios de evaluación
          </button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 rounded-lg shadow-lg text-xs">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.green }}></span>
                <span className="text-[var(--color-texto-grafico-secundario)]">{explanation.good}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.yellow }}></span>
                <span className="text-[var(--color-texto-grafico-secundario)]">{explanation.medium}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.red }}></span>
                <span className="text-[var(--color-texto-grafico-secundario)]">{explanation.low}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default GaugeChartCard;
