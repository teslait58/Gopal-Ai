import React, { useState } from 'react';
import { AnalysisResult, SalesStage, ActionGoal, CommunicationChannel, GeneratedContent, SavedPlaybook } from '../types';
import { generateSalesContent } from '../services/geminiService';
import { Wand2, Copy, Check, Mail, Phone, Loader2, History, Zap, Target, Save, FileDown, Volume2, Pause, Play, Handshake, Presentation, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from "jspdf";
import pptxgen from "pptxgenjs";

interface Props {
  analysis: AnalysisResult;
  lastMeetingSummary: string;
}

const QUICK_TEMPLATES = [
  { label: "Discovery Call", icon: Phone, stage: SalesStage.DISCOVERY, channel: CommunicationChannel.CALL, goal: ActionGoal.GATHER_INFO },
  { label: "Cold Email Pitch", icon: Mail, stage: SalesStage.PROSPECTING, channel: CommunicationChannel.EMAIL, goal: ActionGoal.PITCH },
  { label: "Proposal Follow-up", icon: Mail, stage: SalesStage.NEGOTIATION, channel: CommunicationChannel.EMAIL, goal: ActionGoal.NEGOTIATE },
  { label: "Negotiation Call", icon: Handshake, stage: SalesStage.NEGOTIATION, channel: CommunicationChannel.CALL, goal: ActionGoal.NEGOTIATE },
];

// Helper to calculate Flesch-Kincaid Grade Level
const calculateReadability = (text: string): { score: number, grade: string, color: string, bgColor: string, borderColor: string } => {
  const sentences = text.split(/[.!?]+/).length;
  const words = text.split(/\s+/).length;
  const syllables = text.split(/\s+/).reduce((acc, word) => {
    return acc + (word.toLowerCase().match(/[aeiouy]{1,2}/g)?.length || 1);
  }, 0);

  if (words === 0 || sentences === 0) return { score: 0, grade: "N/A", color: "text-gray-400", bgColor: "bg-gray-50", borderColor: "border-gray-200" };

  // Flesch-Kincaid Grade Level Formula
  const score = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  const roundedScore = Math.round(score * 10) / 10;

  let color = "text-emerald-700";
  let bgColor = "bg-emerald-50";
  let borderColor = "border-emerald-200";
  let grade = "Easy";
  
  if (roundedScore > 12) {
    color = "text-red-700";
    bgColor = "bg-red-50";
    borderColor = "border-red-200";
    grade = "Complex (PhD)";
  } else if (roundedScore > 10) {
    color = "text-orange-700";
    bgColor = "bg-orange-50";
    borderColor = "border-orange-200";
    grade = "Hard (College)";
  } else if (roundedScore > 8) {
    color = "text-amber-700";
    bgColor = "bg-amber-50";
    borderColor = "border-amber-200";
    grade = "Standard";
  } else {
    grade = "Conversational";
  }

  return { score: roundedScore, grade, color, bgColor, borderColor };
};

const ContentGenerator: React.FC<Props> = ({ analysis, lastMeetingSummary }) => {
  // Default to the requested scenario: Discovery / Call / Gather Info
  const [stage, setStage] = useState<SalesStage>(SalesStage.DISCOVERY);
  const [channel, setChannel] = useState<CommunicationChannel>(CommunicationChannel.CALL);
  const [goal, setGoal] = useState<ActionGoal>(ActionGoal.GATHER_INFO);
  const [includeSubjectLine, setIncludeSubjectLine] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedContent | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reasoningCopied, setReasoningCopied] = useState(false);

  // TTS State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    setSaved(false);
    stopAudio(); // Stop any previous audio
    try {
      const content = await generateSalesContent(
        analysis, 
        stage, 
        channel, 
        goal, 
        includeSubjectLine, 
        lastMeetingSummary
      );
      setResult(content);
    } catch (e) {
      console.error(e);
      alert("Failed to generate content. Please check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const applyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    setStage(template.stage);
    setChannel(template.channel);
    setGoal(template.goal);
    // Reset subject line default based on channel
    setIncludeSubjectLine(template.channel === CommunicationChannel.EMAIL);
  };

  const copyToClipboard = () => {
    if (!result) return;
    const textToCopy = result.subjectLine 
      ? `Subject: ${result.subjectLine}\n\n${result.content}` 
      : result.content;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyReasoning = () => {
    if (!result?.keyPoints) return;
    const text = result.keyPoints.map(p => `• ${p}`).join('\n');
    navigator.clipboard.writeText(text);
    setReasoningCopied(true);
    setTimeout(() => setReasoningCopied(false), 2000);
  };

  // --- TTS Logic ---
  const playAudio = () => {
    if (!result) return;
    
    // If paused, resume
    if (isPaused && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    // Cancel existing
    window.speechSynthesis.cancel();

    const textToRead = result.subjectLine 
      ? `Subject line. ${result.subjectLine}. Body. ${result.content}` 
      : result.content;

    // Strip markdown chars for smoother reading (basic)
    const cleanText = textToRead.replace(/[#*`_]/g, '');

    const newUtterance = new SpeechSynthesisUtterance(cleanText);
    newUtterance.rate = 1;
    newUtterance.pitch = 1;
    
    newUtterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    setUtterance(newUtterance);
    window.speechSynthesis.speak(newUtterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const pauseAudio = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  // --- Save & Export Logic ---
  const handleSavePlaybook = () => {
    if (!result) return;

    const newPlaybook: SavedPlaybook = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      stage,
      channel,
      goal,
      content: result,
      profileName: analysis.profile?.headline || "Unknown Profile"
    };

    const existingJson = localStorage.getItem('savedPlaybooks');
    const existing: SavedPlaybook[] = existingJson ? JSON.parse(existingJson) : [];
    
    localStorage.setItem('savedPlaybooks', JSON.stringify([newPlaybook, ...existing]));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleExportPDF = () => {
    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxLineWidth = pageWidth - margin * 2;
    let yPos = 20;

    // Header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text("InsightSales Playbook", margin, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Generated for: ${analysis.profile?.headline || "Prospect"}`, margin, yPos);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPos + 5);
    
    yPos += 15;

    // Lead Intelligence Snapshot
    if (analysis.leadIntelligence) {
        doc.setFillColor(241, 245, 249); // Slate-100
        doc.roundedRect(margin, yPos, maxLineWidth, 35, 3, 3, 'F');
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("Lead Intelligence Snapshot", margin + 5, yPos + 10);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Buying Probability: ${analysis.leadIntelligence.buyingProbability}%`, margin + 5, yPos + 18);
        doc.text(`Best Pitch Angle: "${analysis.leadIntelligence.bestPitchAngle}"`, margin + 5, yPos + 25);
        
        yPos += 45;
    }

    // Content Section Header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text(channel === CommunicationChannel.EMAIL ? "Email Draft" : "Call Script", margin, yPos);
    yPos += 10;

    // Subject Line
    if (result.subjectLine) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(71, 85, 105);
      doc.text(`Subject: ${result.subjectLine}`, margin, yPos);
      yPos += 10;
    }

    // Content Body
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85); // Slate-700
    
    // Basic formatting clean-up for PDF
    const cleanContent = result.content
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s?/g, '')
      .replace(/`/g, '');

    const splitContent = doc.splitTextToSize(cleanContent, maxLineWidth);
    
    // Page break check
    if (yPos + (splitContent.length * 5) > pageHeight - margin) {
       doc.addPage();
       yPos = 20;
    }

    doc.text(splitContent, margin, yPos);
    yPos += (splitContent.length * 5) + 15;

    // Key Points (Why this works)
    if (result.keyPoints && result.keyPoints.length > 0) {
      if (yPos + 40 > pageHeight - margin) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 83, 9); // Amber-700
      doc.text("Strategic Reasoning", margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(71, 85, 105);
      
      result.keyPoints.forEach((point) => {
        const bulletPoint = `• ${point}`;
        const splitPoint = doc.splitTextToSize(bulletPoint, maxLineWidth);
        
        if (yPos + (splitPoint.length * 5) > pageHeight - margin) {
            doc.addPage();
            yPos = 20;
        }

        doc.text(splitPoint, margin, yPos);
        yPos += (splitPoint.length * 5) + 2;
      });
    }

    doc.save(`Playbook_${stage.replace(/\s/g, '_')}.pdf`);
  };

  const handleExportPPT = () => {
    if (!result || !analysis) return;

    const pres = new pptxgen();

    // --- Slide 1: Title ---
    let slide = pres.addSlide();
    slide.background = { color: "F3F4F6" };
    slide.addText("Sales Playbook Strategy", { x: 1, y: 1.5, w: '80%', fontSize: 32, bold: true, color: '1E293B' });
    slide.addText(`Prepared for: ${analysis.profile?.headline || "Prospect"}`, { x: 1, y: 2.5, fontSize: 18, color: '475569' });
    slide.addText(`Generated via InsightSales AI | Tesla Outsourcing Services`, { x: 1, y: 5, fontSize: 12, color: '94A3B8' });

    // --- Slide 2: Lead Intelligence ---
    if (analysis.leadIntelligence) {
        slide = pres.addSlide();
        slide.background = { color: "FFFFFF" };
        slide.addText("Lead Intelligence Snapshot", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '1E293B' });
        
        // Buying Probability
        slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.2, w: 2.5, h: 1.2, fill: { color: "F0FDF4" }, line: { color: "DCFCE7" } });
        slide.addText("Buying Probability", { x: 0.6, y: 1.5, fontSize: 12, color: "166534" });
        slide.addText(`${analysis.leadIntelligence.buyingProbability}%`, { x: 0.6, y: 2.0, fontSize: 28, bold: true, color: "166534" });

        // Summary
        slide.addText("Lead Summary", { x: 3.5, y: 1.2, fontSize: 14, bold: true, color: "1E293B" });
        slide.addText(analysis.leadIntelligence.leadSummary, { x: 3.5, y: 1.6, w: 6, fontSize: 12, color: "475569" });

        // Pitch Angle
        slide.addText("Best Pitch Angle", { x: 0.5, y: 3.0, fontSize: 14, bold: true, color: "1E293B" });
        slide.addText(`"${analysis.leadIntelligence.bestPitchAngle}"`, { x: 0.5, y: 3.4, w: 9, fontSize: 12, italic: true, color: "4F46E5" });

        // Requirements
        slide.addText("Potential Requirements", { x: 0.5, y: 4.5, fontSize: 14, bold: true, color: "1E293B" });
        const reqs = analysis.leadIntelligence.potentialRequirements.join(", ");
        slide.addText(reqs, { x: 0.5, y: 4.9, w: 9, fontSize: 12, color: "475569" });
    }

    // --- Slide 3: Engagement Strategy ---
    slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };
    slide.addText("Engagement Strategy", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '1E293B' });

    // Do's
    slide.addText("Do's", { x: 0.5, y: 1.5, fontSize: 16, bold: true, color: "047857" });
    (analysis.guidance?.dos || []).slice(0, 4).forEach((item, i) => {
        slide.addText(`• ${item}`, { x: 0.5, y: 2.0 + (i * 0.5), w: 4.5, fontSize: 12, color: "334155" });
    });

    // Don'ts
    slide.addText("Don'ts", { x: 5.5, y: 1.5, fontSize: 16, bold: true, color: "B91C1C" });
    (analysis.guidance?.donts || []).slice(0, 4).forEach((item, i) => {
        slide.addText(`• ${item}`, { x: 5.5, y: 2.0 + (i * 0.5), w: 4.5, fontSize: 12, color: "334155" });
    });

    // --- Slide 4: The Script ---
    slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };
    slide.addText("Generated Sales Script", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '1E293B' });
    
    let currentY = 1.2;
    if (result.subjectLine) {
        slide.addText(`Subject: ${result.subjectLine}`, { x: 0.5, y: currentY, w: 9, fontSize: 14, bold: true, color: "1E293B" });
        currentY += 0.6;
    }
    
    // Clean text for PPT
    const cleanContent = result.content.replace(/\*\*/g, '').replace(/\*/g, '');
    slide.addText(cleanContent, { x: 0.5, y: currentY, w: 9, h: 3.5, fontSize: 11, color: "334155", autoFit: true, shape: pres.ShapeType.rect, fill: {color: "F8FAFC"}, line: {color: "E2E8F0"} });

    // --- Slide 5: Why It Works ---
    slide = pres.addSlide();
    slide.background = { color: "FFFFFF" };
    slide.addText("Why This Strategy Works", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: 'D97706' });
    
    if (result.keyPoints && result.keyPoints.length > 0) {
        result.keyPoints.forEach((point, idx) => {
            slide.addText(`• ${point}`, { x: 0.8, y: 1.5 + (idx * 0.8), w: 8.5, fontSize: 16, color: "475569" });
        });
    }

    pres.writeFile({ fileName: `Playbook_${stage.replace(/\s/g, '_')}.pptx` });
  };

  const readability = result ? calculateReadability(result.content) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative transition-all duration-300">
      {/* Context Active Indicator */}
      {lastMeetingSummary.trim().length > 0 && (
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-2 flex items-center gap-2 text-xs font-medium text-amber-800">
          <History className="w-3 h-3" />
          Using Last Meeting Context for Analysis & Prediction
        </div>
      )}

      <div className="p-6 border-b border-gray-100 bg-slate-50">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-black flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-indigo-600" />
              AI Playbook Generator
            </h3>
            <p className="text-sm text-black mt-1">
              Generate custom pitches, emails, and scripts tailored to {analysis.profile?.headline || "this profile"}.
            </p>
          </div>
        </div>

        {/* Quick Templates */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-bold text-black uppercase tracking-wide flex items-center mr-1">
             Quick Templates:
          </span>
          {QUICK_TEMPLATES.map((template, idx) => (
            <button
              key={idx}
              onClick={() => applyTemplate(template)}
              className="group flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-slate-900 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
            >
              <template.icon className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
              {template.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-5 border-r border-gray-100 pr-0 md:pr-6">
          <div>
            <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <Target className="w-3 h-3" /> Sales Stage
            </label>
            <div className="flex flex-col gap-1.5">
              {Object.values(SalesStage).map((s) => (
                <button
                  key={s}
                  onClick={() => setStage(s as SalesStage)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-all ${
                    stage === s 
                      ? 'bg-white border border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500 font-medium' 
                      : 'bg-white border border-gray-200 text-slate-700 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wide">Channel</label>
            <div className="flex rounded-lg shadow-sm">
              <button
                onClick={() => setChannel(CommunicationChannel.EMAIL)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-r-0 rounded-l-lg transition-colors ${
                  channel === CommunicationChannel.EMAIL
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 z-10'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Mail className="w-4 h-4" /> Email
              </button>
              <button
                onClick={() => setChannel(CommunicationChannel.CALL)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border rounded-r-lg transition-colors ${
                  channel === CommunicationChannel.CALL
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 z-10'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Phone className="w-4 h-4" /> Call
              </button>
            </div>
            
            {channel === CommunicationChannel.EMAIL && (
              <div className="mt-3 flex items-center bg-gray-50 p-2 rounded border border-gray-200">
                <input
                  id="include-subject"
                  type="checkbox"
                  checked={includeSubjectLine}
                  onChange={(e) => setIncludeSubjectLine(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="include-subject" className="ml-2 block text-sm text-black font-medium cursor-pointer select-none">
                  Include Subject Line
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-black mb-1.5 uppercase tracking-wide">Goal</label>
            <select 
              className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm text-slate-900"
              value={goal}
              onChange={(e) => setGoal(e.target.value as ActionGoal)}
            >
              {Object.values(ActionGoal).map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-70 transform active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {loading ? 'Generating...' : 'Generate Script'}
          </button>
        </div>

        {/* Output Area */}
        <div className="md:col-span-2 bg-gray-50/50 rounded-xl border border-gray-200 p-1 min-h-[300px] flex flex-col">
          {!result && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm p-8 text-center border-2 border-dashed border-gray-200 rounded-lg m-2">
              <Zap className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-slate-600">Configure the playbook settings or select a Quick Template to generate tailored content.</p>
            </div>
          )}
          
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-indigo-600 gap-3 bg-white/50 backdrop-blur-sm rounded-lg m-2">
              <Loader2 className="w-8 h-8 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-black">Analzying Personality & Context...</p>
                <p className="text-xs text-slate-700 mt-1">Applying "Senior Project Manager" Persona</p>
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="flex flex-col h-full animate-fade-in bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center px-4 py-3 bg-gray-50 border-b border-gray-100 gap-3">
                
                <div className="flex items-center gap-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    channel === CommunicationChannel.CALL ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {channel}
                  </span>
                  
                  {readability && (
                     <div className={`flex items-center gap-3 border rounded-lg px-4 py-2 shadow-sm ${readability.bgColor} ${readability.borderColor}`} title="Flesch-Kincaid Readability Score">
                        <div className={`text-2xl font-black tracking-tight leading-none ${readability.color}`}>
                          {readability.score}
                        </div>
                        <div className={`flex flex-col border-l pl-3 ${readability.borderColor}`}>
                          <span className={`text-[9px] font-extrabold uppercase tracking-widest leading-none mb-1 ${readability.color} opacity-80`}>Readability</span>
                          <span className={`text-xs font-bold leading-none whitespace-nowrap ${readability.color}`}>{readability.grade}</span>
                        </div>
                     </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                   {/* Playback Controls */}
                   <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md p-0.5 mr-2">
                      {!isPlaying ? (
                        <button onClick={playAudio} className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Read Aloud">
                          <Volume2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={stopAudio} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Stop">
                          <span className="block w-2.5 h-2.5 bg-current rounded-sm"></span>
                        </button>
                      )}
                      {isPlaying && (
                         <button onClick={isPaused ? playAudio : pauseAudio} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded">
                           {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                         </button>
                      )}
                   </div>

                  <button 
                    onClick={handleExportPPT}
                    className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                    title="Export as PPT"
                  >
                    <Presentation className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={handleExportPDF}
                    className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                    title="Export as PDF"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={handleSavePlaybook}
                    className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                    title="Save Playbook"
                  >
                    {saved ? <Check className="w-4 h-4 text-green-500" /> : <Save className="w-4 h-4" />}
                  </button>

                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 px-3 py-1.5 rounded-md hover:bg-white transition-all border border-transparent hover:border-gray-200 ml-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="p-6 flex-1 overflow-y-auto custom-scroll text-sm text-black">
                {result.subjectLine && (
                  <div className="mb-6 p-3 bg-gray-50 border border-gray-100 rounded-md">
                    <span className="font-bold text-black block mb-1 text-xs uppercase tracking-wide">Subject Line</span>
                    <span className="text-black font-bold">{result.subjectLine}</span>
                  </div>
                )}
                <ReactMarkdown className="prose prose-sm max-w-none text-black prose-headings:font-bold prose-headings:text-black prose-p:leading-relaxed prose-p:text-black prose-ul:text-black prose-li:text-black prose-li:marker:text-black prose-strong:text-black">
                  {result.content}
                </ReactMarkdown>
              </div>

              {/* AI Reasoning Footer */}
              <div className="bg-amber-50/80 border-t border-amber-100 p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-[11px] font-bold text-amber-950 uppercase flex items-center gap-1.5">
                    <Zap className="w-3 h-3" /> Why this works for this profile:
                  </h4>
                  <button 
                    onClick={copyReasoning}
                    className="text-[10px] font-medium flex items-center gap-1 text-amber-900 hover:text-amber-950 bg-amber-100/50 hover:bg-amber-100 px-2 py-0.5 rounded transition-colors"
                    title="Copy AI Reasoning"
                  >
                     {reasoningCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                     {reasoningCopied ? "Copied" : "Copy Reasoning"}
                  </button>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                  {(result.keyPoints || []).map((point, idx) => (
                    <li key={idx} className="text-xs text-amber-950 flex items-start gap-1.5">
                      <span className="mt-1 w-1 h-1 rounded-full bg-amber-600 shrink-0"></span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentGenerator;