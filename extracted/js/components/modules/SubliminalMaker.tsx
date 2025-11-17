import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Panel from '../UI/Panel';
import Button from '../UI/Button';
import { storageService } from '../../services/storageService';
import {
  AudioTrack,
  Affirmation,
  SubliminalProfile,
  SubliminalInfusionSettings
} from '../../../types';
import { DB_STORE_NAMES, DEFAULT_SUB_INFUSION_SETTINGS } from '../../../constants';

const SubliminalMaker: React.FC = () => {
  const [profileName, setProfileName] = useState<string>('');
  const [baseAudioId, setBaseAudioId] = useState<string>('');
  const [affirmations, setAffirmations] = useState<Affirmation[]>([{ id: uuidv4(), text: '', intensity: 50, delay: 0 }]);
  const [infusionSettings, setInfusionSettings] = useState<SubliminalInfusionSettings>(DEFAULT_SUB_INFUSION_SETTINGS);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [savedProfiles, setSavedProfiles] = useState<SubliminalProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  const loadInitialData = useCallback(async () => {
    const tracks = await storageService.getAudioTracks();
    const profiles = await storageService.getSubliminalProfiles();
    setAudioTracks(tracks);
    setSavedProfiles(profiles.sort((a, b) => b.createdAt - a.createdAt));

    // Load last active profile
    const lastActiveProfileId = localStorage.getItem('subliminalMakerLastActiveProfileId');
    if (lastActiveProfileId) {
      const profile = profiles.find(p => p.id === lastActiveProfileId);
      if (profile) {
        loadProfile(profile);
      }
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Auto-save active profile when relevant state changes
  useEffect(() => {
    if (selectedProfileId && profileName.trim()) {
      const existingProfile = savedProfiles.find(p => p.id === selectedProfileId);
      const updatedProfile: SubliminalProfile = {
        id: selectedProfileId,
        name: profileName.trim(),
        baseAudioId: baseAudioId || undefined,
        affirmations: affirmations.filter(aff => aff.text.trim()),
        infusionSettings: { ...infusionSettings },
        createdAt: existingProfile ? existingProfile.createdAt : Date.now(), // Preserve original creation time
      };
      storageService.saveSubliminalProfile(updatedProfile);
      setSavedProfiles(prev => prev.map(p => p.id === selectedProfileId ? updatedProfile : p));
    }
  }, [profileName, baseAudioId, affirmations, infusionSettings, selectedProfileId, savedProfiles]);


  const addAffirmation = useCallback(() => {
    setAffirmations(prev => [...prev, { id: uuidv4(), text: '', intensity: 50, delay: 0 }]);
  }, []);

  const updateAffirmation = useCallback((id: string, field: keyof Affirmation, value: any) => {
    setAffirmations(prev => prev.map(aff => aff.id === id ? { ...aff, [field]: value } : aff));
  }, []);

  const removeAffirmation = useCallback((id: string) => {
    setAffirmations(prev => prev.filter(aff => aff.id !== id));
  }, []);

  const handleInfusionSettingChange = useCallback((field: keyof SubliminalInfusionSettings, value: number) => {
    setInfusionSettings(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleBaseAudioFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const id = uuidv4();
      const fileDataUrl = await storageService.fileToDataUrl(file);
      const newTrack: AudioTrack = { id, name: file.name, fileDataUrl, mimeType: file.type };
      await storageService.saveAudioTrack(newTrack);
      setAudioTracks(prev => [...prev, newTrack]);
      setBaseAudioId(id);
    }
    e.target.value = ''; // Clear file input
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!profileName.trim()) {
      alert('Profile name cannot be empty!');
      return;
    }
    if (!baseAudioId) {
      alert('Please select a base audio track!');
      return;
    }
    const filteredAffirmations = affirmations.filter(aff => aff.text.trim());
    if (filteredAffirmations.length === 0) {
      alert('Please add at least one affirmation!');
      return;
    }

    const newProfile: SubliminalProfile = {
      id: uuidv4(),
      name: profileName.trim(),
      baseAudioId: baseAudioId,
      affirmations: filteredAffirmations,
      infusionSettings: { ...infusionSettings },
      createdAt: Date.now(),
    };

    await storageService.saveSubliminalProfile(newProfile);
    setSavedProfiles(prev => [newProfile, ...prev].sort((a, b) => b.createdAt - a.createdAt));
    setSelectedProfileId(newProfile.id);
    localStorage.setItem('subliminalMakerLastActiveProfileId', newProfile.id);
    alert('Subliminal profile saved!');
  }, [profileName, baseAudioId, affirmations, infusionSettings]);

  const loadProfile = useCallback((profile: SubliminalProfile) => {
    setProfileName(profile.name);
    setBaseAudioId(profile.baseAudioId || '');
    setAffirmations(profile.affirmations.length > 0 ? profile.affirmations : [{ id: uuidv4(), text: '', intensity: 50, delay: 0 }]);
    setInfusionSettings(profile.infusionSettings);
    setSelectedProfileId(profile.id);
    localStorage.setItem('subliminalMakerLastActiveProfileId', profile.id);
  }, []);

  const handleLoadProfile = useCallback((profileId: string) => {
    const profile = savedProfiles.find(p => p.id === profileId);
    if (profile) {
      loadProfile(profile);
    }
  }, [savedProfiles, loadProfile]);

  const handleDeleteProfile = useCallback(async (profileId: string) => {
    if (window.confirm('Are you sure you want to delete this profile?')) {
      await storageService.deleteSubliminalProfile(profileId);
      setSavedProfiles(prev => prev.filter(p => p.id !== profileId));
      if (selectedProfileId === profileId) {
        // Reset current form if deleted profile was active
        setProfileName('');
        setBaseAudioId('');
        setAffirmations([{ id: uuidv4(), text: '', intensity: 50, delay: 0 }]);
        setInfusionSettings(DEFAULT_SUB_INFUSION_SETTINGS);
        setSelectedProfileId('');
        localStorage.removeItem('subliminalMakerLastActiveProfileId');
      }
    }
  }, [selectedProfileId]);

  const handleExportProfile = useCallback((profile: SubliminalProfile) => {
    const json = JSON.stringify(profile, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const renderInfusionSlider = useCallback((label: string, field: keyof SubliminalInfusionSettings, value: number) => (
    <div className="mb-4">
      <label htmlFor={field} className="block text-gray-300 text-sm mb-2">{label} ({value})</label>
      <input
        id={field}
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => handleInfusionSettingChange(field, parseInt(e.target.value))}
        className="w-full h-2 bg-blue-700 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        style={{
          background: `linear-gradient(to right, #00BCD4 0%, #00BCD4 ${value}%, #2C3E50 ${value}%, #2C3E50 100%)`
        }}
      />
    </div>
  ), [handleInfusionSettingChange]);

  const currentBaseAudioName = useMemo(() => {
    return audioTracks.find(t => t.id === baseAudioId)?.name || 'No audio selected';
  }, [baseAudioId, audioTracks]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full p-4">
      <Panel title="SUBLIMINAL MAKER" className="flex flex-col">
        <div className="flex flex-col flex-grow overflow-hidden">
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-2">Profile Name</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Enter Subliminal Profile Name (max 50 characters)"
              maxLength={50}
              className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-2">Base Audio</label>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-200 text-sm flex-grow truncate">{currentBaseAudioName}</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleBaseAudioFileChange}
                className="block text-sm text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-500/30 file:text-blue-200 hover:file:bg-blue-500/50"
              />
            </div>
            <select
              className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200 text-sm focus:ring-blue-500 focus:border-blue-500"
              value={baseAudioId || ''}
              onChange={(e) => setBaseAudioId(e.target.value)}
            >
              <option value="" disabled>Or select existing track</option>
              {audioTracks.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <h3 className="text-blue-200 text-lg mb-4 neon-text">Affirmations</h3>
          <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 mb-4">
            {affirmations.map((aff, index) => (
              <div key={aff.id} className="flex flex-col md:flex-row items-center gap-2 bg-gray-700/50 p-2 rounded-md mb-2 border border-blue-600/50">
                <input
                  type="text"
                  value={aff.text}
                  onChange={(e) => updateAffirmation(aff.id, 'text', e.target.value)}
                  placeholder={`Affirmation ${index + 1} (max 200 characters)`}
                  maxLength={200}
                  className="flex-grow p-1 bg-gray-600/60 border border-blue-500 rounded text-gray-200 text-sm focus:ring-blue-400 focus:border-blue-400"
                />
                <input
                  type="number"
                  value={aff.intensity}
                  onChange={(e) => updateAffirmation(aff.id, 'intensity', parseInt(e.target.value))}
                  min="0"
                  max="100"
                  placeholder="Int."
                  title="Intensity (0-100)"
                  className="w-16 p-1 bg-gray-600/60 border border-blue-500 rounded text-gray-200 text-sm text-center"
                />
                <input
                  type="number"
                  value={aff.delay}
                  onChange={(e) => updateAffirmation(aff.id, 'delay', parseInt(e.target.value))}
                  min="0"
                  max="10000"
                  placeholder="Del."
                  title="Delay (ms, 0-10000)"
                  className="w-16 p-1 bg-gray-600/60 border border-blue-500 rounded text-gray-200 text-sm text-center"
                />
                <Button onClick={() => removeAffirmation(aff.id)} variant="danger" className="py-1 px-2 text-xs">X</Button>
              </div>
            ))}
            <Button onClick={addAffirmation} variant="secondary" className="w-full mt-2">Add Affirmation</Button>
          </div>

          <h3 className="text-blue-200 text-lg mb-4 neon-text">Infusion Settings</h3>
          <div className="flex-col">
            {renderInfusionSlider('Harmonic Resonance', 'harmonicResonance', infusionSettings.harmonicResonance)}
            {renderInfusionSlider('Quantum Entanglement', 'quantumEntanglement', infusionSettings.quantumEntanglement)}
            {renderInfusionSlider('Etheric Vibration', 'ethericVibration', infusionSettings.ethericVibration)}
          </div>

          <Button onClick={handleSaveProfile} className="w-full mt-4">SAVE SUBLIMINAL PROFILE</Button>
        </div>
      </Panel>

      <Panel title="SAVED PROFILES" className="flex flex-col">
        <h3 className="text-blue-200 text-lg mb-4 neon-text">Profile Management</h3>
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
          {savedProfiles.length === 0 ? (
            <p className="text-gray-400 text-center">No subliminal profiles saved.</p>
          ) : (
            <select
              value={selectedProfileId}
              onChange={(e) => handleLoadProfile(e.target.value)}
              className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200 mb-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>Load Profile</option>
              {savedProfiles.map(profile => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
          )}

          {selectedProfileId && (
            <div className="flex flex-col gap-2 mt-4">
              <Button onClick={() => handleLoadProfile(selectedProfileId)} variant="primary">LOAD SELECTED</Button>
              <Button onClick={() => handleDeleteProfile(selectedProfileId)} variant="danger">DELETE SELECTED</Button>
              <Button onClick={() => {
                const profile = savedProfiles.find(p => p.id === selectedProfileId);
                if (profile) handleExportProfile(profile);
              }} variant="secondary">EXPORT SELECTED (JSON)</Button>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-blue-700/50">
          <h3 className="text-blue-200 text-lg mb-4 neon-text">Fictional Output Preview</h3>
          <div
            className="w-full h-32 bg-gray-900 border-2 border-cyan-500 rounded flex items-center justify-center relative overflow-hidden"
            style={{
              boxShadow: `0 0 ${infusionSettings.harmonicResonance / 5}px rgba(0, 255, 255, ${infusionSettings.harmonicResonance / 200})`,
              background: `linear-gradient(45deg, rgba(0,255,255,${infusionSettings.quantumEntanglement / 300}) 0%, rgba(138,43,226,${infusionSettings.ethericVibration / 300}) 100%)`
            }}
          >
            <span className="text-xl font-bold text-cyan-200 neon-text animate-pulse">
              INFUSION MATRIX
            </span>
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 gap-[1px]">
                {[...Array(100)].map((_, i) => (
                    <div key={i} className={`bg-blue-500 opacity-0 animate-fade-in-out`}
                         style={{animationDelay: `${Math.random() * 2}s`, animationDuration: `${1 + Math.random() * 2}s`}}
                    ></div>
                ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
};

export default SubliminalMaker;