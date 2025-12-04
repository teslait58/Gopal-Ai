import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, SalesStage, ActionGoal, CommunicationChannel, MeetingContextAnalysis } from "../types";

// PERMANENT HARDCODED API KEY - DO NOT CHANGE OR USE PROCESS.ENV
const API_KEY = "AIzaSyCsenAnbpA-iK4O9bdy9RRwqNc4u0qAzqE";

// Context about Tesla Outsourcing Services with Enhanced Persona
const TOS_CONTEXT = `
You are the "AEC Sales Intelligence Assistant" for Tesla Outsourcing Services (TOS).
Your Job: Help me attract clients, capture more leads, and give highly accurate predictions about a lead based only on the information provided + publicly available industry signals.

Your Constraints:
- You MUST NOT extract personal private data from the internet.
- You may only use: Industry trends, Company-level public data, Market signals, Technology usage, Public hiring patterns, Public news, General business behavior patterns, and The information directly provided.

TOS Services: BIM Modeling (Revit), CAD Drafting, Scan-to-BIM, MEP Coordination, Structural Detailing.

Output Requirements:
1. Lead Summary – short description of what type of client this is.
2. Personality Prediction – based ONLY on the data provided (communication style, role, tone, etc.).
3. Buying Probability Score (0–100).
4. Potential Requirements – guess what they might need (Revit, BIM, Scan-to-BIM, AutoCAD, etc.).
5. Possible Objections – (budget, time, features, competition, etc.).
6. Best Pitch Angle – emotional, logical, technical, ROI-driven.
7. Follow-up Strategy (7 Days) – how to convert the client fast.
8. Personalized Proposal Points – key benefits to highlight.
9. Personality Tone – Describe the person's vibe/nature in 1-2 words (e.g., "Strict & Professional", "Witty & Casual", "Academic", "Transactional").
`;

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Helper to standardize error messages
const handleGenAIError = (error: any, operation: string): never => {
  console.error(`Error during ${operation}:`, error);
  const msg = error.message || "";
  
  if (msg.includes("API key") || msg.includes("403")) {
    throw new Error("Invalid API Key. Please check your settings.");
  }
  if (msg.includes("429") || msg.includes("quota")) {
    throw new Error("API quota exceeded. Please try again later.");
  }
  if (msg.includes("503") || msg.includes("overloaded")) {
    throw new Error("AI service is temporarily overloaded. Please wait a moment and try again.");
  }
  if (msg.includes("SAFETY") || msg.includes("blocked")) {
    throw new Error("The content was blocked by safety filters. Please try modifying the input.");
  }

  throw new Error(msg || `An unexpected error occurred during ${operation}.`);
};

export const analyzeProfile = async (profileText: string): Promise<AnalysisResult> => {
  const prompt = `
  ${TOS_CONTEXT}
  
  Analyze the following lead details:
  "${profileText}"
  
  Return a JSON object containing:
  1. leadIntelligence: The 9 specific points requested in instructions.
  2. profile: Personality inference (DISC/OCEAN).
  3. guidance: Sales do's/dont's/style.
  4. mindMapNodes: Sales call flow.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            leadIntelligence: {
              type: Type.OBJECT,
              properties: {
                leadSummary: { type: Type.STRING },
                personalityTone: { type: Type.STRING, description: "1-2 words describing vibe e.g. 'Humorous', 'Strict'" },
                buyingProbability: { type: Type.NUMBER, description: "0-100" },
                potentialRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
                possibleObjections: { type: Type.ARRAY, items: { type: Type.STRING } },
                bestPitchAngle: { type: Type.STRING },
                followUpStrategy: { type: Type.ARRAY, items: { type: Type.STRING } },
                personalizedProposalPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            },
            profile: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                summary: { type: Type.STRING },
                discScores: {
                  type: Type.OBJECT,
                  properties: {
                    dominance: { type: Type.NUMBER },
                    influence: { type: Type.NUMBER },
                    steadiness: { type: Type.NUMBER },
                    conscientiousness: { type: Type.NUMBER }
                  }
                },
                oceanScores: {
                  type: Type.OBJECT,
                  properties: {
                    openness: { type: Type.NUMBER },
                    conscientiousness: { type: Type.NUMBER },
                    extraversion: { type: Type.NUMBER },
                    agreeableness: { type: Type.NUMBER },
                    neuroticism: { type: Type.NUMBER }
                  }
                },
                primaryTrait: { type: Type.STRING },
                secondaryTrait: { type: Type.STRING }
              }
            },
            guidance: {
              type: Type.OBJECT,
              properties: {
                dos: { type: Type.ARRAY, items: { type: Type.STRING } },
                donts: { type: Type.ARRAY, items: { type: Type.STRING } },
                energizers: { type: Type.ARRAY, items: { type: Type.STRING } },
                drainers: { type: Type.ARRAY, items: { type: Type.STRING } },
                writingStyle: { type: Type.STRING },
                speakingStyle: { type: Type.STRING },
                buyingMotivation: { type: Type.STRING }
              }
            },
            mindMapNodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  step: { type: Type.STRING },
                  action: { type: Type.STRING },
                  contingency: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (!response.text) {
      if (response.candidates?.[0]?.finishReason) {
        throw new Error(`Analysis blocked: ${response.candidates[0].finishReason}`);
      }
      throw new Error("AI returned an empty response.");
    }
    
    try {
      return JSON.parse(response.text) as AnalysisResult;
    } catch (parseError) {
      throw new Error("Failed to parse analysis results from AI.");
    }
  } catch (error) {
    handleGenAIError(error, "profile analysis");
  }
};

export const analyzeMeetingContext = async (summary: string, channel: CommunicationChannel = CommunicationChannel.CALL): Promise<MeetingContextAnalysis> => {
  const prompt = `
  ${TOS_CONTEXT}

  Task: Analyze the following meeting summary/notes provided by a sales rep.
  Context Channel: ${channel} (Consider this when interpreting tone and cues)
  
  Meeting Notes:
  "${summary}"

  Identify:
  1. The client's primary stated or implied concerns (e.g., Quality, Speed, Security).
  2. Potential hidden objections they might have based on this text.
  3. A predicted logical next step that a Senior PM would recommend.

  Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
            objections: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextStepPrediction: { type: Type.STRING }
          }
        }
      }
    });

    if (!response.text) {
       if (response.candidates?.[0]?.finishReason) {
        throw new Error(`Analysis blocked: ${response.candidates[0].finishReason}`);
      }
      throw new Error("AI returned an empty response.");
    }
    
    try {
      return JSON.parse(response.text) as MeetingContextAnalysis;
    } catch (parseError) {
      throw new Error("Failed to parse meeting context analysis.");
    }
  } catch (error) {
    handleGenAIError(error, "meeting context analysis");
  }
};

export const generateSalesContent = async (
  analysis: AnalysisResult,
  stage: SalesStage,
  channel: CommunicationChannel,
  goal: ActionGoal,
  includeSubjectLine: boolean = true,
  lastMeetingSummary: string = ""
) => {
  // Safe access to optional properties
  const headline = analysis?.profile?.headline || "AEC Professional";
  const primaryTrait = analysis?.profile?.primaryTrait || "Unknown";
  const writingStyle = analysis?.guidance?.writingStyle || "Professional";

  // Check for Analytical/Precise traits to adjust strictness of persona
  const isAnalytical = (headline + primaryTrait).toLowerCase().match(/(analytical|precise|detail|conscientious|reliable)/);

  let specialInstructions = "";
  if (isAnalytical) {
    specialInstructions += `
    CRITICAL INSTRUCTION FOR ANALYTICAL PROFILE:
    - This person values DATA and PROOF over enthusiasm.
    - Be extremely concise. Avoid all marketing fluff ("cutting-edge", "revolutionary").
    - Use specific metrics or logic (e.g., "reduce overhead by 30%", "QA process includes 3-tier check").
    - Tone must be deferential but expert.
    `;
  }

  // Adjust instruction based on stage
  if (stage === SalesStage.DISCOVERY || stage === SalesStage.PROSPECTING) {
    if (channel === CommunicationChannel.CALL) {
      specialInstructions += `
      - This is a DISCOVERY/COLD scenario. Do not just pitch.
      - Include 2-3 specific "Problem-Aware" questions to uncover their pain points regarding drafting capacity or quality.
      - The goal is to get them to admit a problem, not just buy immediately.
      `;
    }
  } else if (stage === SalesStage.NEGOTIATION) {
    specialInstructions += `
    - This is a NEGOTIATION scenario.
    - Focus on value reinforcement over price dropping.
    - Address potential objections (scope, timeline, cost) with trade-offs.
    - Aim for a "win-win" language structure.
    - Use phrases like "To ensure we meet your QA standards..." or "To align with your timeline...".
    `;
  }

  let channelSpecificInstruction = "";
  if (channel === CommunicationChannel.EMAIL) {
    channelSpecificInstruction = includeSubjectLine 
      ? "- Email: Include a 'Subject Line' (High open rate style, usually short/question-based) and the Body." 
      : "- Email: Generate the Body ONLY. Do NOT include a subject line.";
  } else {
    channelSpecificInstruction = "- Call: Generate a Script/Talking points. Include [Pause for answer] cues.";
  }

  let contextInstruction = "";
  if (lastMeetingSummary && lastMeetingSummary.trim().length > 0) {
    contextInstruction = `
    CRITICAL CONTEXT - PREVIOUS MEETING SUMMARY:
    "${lastMeetingSummary}"
    
    INSTRUCTION:
    1. Analyze the summary above. Identify the client's last known pain points, objections, or requests.
    2. Your response MUST reference these specific details to show active listening.
    3. Predict the logical next step or answer based on this summary.
    4. If they were hesitant, address that hesitation with Project Management logic (risk reduction).
    `;
  }

  const prompt = `
  ${TOS_CONTEXT}
  
  Target Profile: 
  - Headline: ${headline}
  - Primary Trait: ${primaryTrait}
  - Writing Style Preference: ${writingStyle}
  - Buying Probability: ${analysis.leadIntelligence?.buyingProbability || 50}%
  
  Current Situation:
  - Sales Stage: ${stage}
  - Goal: ${goal}
  ${contextInstruction}
  
  Task: Generate a highly specific, unique, and attractive ${channel} script/content.
  
  Requirements:
  ${channelSpecificInstruction}
  - Persona: **CRITICAL**: Act as a "Senior Project Manager & Technical Consultant" first, and a salesperson second. 
    - Your authority comes from technical competence (AEC industry knowledge), not sales charisma.
    - Focus heavily on **Operational Efficiency**, **Risk Mitigation**, **QA/QC Processes**, and **Scalability**.
    - Use specific industry terminology (e.g., "LOD 350", "Clash Detection", "Redlines", "CD Sets", "BIM Execution Plan") where relevant to the stage.
  - Tone: ${writingStyle}. Match the DISC profile.
  - Uniqueness: Do NOT use generic AI openers like "I hope this email finds you well." Be creative, direct, and valuable.
  - Structure: Use professional formatting (bullet points, bold text for emphasis) to make it readable and attractive.
  
  ${specialInstructions}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subjectLine: { type: Type.STRING, description: "Only if requested for email. Make it punchy." },
            content: { type: Type.STRING, description: "The email body or call script. Markdown formatted." },
            keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 strategic reasons why this specific wording works for this person/situation" }
          }
        }
      }
    });

    if (!response.text) {
      if (response.candidates?.[0]?.finishReason) {
        throw new Error(`Generation blocked: ${response.candidates[0].finishReason}`);
      }
      throw new Error("AI returned an empty response.");
    }
    
    try {
      return JSON.parse(response.text);
    } catch (parseError) {
       throw new Error("Failed to parse generated content.");
    }
  } catch (error) {
    handleGenAIError(error, "content generation");
  }
};