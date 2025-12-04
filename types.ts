export enum SalesStage {
  PROSPECTING = "Prospecting / Target",
  DISCOVERY = "Discovery / Qualification",
  OPPORTUNITY = "Sales Opportunity",
  NEGOTIATION = "Proposals / Negotiations",
  PENDING = "Sale Pending"
}

export enum CommunicationChannel {
  EMAIL = "Email",
  CALL = "Call/Meeting"
}

export enum ActionGoal {
  PITCH = "Make a sales pitch",
  NEGOTIATE = "Negotiate",
  IMPRESSION = "Make a good impression",
  PERSUADE = "Persuade to take action",
  PRICING = "Discuss pricing",
  GATHER_INFO = "Gather information",
  INDUSTRY_PITCH = "AEC Industry Specific Pitch"
}

export interface DiscScores {
  dominance: number;
  influence: number;
  steadiness: number;
  conscientiousness: number;
}

export interface OceanScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface PersonalityProfile {
  headline: string;
  summary: string;
  discScores: DiscScores;
  oceanScores: OceanScores;
  primaryTrait: string;
  secondaryTrait: string;
}

export interface LeadIntelligence {
  leadSummary: string;
  personalityTone: string; // New field for Vibe/Tone
  buyingProbability: number;
  potentialRequirements: string[];
  possibleObjections: string[];
  bestPitchAngle: string;
  followUpStrategy: string[];
  personalizedProposalPoints: string[];
}

export interface SalesGuidance {
  dos: string[];
  donts: string[];
  energizers: string[];
  drainers: string[];
  writingStyle: string;
  speakingStyle: string;
  buyingMotivation: string;
}

export interface AnalysisResult {
  profile: PersonalityProfile;
  leadIntelligence: LeadIntelligence;
  guidance: SalesGuidance;
  mindMapNodes: { step: string; action: string; contingency: string }[];
}

export interface GeneratedContent {
  content: string;
  subjectLine?: string; // For emails
  keyPoints: string[];
}

export interface MeetingContextAnalysis {
  concerns: string[];
  objections: string[];
  nextStepPrediction: string;
}

export interface SavedProfile {
  id: string;
  name: string;
  headline: string;
  timestamp: number;
  analysis: AnalysisResult;
}

export interface SavedPlaybook {
  id: string;
  timestamp: number;
  stage: SalesStage;
  channel: CommunicationChannel;
  goal: ActionGoal;
  content: GeneratedContent;
  profileName: string;
}