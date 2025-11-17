import { ModuleType, AppSettings } from './types';

export const APP_NAME = "Solo Leveller 1.0";

export const WELCOME_TEXT = `
  Welcome, Hunter, to Solo Leveller 1.0!
  This is a metaphysical simulation inspired by the world of Solo Leveling.
  Prepare to unlock your potential through various energetic and spiritual tools.

  Remember, this application is for entertainment purposes only and simulates effects within its UI.
  It functions entirely offline, enabling a focused and immersive experience.
  Embark on your journey to ascension!
`;

export const DEFAULT_APP_SETTINGS: AppSettings = {
  activeModule: ModuleType.Radionics,
};

export const STORAGE_KEYS = {
  APP_SETTINGS: 'soloLevellerAppSettings',
  MIC_PERMISSION_GRANTED: 'soloLevellerMicPermissionGranted',
  WELCOME_MESSAGE_SHOWN: 'soloLevellerWelcomeMessageShown', // New key for welcome message
};

// IndexedDB Constants
export const DB_NAME = 'SoloLevellerDB';
export const DB_VERSION = 1;

export const DB_STORE_NAMES = {
  RADIONICS_PRESETS: 'radionicsPresets',
  RADIONICS_EMISSION_LOGS: 'radionicsEmissionLogs',
  AUDIO_TRACKS: 'audioTracks',
  AMPLIFIER_SETTINGS: 'amplifierSettings',
  SUBLIMINAL_PROFILES: 'subliminalProfiles',
  HEALING_PRESETS: 'healingPresets',
  FREQUENCY_PRESETS: 'frequencyPresets',
  MANTRA_SESSIONS: 'mantraSessions',
} as const; // Added as const to make values literal types

// Default values for modules
export const DEFAULT_RADIONICS_RATES = {
  trend1: 50, trend2: 50, trend3: 50,
  target1: 50, target2: 50, target3: 50,
};

export const DEFAULT_AMPLIFIER_SETTINGS = {
  auraExpansion: 50,
  frequencyField: 50,
  activeTracks: [null, null, null],
};

export const DEFAULT_SUB_INFUSION_SETTINGS = {
  harmonicResonance: 50,
  quantumEntanglement: 50,
  ethericVibration: 50,
};

export const DEFAULT_FREQUENCY_PRESET = {
  frequencyHz: 432,
  emissionIntensity: 50,
  waveformType: 'sine' as const,
};