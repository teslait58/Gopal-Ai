import React, { useState } from 'react';
import { Quote, TrendingUp, CheckCircle, Briefcase } from 'lucide-react';

const CASE_STUDIES = [
  {
    category: "Architecture",
    title: "High-Rise Residential Tower (NY)",
    challenge: "Client faced tight deadlines for a 40-story tower with a backlog of redlines.",
    solution: "TOS deployed 4 dedicated Revit modelers working overnight shifts.",
    outcome: "LOD 350 model delivered 2 weeks early; overhead reduced by 40%.",
    quote: "TOS became an extension of our team, effectively doubling our production capacity."
  },
  {
    category: "MEP Engineering",
    title: "500-Bed Hospital Renovation (TX)",
    challenge: "Complex clash detection needed between HVAC ductwork and structural beams.",
    solution: "Senior BIM Coordinators utilized Navisworks for interference checks.",
    outcome: "Resolved 1,200+ clashes pre-construction, saving est. $150k in rework.",
    quote: "Their technical precision saved us from a nightmare on site. Highly recommended."
  },
  {
    category: "Structural",
    title: "Retail Complex Expansion (CA)",
    challenge: "Staff shortage during peak season prevented bidding on new projects.",
    solution: "Flexible team of AutoCAD drafters provided for Construction Documents.",
    outcome: "Client successfully bid and won 3 new projects with TOS support.",
    quote: "The scalability TOS offers is our competitive advantage now."
  },
  {
    category: "Architecture",
    title: "Luxury Hotel Resort (FL)",
    challenge: "Needed high-LOD interior modeling from point cloud scans.",
    solution: "Scan-to-BIM team modeled existing conditions to LOD 400.",
    outcome: "Eliminated manual field measurements; design phase cut by 3 weeks.",
    quote: "The accuracy of the existing conditions model was flawless."
  },
  {
    category: "MEP Engineering",
    title: "Data Center Cooling Retrofit (VA)",
    challenge: "Tight spatial constraints for new CRAC units in active facility.",
    solution: "Detailed 3D coordination to route piping around existing infrastructure.",
    outcome: "Zero downtime during installation; perfect fit-out.",
    quote: "TOS handled the complex coordination better than our in-house team."
  }
];

const CaseStudies = () => {
  const [filter, setFilter] = useState('All');
  
  const categories = ['All', 'Architecture', 'MEP Engineering', 'Structural'];

  const filteredStudies = filter === 'All' 
    ? CASE_STUDIES 
    : CASE_STUDIES.filter(study => study.category === filter);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-fade-in mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Referenceable Success Stories
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Filter by industry to find relevant proof points for your pitch.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                filter === cat
                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-100'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudies.map((study, idx) => (
          <div key={idx} className="bg-slate-50 rounded-lg p-5 border border-slate-100 flex flex-col h-full hover:shadow-md transition-all hover:border-indigo-200 group animate-fade-in">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                 <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${
                   study.category === 'Architecture' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                   study.category === 'MEP Engineering' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                   'bg-orange-50 text-orange-600 border-orange-100'
                 }`}>
                  {study.category}
                </span>
                <Briefcase className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm leading-tight">{study.title}</h4>
            </div>
            
            <div className="space-y-4 flex-1">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Challenge</span>
                <p className="text-xs text-slate-600 leading-relaxed">{study.challenge}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Solution</span>
                <p className="text-xs text-slate-600 leading-relaxed">{study.solution}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1 mb-1">
                  <CheckCircle className="w-3 h-3" /> Result
                </span>
                <p className="text-xs text-emerald-700 font-medium leading-relaxed">{study.outcome}</p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200/60">
              <div className="flex gap-3">
                <Quote className="w-5 h-5 text-indigo-200 shrink-0 -mt-1" />
                <p className="text-xs text-slate-500 italic leading-relaxed">"{study.quote}"</p>
              </div>
            </div>
          </div>
        ))}
        {filteredStudies.length === 0 && (
            <div className="col-span-full text-center py-12 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
                No case studies found for this category.
            </div>
        )}
      </div>
    </div>
  );
};

export default CaseStudies;