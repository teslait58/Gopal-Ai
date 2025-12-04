import React, { useState, useEffect } from 'react';
import { LeadIntelligence, PersonalityProfile } from '../types';
import { Target, TrendingUp, ShieldAlert, CheckCircle, CalendarClock, Briefcase, Zap, X, Plus, Sparkles, Brain, Save } from 'lucide-react';
import OceanChart from './OceanChart';

interface Props {
  data: LeadIntelligence;
  profile?: PersonalityProfile;
  onSave?: () => void;
}

const LeadIntelligenceDashboard: React.FC<Props> = ({ data, profile, onSave }) => {
  // State to manage active/inactive requirements
  const [requirements, setRequirements] = useState<{ text: string; active: boolean }[]>([]);

  // Sync state when data props change (new analysis)
  useEffect(() => {
    if (data.potentialRequirements) {
      setRequirements(
        data.potentialRequirements.map((req) => ({ text: req, active: true }))
      );
    }
  }, [data.potentialRequirements]);

  const toggleRequirement = (index: number) => {
    setRequirements((prev) => 
      prev.map((item, i) => i === index ? { ...item, active: !item.active } : item)
    );
  };

  const getProbabilityColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const scoreColorClass = getProbabilityColor(data.buyingProbability || 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8 animate-fade-in">
      <div className="bg-slate-900 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <Target className="w-5 h-5 text-indigo-400" />
               Lead Intelligence Report
             </h2>
             {data.personalityTone && (
                <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                  <Sparkles className="w-3 h-3 text-indigo-300" />
                  Vibe: {data.personalityTone}
                </span>
             )}
          </div>
          <p className="text-white text-opacity-90 text-xs mt-1">{data.leadSummary || "Analyzing lead potential..."}</p>
        </div>
        
        <div className="flex items-center gap-3 self-end md:self-center">
            <div className={`px-4 py-2 rounded-lg border flex items-center gap-3 ${scoreColorClass}`}>
              <div className="text-right">
                <span className="block text-[10px] uppercase font-bold tracking-wide opacity-80">Buying Probability</span>
                <span className="block text-2xl font-bold leading-none">{data.buyingProbability}%</span>
              </div>
              <TrendingUp className="w-6 h-6" />
            </div>

            {onSave && (
              <button 
                onClick={onSave}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg border border-slate-700 transition-colors flex items-center justify-center"
                title="Save Profile Analysis"
              >
                <Save className="w-5 h-5" />
              </button>
            )}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Requirements & Needs - Interactive Tags */}
        <div className="bg-indigo-50/50 rounded-xl p-5 border border-indigo-100">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Potential Requirements
            </h3>
            <span className="text-[10px] text-indigo-400 font-medium">
              {requirements.filter(r => r.active).length} Active
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {requirements.map((req, i) => (
              <button
                key={i}
                onClick={() => toggleRequirement(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border shadow-sm transition-all duration-200 ${
                  req.active 
                    ? 'bg-white text-indigo-700 border-indigo-200 hover:border-indigo-300' 
                    : 'bg-slate-50 text-slate-400 border-slate-200 border-dashed hover:bg-slate-100 decoration-slate-400'
                }`}
              >
                <span className={!req.active ? 'line-through' : ''}>{req.text}</span>
                {req.active ? (
                  <X className="w-3 h-3 text-indigo-400 hover:text-indigo-600" />
                ) : (
                  <Plus className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                )}
              </button>
            ))}
            {requirements.length === 0 && (
              <span className="text-xs text-indigo-400 italic">No requirements detected.</span>
            )}
          </div>
        </div>

        {/* Pitch Angle */}
        <div className="bg-violet-50/50 rounded-xl p-5 border border-violet-100">
          <h3 className="text-sm font-bold text-violet-900 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Best Pitch Angle
          </h3>
          <p className="text-sm text-slate-700 font-medium italic">
            "{data.bestPitchAngle}"
          </p>
        </div>

        {/* Proposal Points */}
        <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100 md:col-span-2 lg:col-span-1">
          <h3 className="text-sm font-bold text-emerald-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Proposal Highlights
          </h3>
          <ul className="space-y-2">
            {(data.personalizedProposalPoints || []).slice(0,3).map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Personality Chart Integration */}
      {profile?.oceanScores && (
        <div className="border-t border-gray-100 p-6 bg-slate-50/30">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-500" /> Psychological Drivers (Big 5 Traits)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
             <div className="md:col-span-1 h-52">
                <OceanChart scores={profile.oceanScores} />
             </div>
             <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border border-gray-200">
                   <div className="text-xs font-bold text-blue-600 mb-1">Openness</div>
                   <p className="text-[10px] text-slate-600 leading-tight">Willingness to try new things and be open to new experiences.</p>
                </div>
                <div className="bg-white p-3 rounded border border-gray-200">
                   <div className="text-xs font-bold text-emerald-600 mb-1">Conscientiousness</div>
                   <p className="text-[10px] text-slate-600 leading-tight">Desire to be careful, diligent, and regulate immediate gratification.</p>
                </div>
                <div className="bg-white p-3 rounded border border-gray-200">
                   <div className="text-xs font-bold text-amber-600 mb-1">Extraversion</div>
                   <p className="text-[10px] text-slate-600 leading-tight">State of being energized by the company of others vs solitude.</p>
                </div>
                <div className="bg-white p-3 rounded border border-gray-200">
                   <div className="text-xs font-bold text-violet-600 mb-1">Agreeableness</div>
                   <p className="text-[10px] text-slate-600 leading-tight">Tendency to agree with others, trusting and helpful nature.</p>
                </div>
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-t border-gray-100">
        
        {/* Objections */}
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
          <h3 className="text-sm font-bold text-red-900 mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" /> Possible Objections
          </h3>
          <ul className="space-y-3">
            {(data.possibleObjections || []).map((obj, i) => (
              <li key={i} className="flex items-start gap-3 bg-red-50 p-2.5 rounded-lg border border-red-100">
                <span className="text-red-500 font-bold text-xs mt-0.5">•</span>
                <span className="text-xs text-slate-700">{obj}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 7 Day Follow Up */}
        <div className="p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-indigo-500" /> 7-Day Follow-Up Strategy
          </h3>
          <div className="space-y-4 relative">
             <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200"></div>
             {(data.followUpStrategy || []).map((step, i) => (
               <div key={i} className="relative pl-8">
                 <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-white border-2 border-indigo-400 z-10 flex items-center justify-center text-[9px] font-bold text-indigo-600">
                   {i+1}
                 </div>
                 <p className="text-xs text-slate-600 leading-relaxed">
                   <span className="font-semibold text-slate-900 mr-1">{step.split(':')[0]}:</span> 
                   {step.split(':').slice(1).join(':')}
                 </p>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadIntelligenceDashboard;