// --- Global UI State ---
export enum ModuleType {
  Radionics = 'Radionics',
  SubliminalAmplifier = 'SubliminalAmplifier',
  SubliminalMaker = 'SubliminalMaker',
  QuantumHealing = 'QuantumHealing',
  FrequencyGenerator = 'FrequencyGenerator',
  MantraSiddhi = 'MantraSiddhi',
  Settings = 'Settings',
}

export interface AppSettings {
  activeModule: ModuleType;
}

// --- Radionics Simulator ---
export interface RadionicsRates {
  trend1: number;
  trend2: number;
  trend3: number;
  target1: number;
  target2: number;
  target3: number;
}

export interface RadionicsWitness {
  type: 'text' | 'image';
  data: string; // Text string or base64 image
  name?: string; // Original file name for image
}

export interface RadionicsPreset {
  id: string;
  name: string;
  rates: RadionicsRates;
  witness?: RadionicsWitness;
  createdAt: number;
}

export interface RadionicsEmissionLog {
  id: string;
  timestamp: number;
  rates: RadionicsRates;
  resonanceStrength: number;
  witnessInfo: string; // Summary of witness
  energyConsumed: number;
}

// --- Subliminal Audio Energy Amplifier ---
export interface AudioTrack {
  id: string;
  name: string;
  fileDataUrl: string; // Blob URL or Data URL for audio
  mimeType: string;
}

export interface AmplifierSettings {
  auraExpansion: number; // 0-100
  frequencyField: number; // 0-100
  activeTracks: (string | null)[]; // IDs of active AudioTrack
}

// --- Subliminal Maker Device ---
export interface Affirmation {
  id: string;
  text: string;
  intensity: number; // Fictional
  delay: number; // Fictional
}

export interface SubliminalInfusionSettings {
  harmonicResonance: number;
  quantumEntanglement: number;
  ethericVibration: number;
}

export interface SubliminalProfile {
  id: string;
  name: string;
  baseAudioId?: string; // ID of AudioTrack
  affirmations: Affirmation[];
  infusionSettings: SubliminalInfusionSettings;
  createdAt: number;
}

// --- Quantum Healing Module ---
export interface HealingPreset {
  id: string;
  name: string;
  chakraFocus: string; // e.g., 'Heart', 'Crown'
  energyCoherenceTarget: number; // 0-100
  harmonyMeterTarget: number; // 0-100
  alignmentIndicatorTarget: number; // 0-100
  createdAt: number;
}

// --- Frequency Generator ---
export interface FrequencyPreset {
  id: string;
  name: string;
  frequencyHz: number; // Fictional, 0-1000 range
  emissionIntensity: number; // 0-100
  waveformType: 'sine' | 'square' | 'sawtooth'; // Fictional visual
  createdAt: number;
}

// --- Mantra Siddhi System ---
export enum MantraRepetitionTarget {
  TenThousandEight = 10008,
  TwentyThousand = 20000,
  HundredThousand = 100000,
  Custom = -1,
}

export interface MantraSession {
  id: string;
  name: string;
  dateOfBirth?: string;
  timeOfBirth?: string;
  ritualDescription: string;
  mantraText: string;
  requiredRepetitions: MantraRepetitionTarget | number;
  currentRepetitions: number;
  isActive: boolean;
  startedAt: number;
  completedAt?: number;
  log: { timestamp: number; type: 'tap' | 'voice' | 'manual' }[];
}

// --- IndexedDB Schema ---
export interface IDBDataSchema {
  radionicsPresets: RadionicsPreset;
  radionicsEmissionLogs: RadionicsEmissionLog;
  audioTracks: AudioTrack;
  amplifierSettings: AmplifierSettings;
  subliminalProfiles: SubliminalProfile;
  healingPresets: HealingPreset;
  frequencyPresets: FrequencyPreset;
  mantraSessions: MantraSession;
}

export type IDBStoreName = keyof IDBDataSchema;