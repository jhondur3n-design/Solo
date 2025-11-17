import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Panel from '../UI/Panel';
import Button from '../UI/Button';
import Dial from '../UI/Dial';
import EnergyBar from '../UI/EnergyBar';
import { storageService } from '../../services/storageService';
import {
  RadionicsPreset,
  RadionicsRates,
  RadionicsWitness,
  RadionicsEmissionLog
} from '../../../types';
import {
  DEFAULT_RADIONICS_RATES,
  DB_STORE_NAMES
} from '../../../constants';

const MAX_ENERGY_POOL = 1000;
const PASSIVE_REGEN_RATE = 0.5; // energy per second
const EMISSION_ENERGY_COST_FACTOR = 0.1; // per resonance point

const RadionicsSimulator: React.FC = () => {
  const [rates, setRates] = useState<RadionicsRates>(DEFAULT_RADIONICS_RATES);
  const [witness, setWitness] = useState<RadionicsWitness | null>(null);
  const [energyPool, setEnergyPool] = useState<number>(MAX_ENERGY_POOL);
  const [resonanceStrength, setResonanceStrength] = useState<number>(0);
  const [emissionLogs, setEmissionLogs] = useState<RadionicsEmissionLog[]>([]);
  const [presets, setPresets] = useState<RadionicsPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [presetName, setPresetName] = useState<string>('');
  const [isEmitting, setIsEmitting] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);

  const loadInitialData = useCallback(async () => {
    const savedPresets = await storageService.getRadionicsPresets();
    const savedLogs = await storageService.getRadionicsEmissionLogs();
    setPresets(savedPresets.sort((a, b) => b.createdAt - a.createdAt));
    setEmissionLogs(savedLogs.sort((a, b) => b.timestamp - a.timestamp));

    // Restore last active rates/witness if available or use default
    const lastActivePresetId = localStorage.getItem('radionicsLastActivePresetId');
    if (lastActivePresetId) {
      const preset = savedPresets.find(p => p.id === lastActivePresetId);
      if (preset) {
        setRates(preset.rates);
        setWitness(preset.witness || null);
        setSelectedPresetId(preset.id);
        setPresetName(preset.name);
      }
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    const interval = setInterval(() => {
      setEnergyPool(prev => Math.min(MAX_ENERGY_POOL, prev + PASSIVE_REGEN_RATE));
    }, 1000);

    return () => clearInterval(interval);
  }, [loadInitialData]);

  useEffect(() => {
    // Simulate resonance calculation
    // Fix: Add type assertion to Object.values(rates) to ensure all elements are treated as numbers
    const currentResonance = (Object.values(rates) as number[]).reduce((acc, val) => acc + val, 0) / 6;
    setResonanceStrength(Math.round(currentResonance));
  }, [rates]);

  // Auto-save active preset when rates or witness change
  useEffect(() => {
    if (selectedPresetId && presetName.trim()) {
      const existingPreset = presets.find(p => p.id === selectedPresetId);
      const updatedPreset: RadionicsPreset = {
        id: selectedPresetId,
        name: presetName.trim(),
        rates: { ...rates },
        witness: witness ? { ...witness } : undefined,
        createdAt: existingPreset ? existingPreset.createdAt : Date.now(), // Preserve original creation time
      };
      storageService.saveRadionicsPreset(updatedPreset);
      setPresets(prev => prev.map(p => p.id === selectedPresetId ? updatedPreset : p));
    }
  }, [rates, witness, selectedPresetId, presetName, presets]);

  const handleRateChange = useCallback((dial: keyof RadionicsRates, newValue: number) => {
    setRates(prev => ({ ...prev, [dial]: newValue }));
  }, []);

  const handleWitnessFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await storageService.fileToDataUrl(file);
      setWitness({ type: 'image', data: dataUrl, name: file.name });
    }
  }, []);

  const handleWitnessTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setWitness({ type: 'text', data: e.target.value });
  }, []);

  const handleRecharge = useCallback(() => {
    setEnergyPool(MAX_ENERGY_POOL);
  }, []);

  const handleEmit = useCallback(async () => {
    if (energyPool < resonanceStrength * EMISSION_ENERGY_COST_FACTOR) {
      alert('Insufficient Energy Pool for this resonance strength!');
      return;
    }

    setIsEmitting(true);
    const energyConsumed = resonanceStrength * EMISSION_ENERGY_COST_FACTOR;
    setEnergyPool(prev => Math.max(0, prev - energyConsumed));

    const log: RadionicsEmissionLog = {
      id: uuidv4(),
      timestamp: Date.now(),
      rates: { ...rates },
      resonanceStrength,
      witnessInfo: witness ? (witness.type === 'text' ? `Text: ${witness.data.substring(0, 30)}...` : `Image: ${witness.name || 'Untitled'}`) : 'No witness',
      energyConsumed: parseFloat(energyConsumed.toFixed(2)),
    };
    await storageService.addRadionicsEmissionLog(log);
    setEmissionLogs(prev => [log, ...prev]);

    // Simulate emission animation duration
    setTimeout(() => {
      setIsEmitting(false);
    }, 1500);
  }, [energyPool, rates, witness, resonanceStrength]);

  const handleSavePreset = useCallback(async () => {
    if (!presetName.trim()) {
      alert('Preset name cannot be empty!');
      return;
    }
    const newPreset: RadionicsPreset = {
      id: uuidv4(),
      name: presetName.trim(),
      rates: { ...rates },
      witness: witness ? { ...witness } : undefined,
      createdAt: Date.now(),
    };
    await storageService.saveRadionicsPreset(newPreset);
    setPresets(prev => [newPreset, ...prev].sort((a, b) => b.createdAt - a.createdAt));
    setSelectedPresetId(newPreset.id);
    localStorage.setItem('radionicsLastActivePresetId', newPreset.id);
  }, [presetName, rates, witness]);

  const handleLoadPreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setRates(preset.rates);
      setWitness(preset.witness || null);
      setSelectedPresetId(preset.id);
      setPresetName(preset.name);
      localStorage.setItem('radionicsLastActivePresetId', preset.id);
    }
  }, [presets]);

  const handleDeletePreset = useCallback(async (presetId: string) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      await storageService.deleteRadionicsPreset(presetId);
      setPresets(prev => prev.filter(p => p.id !== presetId));
      if (selectedPresetId === presetId) {
        setSelectedPresetId('');
        setPresetName('');
        setRates(DEFAULT_RADIONICS_RATES);
        setWitness(null);
        localStorage.removeItem('radionicsLastActivePresetId');
      }
    }
  }, [selectedPresetId, presets]);

  const radionicsDials = useMemo(() => {
    const dialLabels: (keyof RadionicsRates)[] = ['trend1', 'trend2', 'trend3', 'target1', 'target2', 'target3'];
    return dialLabels.map(key => (
      <Dial
        key={key}
        label={key.charAt(0).toUpperCase() + key.slice(1).replace(/\d/, ' ' + key.slice(-1))}
        value={rates[key]}
        onChange={(val) => handleRateChange(key, val)}
        min={0}
        max={100}
        className="mb-4"
      />
    ));
  }, [rates, handleRateChange]);

  const radionicsLogs = useMemo(() => (
    emissionLogs.map(log => (
      <div key={log.id} className="bg-gray-700/50 p-2 rounded-md text-sm mb-2 border border-blue-600/50">
        <div className="flex justify-between text-blue-300">
          <span>{new Date(log.timestamp).toLocaleString()}</span>
          <span>Resonance: <span className="text-cyan-400">{log.resonanceStrength}</span></span>
        </div>
        <div className="text-gray-400">Energy Consumed: {log.energyConsumed}</div>
        <div className="text-gray-400">Witness: {log.witnessInfo}</div>
      </div>
    ))
  ), [emissionLogs]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full p-4">
      <Panel title="RADIONICS CONSOLE" className="col-span-1 lg:col-span-2 flex flex-col">
        <div className="flex flex-col md:flex-row gap-4 flex-grow overflow-hidden">
          {/* Dials Section */}
          <div className="w-full md:w-1/2 p-2 overflow-y-auto custom-scrollbar">
            <h3 className="text-blue-200 text-lg mb-4 neon-text">Energy Matrix Control</h3>
            <div className="grid grid-cols-2 gap-4 justify-items-center">
              {radionicsDials}
            </div>
          </div>

          {/* Witness & Output */}
          <div className="w-full md:w-1/2 p-2 flex flex-col overflow-y-auto custom-scrollbar">
            <h3 className="text-blue-200 text-lg mb-4 neon-text">Witness Configuration</h3>
            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">Witness Input (Image)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleWitnessFileChange}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/30 file:text-blue-200 hover:file:bg-blue-500/50"
              />
              {witness?.type === 'image' && witness.data && (
                <img src={witness.data} alt="Witness" className="mt-2 max-h-32 w-auto object-contain rounded border border-blue-600/50" />
              )}
            </div>
            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">Witness Input (Text)</label>
              <textarea
                value={witness?.type === 'text' ? witness.data : ''}
                onChange={handleWitnessTextChange}
                rows={4}
                maxLength={500}
                className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter witness text (max 500 characters)"
              />
            </div>

            <h3 className="text-blue-200 text-lg mb-4 mt-auto neon-text">Resonance Engine Output</h3>
            <div
              className={`relative w-full h-24 bg-gray-900 border-2 border-cyan-500 rounded flex items-center justify-center mb-4 transition-all duration-300 ease-in-out ${isEmitting ? 'shadow-lg shadow-cyan-400/80 aura-effect' : 'shadow-md shadow-blue-500/30'}`}
              style={{
                background: `linear-gradient(90deg, #0f172a 0%, rgba(0,255,255,${resonanceStrength / 200}) ${resonanceStrength}%, #0f172a 100%)`
              }}
            >
              <span className={`text-xl font-bold ${isEmitting ? 'text-cyan-200 neon-text' : 'text-blue-300'}`}>
                Resonance: {resonanceStrength}
              </span>
              {isEmitting && (
                <div className="absolute inset-0 bg-cyan-400/20 animate-pulse-slow"></div>
              )}
            </div>

            <Button onClick={handleEmit} disabled={isEmitting || energyPool < 1} className="w-full mt-auto">
              {isEmitting ? 'EMITTING...' : 'INITIATE EMISSION'}
            </Button>
          </div>
        </div>
      </Panel>

      <div className="col-span-1 flex flex-col gap-4">
        <Panel title="SYSTEM STATUS" className="h-1/2">
          <EnergyBar value={energyPool} max={MAX_ENERGY_POOL} label="Energy Pool (Chi/Life Force)" className="mb-4" />
          <Button onClick={handleRecharge} className="w-full mb-4">RECHARGE</Button>

          <h3 className="text-blue-200 text-lg mt-4 mb-2 neon-text">Preset Management</h3>
          <div className="mb-4">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset Name (max 50 characters)"
              maxLength={50}
              className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200 focus:ring-blue-500 focus:border-blue-500 mb-2"
            />
            <Button onClick={handleSavePreset} className="w-full mb-2" disabled={!presetName.trim()}>SAVE PRESET</Button>
          </div>
          <div className="flex-grow overflow-y-auto custom-scrollbar">
            {presets.length === 0 ? (
              <p className="text-gray-400 text-center">No presets saved.</p>
            ) : (
              <select
                value={selectedPresetId}
                onChange={(e) => handleLoadPreset(e.target.value)}
                className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200 mb-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="" disabled>Load Preset</option>
                {presets.map(preset => (
                  <option key={preset.id} value={preset.id}>{preset.name}</option>
                ))}
              </select>
            )}
            {selectedPresetId && (
              <Button onClick={() => handleDeletePreset(selectedPresetId)} variant="danger" className="w-full mt-2">
                DELETE SELECTED
              </Button>
            )}
          </div>
        </Panel>

        <Panel title="EMISSION LOGS" className="h-1/2">
          <Button onClick={() => setShowLogs(!showLogs)} className="w-full mb-4">
            {showLogs ? 'HIDE LOGS' : 'SHOW LOGS'}
          </Button>
          {showLogs && (
            <div className="flex-grow overflow-y-auto custom-scrollbar">
              {emissionLogs.length === 0 ? (
                <p className="text-gray-400 text-center">No emission records.</p>
              ) : radionicsLogs}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default RadionicsSimulator;