import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { OceanScores } from '../types';

interface Props {
  scores: OceanScores;
}

const OceanChart: React.FC<Props> = ({ scores }) => {
  const data = [
    { name: 'Open', value: scores.openness },
    { name: 'Cons.', value: scores.conscientiousness },
    { name: 'Extra.', value: scores.extraversion },
    { name: 'Agree.', value: scores.agreeableness },
    { name: 'Neuro.', value: scores.neuroticism },
  ];

  // Tailwind colors for each bar to make them distinct
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <div className="h-64 w-full relative">
       <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis dataKey="name" type="category" width={50} tick={{fontSize: 12}} />
          <Tooltip cursor={{fill: 'transparent'}} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="absolute top-0 right-0 text-xs text-gray-400">Big 5 (OCEAN)</div>
    </div>
  );
};

export default OceanChart;