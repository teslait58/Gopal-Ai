import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { DiscScores } from '../types';

interface Props {
  scores: DiscScores;
}

const DiscChart: React.FC<Props> = ({ scores }) => {
  const data = [
    { subject: 'Dominance', A: scores.dominance, fullMark: 100 },
    { subject: 'Influence', A: scores.influence, fullMark: 100 },
    { subject: 'Steadiness', A: scores.steadiness, fullMark: 100 },
    { subject: 'Compliance', A: scores.conscientiousness, fullMark: 100 },
  ];

  return (
    <div className="h-64 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Candidate"
            dataKey="A"
            stroke="#ef4444"
            strokeWidth={3}
            fill="#ef4444"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="absolute top-0 right-0 text-xs text-gray-400">DISC Profile</div>
    </div>
  );
};

export default DiscChart;