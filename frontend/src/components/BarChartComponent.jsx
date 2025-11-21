import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

function BarChartComponent({ data }) {
  if (!data) {
    return <p>Cargando datos del gráfico...</p>;
  }

  const COLORS = {
    bar: '#34d399',
    grid: '#4b5563',
    text: '#ffffff',
    textSecondary: '#cbd5e1'
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke={COLORS.grid} 
          strokeOpacity={0.5} 
        />
        
        <XAxis 
          dataKey="name" 
          stroke={COLORS.textSecondary} 
          fontSize={12} 
          tickMargin={5}
        />
        <YAxis 
          stroke={COLORS.textSecondary} 
          fontSize={12}
          tickMargin={5}
        />
        
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'transparent',
            border: 'none',
            boxShadow: 'none'
          }}
          labelStyle={{ color: COLORS.text }}
          itemStyle={{ color: COLORS.bar, fontWeight: 'bold' }}
        />
        
        <Legend 
          wrapperStyle={{ 
            fontSize: '12px', 
            paddingTop: '10px', 
            color: COLORS.textSecondary 
          }} 
        />
        
        <Bar 
          dataKey="Alumnos" 
          fill={COLORS.bar}
          radius={[4, 4, 0, 0]} 
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default BarChartComponent;