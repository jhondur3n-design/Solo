import {
  DB_NAME,
  DB_VERSION,
  DB_STORE_NAMES,
  STORAGE_KEYS,
  DEFAULT_APP_SETTINGS,
  DEFAULT_AMPLIFIER_SETTINGS,
} from '../../constants';
import {
  AppSettings,
  IDBDataSchema,
  IDBStoreName,
  RadionicsPreset,
  RadionicsEmissionLog,
  AudioTrack,
  AmplifierSettings,
  SubliminalProfile,
  HealingPreset,
  FrequencyPreset,
  MantraSession
} from '../../types';

class StorageService {
  private db: IDBDatabase | null = null;
  private cache: Cache | null = null;

  constructor() {
    this.initIndexedDB();
    this.initCacheAPI();
  }

  private initIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        resolve(this.db);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        Object.values(DB_STORE_NAMES).forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private async initCacheAPI() {
    if ('caches' in window) {
      this.cache = await caches.open('solo-leveller-user-assets');
    }
  }

  // --- localStorage Methods ---
  getAppSettings(): AppSettings {
    try {
      const settings = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      // Ensure that 'acknowledgedDisclaimer' is not returned if it was previously saved but is no longer part of AppSettings
      const parsedSettings = settings ? JSON.parse(settings) : DEFAULT_APP_SETTINGS;
      if (parsedSettings && 'acknowledgedDisclaimer' in parsedSettings) {
        delete parsedSettings.acknowledgedDisclaimer;
      }
      return parsedSettings;
    } catch (e) {
      console.error("Error reading app settings from localStorage", e);
      return DEFAULT_APP_SETTINGS;
    }
  }

  saveAppSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving app settings to localStorage", e);
    }
  }

  getMicPermissionGranted(): boolean {
    try {
      const granted = localStorage.getItem(STORAGE_KEYS.MIC_PERMISSION_GRANTED);
      return granted === 'true';
    } catch (e) {
      console.error("Error reading mic permission from localStorage", e);
      return false;
    }
  }

  setMicPermissionGranted(granted: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MIC_PERMISSION_GRANTED, String(granted));
    } catch (e) {
      console.error("Error saving mic permission to localStorage", e);
    }
  }

  getWelcomeMessageShown(): boolean {
    try {
      const shown = localStorage.getItem(STORAGE_KEYS.WELCOME_MESSAGE_SHOWN);
      return shown === 'true';
    } catch (e) {
      console.error("Error reading welcome message status from localStorage", e);
      return false;
    }
  }

  setWelcomeMessageShown(shown: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.WELCOME_MESSAGE_SHOWN, String(shown));
    } catch (e) {
      console.error("Error saving welcome message status to localStorage", e);
    }
  }

  // --- IndexedDB Generic Methods ---
  private async getStore<T extends IDBStoreName>(storeName: T, mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.initIndexedDB();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  async getAll<T extends IDBStoreName>(storeName: T): Promise<IDBDataSchema[T][]> {
    const store = await this.getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T extends IDBStoreName>(storeName: T, id: string): Promise<IDBDataSchema[T] | undefined> {
    const store = await this.getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add<T extends IDBStoreName>(storeName: T, data: IDBDataSchema[T]): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async put<T extends IDBStoreName>(storeName: T, data: IDBDataSchema[T]): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete<T extends IDBStoreName>(storeName: T, id: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- Specific IndexedDB Helpers ---

  // Radionics
  async getRadionicsPresets(): Promise<RadionicsPreset[]> { return this.getAll(DB_STORE_NAMES.RADIONICS_PRESETS); }
  async saveRadionicsPreset(preset: RadionicsPreset): Promise<void> { return this.put(DB_STORE_NAMES.RADIONICS_PRESETS, preset); }
  async deleteRadionicsPreset(id: string): Promise<void> { return this.delete(DB_STORE_NAMES.RADIONICS_PRESETS, id); }
  async addRadionicsEmissionLog(log: RadionicsEmissionLog): Promise<void> { return this.add(DB_STORE_NAMES.RADIONICS_EMISSION_LOGS, log); }
  async getRadionicsEmissionLogs(): Promise<RadionicsEmissionLog[]> { return this.getAll(DB_STORE_NAMES.RADIONICS_EMISSION_LOGS); }

  // Audio Tracks (for Amplifier & Maker)
  async getAudioTracks(): Promise<AudioTrack[]> { return this.getAll(DB_STORE_NAMES.AUDIO_TRACKS); }
  async saveAudioTrack(track: AudioTrack): Promise<void> { return this.put(DB_STORE_NAMES.AUDIO_TRACKS, track); }
  async getAudioTrack(id: string): Promise<AudioTrack | undefined> { return this.get(DB_STORE_NAMES.AUDIO_TRACKS, id); }
  async deleteAudioTrack(id: string): Promise<void> { return this.delete(DB_STORE_NAMES.AUDIO_TRACKS, id); }

  // Amplifier Settings
  async getAmplifierSettings(): Promise<AmplifierSettings> {
    // Corrected to explicitly pass the literal type for 'amplifierSettings'
    const settings = await this.get(DB_STORE_NAMES.AMPLIFIER_SETTINGS, 'singleton'); // Use a fixed ID for singleton settings
    return settings || DEFAULT_AMPLIFIER_SETTINGS;
  }
  async saveAmplifierSettings(settings: AmplifierSettings): Promise<void> {
    return this.put(DB_STORE_NAMES.AMPLIFIER_SETTINGS, { ...settings, id: 'singleton' } as IDBDataSchema['amplifierSettings']); // Cast to correct specific type
  }

  // Subliminal Maker
  async getSubliminalProfiles(): Promise<SubliminalProfile[]> { return this.getAll(DB_STORE_NAMES.SUBLIMINAL_PROFILES); }
  async saveSubliminalProfile(profile: SubliminalProfile): Promise<void> { return this.put(DB_STORE_NAMES.SUBLIMINAL_PROFILES, profile); }
  async getSubliminalProfile(id: string): Promise<SubliminalProfile | undefined> { return this.get(DB_STORE_NAMES.SUBLIMINAL_PROFILES, id); }
  async deleteSubliminalProfile(id: string): Promise<void> { return this.delete(DB_STORE_NAMES.SUBLIMINAL_PROFILES, id); }

  // Quantum Healing
  async getHealingPresets(): Promise<HealingPreset[]> { return this.getAll(DB_STORE_NAMES.HEALING_PRESETS); }
  async saveHealingPreset(preset: HealingPreset): Promise<void> { return this.put(DB_STORE_NAMES.HEALING_PRESETS, preset); }
  async deleteHealingPreset(id: string): Promise<void> { return this.delete(DB_STORE_NAMES.HEALING_PRESETS, id); }

  // Frequency Generator
  async getFrequencyPresets(): Promise<FrequencyPreset[]> { return this.getAll(DB_STORE_NAMES.FREQUENCY_PRESETS); }
  async saveFrequencyPreset(preset: FrequencyPreset): Promise<void> { return this.put(DB_STORE_NAMES.FREQUENCY_PRESETS, preset); }
  async deleteFrequencyPreset(id: string): Promise<void> { return this.delete(DB_STORE_NAMES.FREQUENCY_PRESETS, id); }

  // Mantra Siddhi
  async getMantraSessions(): Promise<MantraSession[]> { return this.getAll(DB_STORE_NAMES.MANTRA_SESSIONS); }
  async saveMantraSession(session: MantraSession): Promise<void> { return this.put(DB_STORE_NAMES.MANTRA_SESSIONS, session); }
  async getMantraSession(id: string): Promise<MantraSession | undefined> { return this.get(DB_STORE_NAMES.MANTRA_SESSIONS, id); }
  async deleteMantraSession(id: string): Promise<void> { return this.delete(DB_STORE_NAMES.MANTRA_SESSIONS, id); }


  // --- Cache API Methods for Blob/File Data ---
  async cacheFile(url: string, file: Blob): Promise<void> {
    if (!this.cache) return;
    try {
      const response = new Response(file, { headers: { 'Content-Type': file.type } });
      await this.cache.put(url, response);
      console.log(`File cached: ${url}`);
    } catch (e) {
      console.error("Error caching file:", e);
    }
  }

  async getCachedFile(url: string): Promise<Blob | undefined> {
    if (!this.cache) return undefined;
    try {
      const response = await this.cache.match(url);
      if (response) {
        return await response.blob();
      }
    } catch (e) {
      console.error("Error getting cached file:", e);
    }
    return undefined;
  }

  async deleteCachedFile(url: string): Promise<void> {
    if (!this.cache) return;
    try {
      await this.cache.delete(url);
      console.log(`File deleted from cache: ${url}`);
    } catch (e) {
      console.error("Error deleting cached file:", e);
    }
  }

  // Utility to convert File/Blob to Data URL for saving in IndexedDB or direct use
  async fileToDataUrl(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert file to data URL."));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // Utility to convert Data URL to Blob
  dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}

export const storageService = new StorageService();