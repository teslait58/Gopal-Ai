import React, { useState, useRef, useEffect } from 'react';
import { analyzeProfile, analyzeMeetingContext } from './services/geminiService';
import { AnalysisResult, MeetingContextAnalysis, CommunicationChannel, SavedProfile } from './types';
import DiscChart from './components/DiscChart';
import OceanChart from './components/OceanChart';
import ContentGenerator from './components/ContentGenerator';
import LeadIntelligenceDashboard from './components/LeadIntelligenceDashboard';
import CaseStudies from './components/CaseStudies';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  BrainCircuit, 
  Search, 
  ThumbsUp, 
  ThumbsDown, 
  Battery, 
  BatteryWarning, 
  MessageSquare, 
  PenTool,
  Zap,
  ArrowRight,
  Loader2,
  History,
  X,
  Save,
  NotebookPen,
  ScanSearch,
  AlertCircle,
  Lightbulb,
  Phone,
  Mail,
  ShieldAlert,
  AlertTriangle,
  FileUp,
  Trash2,
  Clock
} from 'lucide-react';

const SAMPLE_PROFILE = `Name: John Doe
Company: Apex Architecture
Role: Senior Architect
Context: Looking to outsource drafting.
Communication Style: Direct, no-nonsense.
Notes: Concerned about quality control and turnaround time. Has 3 large multi-family projects starting next month.`;

export default function App() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'context' | 'history'>('context');
  
  // Meeting Context State
  const [meetingSummary, setMeetingSummary] = useState('');
  const [contextChannel, setContextChannel] = useState<CommunicationChannel>(CommunicationChannel.CALL);
  const [contextAnalysis, setContextAnalysis] = useState<MeetingContextAnalysis | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  // History State
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  useEffect(() => {
    // Set worker source for PDF.js - Handle potential default export structure
    const lib = pdfjsLib as any;
    
    // Dynamically detect version to prevent mismatch errors (e.g. API 5.4 vs Worker 3.11)
    const pdfVersion = lib.version || lib.default?.version || '3.11.174';
    
    // Newer versions (v4+) often use .mjs for the worker
    const majorVersion = parseInt(pdfVersion.split('.')[0]);
    const suffix = majorVersion >= 4 ? 'min.mjs' : 'min.js';
    
    // Use unpkg to fetch the exact matching version
    const workerSrc = `https://unpkg.com/pdfjs-dist@${pdfVersion}/build/pdf.worker.${suffix}`;
    
    if (lib.GlobalWorkerOptions) {
      lib.GlobalWorkerOptions.workerSrc = workerSrc;
    } else if (lib.default?.GlobalWorkerOptions) {
      lib.default.GlobalWorkerOptions.workerSrc = workerSrc;
    }

    // Load saved profiles
    const loadedProfiles = localStorage.getItem('savedProfiles');
    if (loadedProfiles) {
      try {
        setSavedProfiles(JSON.parse(loadedProfiles));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeProfile(input);
      setAnalysis(result);
    } catch (err: any) {
      console.error("Analysis Error:", err);
      setError(err.message || "Failed to analyze profile. Please check your API key and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeContext = async () => {
    if (!meetingSummary.trim()) return;
    setContextLoading(true);
    setContextError(null);
    try {
      const result = await analyzeMeetingContext(meetingSummary, contextChannel);
      setContextAnalysis(result);
    } catch (err: any) {
      console.error("Context Analysis Error:", err);
      setContextError(err.message || "Failed to analyze meeting context.");
    } finally {
      setContextLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setError(null);

    try {
      let text = "";
      const fileType = file.name.split('.').pop()?.toLowerCase();

      if (fileType === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        
        // Handle getDocument depending on export structure
        const lib = pdfjsLib as any;
        const getDocument = lib.getDocument || lib.default?.getDocument;
        
        if (!getDocument) throw new Error("PDF library not loaded correctly. Please try refreshing.");

        const pdf = await getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + "\n";
        }
        text = fullText;

      } else if (fileType === 'xlsx' || fileType === 'xls') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        text = XLSX.utils.sheet_to_csv(sheet);

      } else if (fileType === 'csv' || fileType === 'txt') {
        text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsText(file);
        });
      } else {
        throw new Error("Unsupported file format. Please upload PDF, Excel, or CSV.");
      }

      setInput(prev => (prev ? prev + "\n\n--- IMPORTED DATA ---\n" + text : text));

    } catch (err: any) {
      console.error("File Import Error:", err);
      setError(err.message || "Failed to import file.");
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Profile Management
  const handleSaveProfile = () => {
    if (!analysis) return;
    
    const newProfile: SavedProfile = {
      id: crypto.randomUUID(),
      name: analysis.profile?.headline || "Unknown Profile",
      headline: analysis.leadIntelligence?.leadSummary?.substring(0, 50) + "..." || "No summary",
      timestamp: Date.now(),
      analysis: analysis
    };

    const updated = [newProfile, ...savedProfiles];
    setSavedProfiles(updated);
    localStorage.setItem('savedProfiles', JSON.stringify(updated));
    alert("Profile saved to history!");
  };

  const handleLoadProfile = (profile: SavedProfile) => {
    setAnalysis(profile.analysis);
    setIsSidebarOpen(false);
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedProfiles.filter(p => p.id !== id);
    setSavedProfiles(updated);
    localStorage.setItem('savedProfiles', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative overflow-x-hidden">
      {/* Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-8 h-8 text-indigo-400" />
            <span className="text-xl font-bold tracking-tight">InsightSales <span className="text-indigo-400">AI</span></span>
          </div>
          <div className="flex items-center gap-4">
             <button 
              onClick={() => { setActiveSidebarTab('history'); setIsSidebarOpen(true); }}
              className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-indigo-300 px-3 py-1.5 rounded-md transition-colors border border-slate-700"
            >
              <History className="w-4 h-4" />
              <span className="hidden md:inline">History</span>
            </button>
            <button 
              onClick={() => { setActiveSidebarTab('context'); setIsSidebarOpen(true); }}
              className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 text-indigo-300 px-3 py-1.5 rounded-md transition-colors border border-slate-700"
            >
              <NotebookPen className="w-4 h-4" />
              <span className="hidden md:inline">Meeting Context</span>
              {meetingSummary && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
            </button>
            <div className="text-sm text-gray-400 hidden md:block border-l border-slate-700 pl-4">Tesla Outsourcing Services Edition</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Search Section - Dark Mode */}
        <div className="bg-slate-900 rounded-xl shadow-sm p-6 mb-8 border border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Analyze Lead / Prospect</h2>
            <div className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".pdf,.xlsx,.xls,.csv,.txt"
              />
              <button
                onClick={triggerFileUpload}
                disabled={isProcessingFile}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 px-3 py-1.5 rounded-md transition-colors border border-slate-700 flex items-center gap-2"
              >
                {isProcessingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
                Import File (PDF/Excel)
              </button>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="relative">
              <textarea
                className="w-full p-4 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] text-sm font-mono text-white bg-slate-800 placeholder-slate-500"
                placeholder="Format: Name, Company, Role, Budget, Communication Style, Project Type, Region, Notes..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <div className="absolute bottom-3 right-3 flex gap-2">
                 <button 
                  onClick={() => setInput(SAMPLE_PROFILE)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                 >
                   Use Sample
                 </button>
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading || !input}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
              {loading ? 'Processing Intelligence...' : 'Generate Lead Intelligence'}
            </button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
        </div>

        {analysis && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Lead Intelligence Dashboard - NEW */}
            {analysis.leadIntelligence && (
              <LeadIntelligenceDashboard 
                data={analysis.leadIntelligence} 
                profile={analysis.profile}
                onSave={handleSaveProfile} 
              />
            )}

            {/* Interactive Generator */}
            <ContentGenerator analysis={analysis} lastMeetingSummary={meetingSummary} />

            {/* Profile Overview Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{analysis.profile?.headline || "Personality Profile"}</h2>
                    <p className="text-white text-opacity-90 mt-1 text-white">{analysis.profile?.summary || "No summary available."}</p>
                  </div>
                  <div className="flex gap-3">
                    {analysis.profile?.primaryTrait && (
                      <span className="bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium border border-white/20">
                        Primary: {analysis.profile.primaryTrait}
                      </span>
                    )}
                    {analysis.profile?.secondaryTrait && (
                      <span className="bg-white/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-medium border border-white/20">
                        Secondary: {analysis.profile.secondaryTrait}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">DISC Profile</h3>
                  {analysis.profile?.discScores ? (
                    <DiscChart scores={analysis.profile.discScores} />
                  ) : (
                    <div className="h-64 w-full flex items-center justify-center text-gray-400">No DISC data</div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Big 5 Traits</h3>
                  {analysis.profile?.oceanScores ? (
                    <OceanChart scores={analysis.profile.oceanScores} />
                  ) : (
                    <div className="h-64 w-full flex items-center justify-center text-gray-400">No OCEAN data</div>
                  )}
                </div>
              </div>
            </div>

            {/* Strategy Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Behavioral Dos & Donts */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Engagement Strategy
                </h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4" /> Do's
                    </h4>
                    <ul className="space-y-2">
                      {(analysis.guidance?.dos || []).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                      {(!analysis.guidance?.dos || analysis.guidance.dos.length === 0) && (
                        <li className="text-sm text-gray-400 italic">No data available</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                      <ThumbsDown className="w-4 h-4" /> Don'ts
                    </h4>
                    <ul className="space-y-2">
                      {(analysis.guidance?.donts || []).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                          {item}
                        </li>
                      ))}
                      {(!analysis.guidance?.donts || analysis.guidance.donts.length === 0) && (
                        <li className="text-sm text-gray-400 italic">No data available</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Energy & Motivation */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                 <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Battery className="w-5 h-5 text-blue-500" />
                  Drivers & Drainers
                </h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-indigo-700 mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Energizers
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {(analysis.guidance?.energizers || []).map((item, i) => (
                        <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md font-medium border border-indigo-100">
                          {item}
                        </span>
                      ))}
                       {(!analysis.guidance?.energizers || analysis.guidance.energizers.length === 0) && (
                        <span className="text-sm text-gray-400 italic">No data available</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-2">
                      <BatteryWarning className="w-4 h-4" /> Drainers
                    </h4>
                    <div className="flex flex-wrap gap-2">
                       {(analysis.guidance?.drainers || []).map((item, i) => (
                        <span key={i} className="px-3 py-1 bg-orange-50 text-orange-700 text-xs rounded-md font-medium border border-orange-100">
                          {item}
                        </span>
                      ))}
                       {(!analysis.guidance?.drainers || analysis.guidance.drainers.length === 0) && (
                        <span className="text-sm text-gray-400 italic">No data available</span>
                      )}
                    </div>
                  </div>
                   <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Buying Motivation</h4>
                    <p className="text-sm text-slate-600 italic">"{analysis.guidance?.buyingMotivation || "N/A"}"</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Communication Advice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
                  <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                    <PenTool className="w-4 h-4" /> Writing Style
                  </h3>
                  <p className="text-sm text-indigo-800 leading-relaxed">
                    {analysis.guidance?.writingStyle || "Professional and direct."}
                  </p>
               </div>
               <div className="bg-teal-50 rounded-xl p-6 border border-teal-100">
                  <h3 className="font-bold text-teal-900 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Speaking Style
                  </h3>
                  <p className="text-sm text-teal-800 leading-relaxed">
                    {analysis.guidance?.speakingStyle || "Clear and articulate."}
                  </p>
               </div>
            </div>

            {/* Mind Map / Logic Flow */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
               <h3 className="text-lg font-bold text-gray-900 mb-6">Strategic Call Flow Logic</h3>
               <div className="relative">
                  {/* Vertical line connecting nodes */}
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200"></div>
                  
                  <div className="space-y-8 relative">
                    {(analysis.mindMapNodes || []).map((node, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0 z-10 ring-4 ring-white">
                          {index + 1}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-indigo-300 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-gray-900">{node.step}</h4>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{node.action}</p>
                          <div className="text-xs bg-amber-50 text-amber-800 p-2 rounded border border-amber-100 flex items-start gap-2">
                            <span className="font-bold">If resistance:</span> {node.contingency}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!analysis.mindMapNodes || analysis.mindMapNodes.length === 0) && (
                      <div className="pl-12 text-sm text-gray-500">No logic flow available.</div>
                    )}
                  </div>
               </div>
            </div>

            {/* Case Studies / Testimonials */}
            <CaseStudies />

          </div>
        )}
      </main>

      {/* Context Sidebar / Drawer */}
      <div className={`fixed inset-0 z-50 overflow-hidden ${isSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsSidebarOpen(false)} />
        <div className={`absolute inset-y-0 right-0 max-w-md w-full bg-white shadow-2xl transform transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {activeSidebarTab === 'context' ? (
                  <>
                    <History className="w-5 h-5 text-indigo-600" />
                    Meeting Context
                  </>
                ) : (
                  <>
                    <History className="w-5 h-5 text-indigo-600" />
                    Saved Profiles
                  </>
                )}
              </h3>
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto custom-scroll">
              
              {/* === TAB: MEETING CONTEXT === */}
              {activeSidebarTab === 'context' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                    <h4 className="text-sm font-bold text-indigo-900 mb-2">Why use this?</h4>
                    <div className="text-xs text-indigo-800 leading-relaxed">
                      Paste notes from your last call or email. The AI will extract objections and concerns to tailor the next pitch.
                    </div>
                  </div>

                  {/* Channel Selector */}
                  <div className="flex rounded-md shadow-sm">
                    <button
                      onClick={() => setContextChannel(CommunicationChannel.CALL)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border rounded-l-md transition-colors ${
                        contextChannel === CommunicationChannel.CALL
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Phone className="w-3 h-3" /> Call Notes
                    </button>
                    <button
                      onClick={() => setContextChannel(CommunicationChannel.EMAIL)}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border-t border-b border-r rounded-r-md transition-colors ${
                        contextChannel === CommunicationChannel.EMAIL
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Mail className="w-3 h-3" /> Email Thread
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Interaction Summary
                    </label>
                    <textarea
                      className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
                      placeholder={contextChannel === CommunicationChannel.CALL ? "e.g., Client was interested in Revit modeling but concerned about QA turnaround times..." : "e.g., Client emailed asking about pricing for 3 projects but ignored the timeline question..."}
                      value={meetingSummary}
                      onChange={(e) => setMeetingSummary(e.target.value)}
                    />
                    <div className="mt-2 flex justify-between items-center">
                      {contextError ? <span className="text-xs text-red-600 truncate">{contextError}</span> : <span></span>}
                       <button 
                          onClick={handleAnalyzeContext}
                          disabled={contextLoading || !meetingSummary.trim()}
                          className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-md shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                          {contextLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanSearch className="w-3 h-3" />}
                          Analyze Context
                        </button>
                    </div>
                  </div>

                  {/* Context Analysis Results */}
                  {contextAnalysis && (
                    <div className="space-y-4 animate-fade-in pt-4 border-t border-gray-100 mt-2">
                      
                      {/* Analyzed Concerns - AMBER/YELLOW (Caution) */}
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                           <AlertTriangle className="w-3.5 h-3.5" /> Analyzed Concerns
                        </h4>
                        <ul className="text-xs text-amber-900/80 space-y-1.5 list-none">
                          {(contextAnalysis.concerns || []).map((c, i) => (
                             <li key={i} className="flex items-start gap-2">
                               <span className="text-amber-500 font-bold">•</span>
                               {c}
                             </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Hidden Objections - RED (Danger/Blocker) */}
                       <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                        <h4 className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                           <ShieldAlert className="w-3.5 h-3.5" /> Hidden Objections
                        </h4>
                        <ul className="text-xs text-red-900/80 space-y-1.5 list-none">
                           {(contextAnalysis.objections || []).map((c, i) => (
                             <li key={i} className="flex items-start gap-2">
                               <span className="text-red-500 font-bold">•</span>
                               {c}
                             </li>
                           ))}
                        </ul>
                      </div>

                      {/* Next Step - GREEN (Action) */}
                       <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <h4 className="text-xs font-bold text-green-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                           <Lightbulb className="w-3.5 h-3.5" /> Recommended Next Step
                        </h4>
                        <p className="text-xs text-green-800/90 leading-relaxed">
                           {contextAnalysis.nextStepPrediction}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === TAB: HISTORY / SAVED PROFILES === */}
              {activeSidebarTab === 'history' && (
                <div className="space-y-4">
                  {savedProfiles.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <History className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No saved profiles yet.</p>
                      <p className="text-xs mt-1">Analyze a lead and click "Save Profile" to see them here.</p>
                    </div>
                  ) : (
                    savedProfiles.map((profile) => (
                      <div key={profile.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-all shadow-sm group">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800 text-sm">{profile.name}</h4>
                          <button 
                            onClick={(e) => handleDeleteProfile(profile.id, e)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{profile.headline}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(profile.timestamp).toLocaleDateString()}
                          </span>
                          <button 
                            onClick={() => handleLoadProfile(profile)}
                            className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-medium hover:bg-indigo-100 transition-colors"
                          >
                            Load Analysis
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
            
            {activeSidebarTab === 'context' && (
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-lg font-medium transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Save Context & Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}