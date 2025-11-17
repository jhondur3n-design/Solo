import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Panel from '../UI/Panel';
import Button from '../UI/Button';
import { storageService } from '../../services/storageService';
import { HealingPreset } from '../../../types';
import { DB_STORE_NAMES } from '../../../constants';

const CHAKRAS = [
  { name: 'Root', color: 'red', position: 'bottom-16 left-1/2 -translate-x-1/2' },
  { name: 'Sacral', color: 'orange', position: 'bottom-1/3 left-1/2 -translate-x-1/2' },
  { name: 'Solar Plexus', color: 'yellow', position: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' },
  { name: 'Heart', color: 'green', position: 'top-1/3 left-1/2 -translate-x-1/2' },
  { name: 'Throat', color: 'blue', position: 'top-16 left-1/2 -translate-x-1/2' },
  { name: 'Third Eye', color: 'indigo', position: 'top-8 left-1/2 -translate-x-1/2' },
  { name: 'Crown', color: 'purple', position: 'top-0 left-1/2 -translate-x-1/2' },
];

const QuantumHealing: React.FC = () => {
  const [activeChakra, setActiveChakra] = useState<string>('');
  const [energyCoherence, setEnergyCoherence] = useState<number>(50);
  const [harmonyMeter, setHarmonyMeter] = useState<number>(50);
  const [alignmentIndicator, setAlignmentIndicator] = useState<number>(50);
  const [isHealing, setIsHealing] = useState<boolean>(false);
  const [healingPresets, setHealingPresets] = useState<HealingPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [presetName, setPresetName] = useState<string>('');

  const healingIntervalRef = useRef<number | null>(null);

  const loadInitialData = useCallback(async () => {
    const presets = await storageService.getHealingPresets();
    setHealingPresets(presets.sort((a, b) => b.createdAt - a.createdAt));

    const lastActivePresetId = localStorage.getItem('quantumHealingLastActivePresetId');
    if (lastActivePresetId) {
      const preset = presets.find(p => p.id === lastActivePresetId);
      if (preset) {
        loadPreset(preset);
      }
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Auto-save active preset when settings change
  useEffect(() => {
    if (selectedPresetId && presetName.trim()) {
      const existingPreset = healingPresets.find(p => p.id === selectedPresetId);
      const updatedPreset: HealingPreset = {
        id: selectedPresetId,
        name: presetName.trim(),
        chakraFocus: activeChakra,
        energyCoherenceTarget: energyCoherence,
        harmonyMeterTarget: harmonyMeter,
        alignmentIndicatorTarget: alignmentIndicator,
        createdAt: existingPreset ? existingPreset.createdAt : Date.now(), // Preserve original creation time
      };
      storageService.saveHealingPreset(updatedPreset);
      setHealingPresets(prev => prev.map(p => p.id === selectedPresetId ? updatedPreset : p));
    }
  }, [activeChakra, energyCoherence, harmonyMeter, alignmentIndicator, selectedPresetId, presetName, healingPresets]);


  const startHealing = useCallback(() => {
    if (isHealing) return; // Prevent starting if already healing
    setIsHealing(true);
    // Simulate healing process over time
    const coherenceTarget = Math.min(95, energyCoherence + Math.random() * 20);
    const harmonyTarget = Math.min(95, harmonyMeter + Math.random() * 20);
    const alignmentTarget = Math.min(95, alignmentIndicator + Math.random() * 20);

    // Using a ref to store the interval ID
    healingIntervalRef.current = window.setInterval(() => {
      setEnergyCoherence(prevCoherence => {
        const nextCoherence = prevCoherence < coherenceTarget ? Math.min(coherenceTarget, prevCoherence + Math.random() * 5) : prevCoherence;
        setHarmonyMeter(prevHarmony => {
          const nextHarmony = prevHarmony < harmonyTarget ? Math.min(harmonyTarget, prevHarmony + Math.random() * 5) : prevHarmony;
          setAlignmentIndicator(prevAlignment => {
            const nextAlignment = prevAlignment < alignmentTarget ? Math.min(alignmentTarget, prevAlignment + Math.random() * 5) : prevAlignment;

            // Check if targets are reached using the actual updated values for this tick
            if (nextCoherence >= coherenceTarget && nextHarmony >= harmonyTarget && nextAlignment >= alignmentTarget) {
              if (healingIntervalRef.current) {
                clearInterval(healingIntervalRef.current);
                healingIntervalRef.current = null;
                setIsHealing(false);
              }
            }
            return parseFloat(nextAlignment.toFixed(2));
          });
          return parseFloat(nextHarmony.toFixed(2));
        });
        return parseFloat(nextCoherence.toFixed(2));
      });
    }, 200);

  }, [isHealing, energyCoherence, harmonyMeter, alignmentIndicator]);


  const stopHealing = useCallback(() => {
    setIsHealing(false);
    if (healingIntervalRef.current) {
      clearInterval(healingIntervalRef.current);
      healingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Cleanup interval on component unmount
    return () => {
      if (healingIntervalRef.current) {
        clearInterval(healingIntervalRef.current);
        healingIntervalRef.current = null;
      }
    };
  }, []);

  const handleSavePreset = useCallback(async () => {
    if (!presetName.trim()) {
      alert('Preset name cannot be empty!');
      return;
    }
    const newPreset: HealingPreset = {
      id: uuidv4(),
      name: presetName.trim(),
      chakraFocus: activeChakra,
      energyCoherenceTarget: energyCoherence,
      harmonyMeterTarget: harmonyMeter,
      alignmentIndicatorTarget: alignmentIndicator,
      createdAt: Date.now(),
    };
    await storageService.saveHealingPreset(newPreset);
    setHealingPresets(prev => [newPreset, ...prev].sort((a, b) => b.createdAt - a.createdAt));
    setSelectedPresetId(newPreset.id);
    localStorage.setItem('quantumHealingLastActivePresetId', newPreset.id);
  }, [presetName, activeChakra, energyCoherence, harmonyMeter, alignmentIndicator]);

  const loadPreset = useCallback((preset: HealingPreset) => {
    setPresetName(preset.name);
    setActiveChakra(preset.chakraFocus);
    setEnergyCoherence(preset.energyCoherenceTarget);
    setHarmonyMeter(preset.harmonyMeterTarget);
    setAlignmentIndicator(preset.alignmentIndicatorTarget);
    setSelectedPresetId(preset.id);
    localStorage.setItem('quantumHealingLastActivePresetId', preset.id);
  }, []);

  const handleLoadPreset = useCallback((presetId: string) => {
    const preset = healingPresets.find(p => p.id === presetId);
    if (preset) {
      loadPreset(preset);
    }
  }, [healingPresets, loadPreset]);

  const handleDeletePreset = useCallback(async (presetId: string) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      await storageService.deleteHealingPreset(presetId);
      setHealingPresets(prev => prev.filter(p => p.id !== presetId));
      if (selectedPresetId === presetId) {
        setPresetName('');
        setActiveChakra('');
        setEnergyCoherence(50);
        setHarmonyMeter(50);
        setAlignmentIndicator(50);
        setSelectedPresetId('');
        localStorage.removeItem('quantumHealingLastActivePresetId');
      }
    }
  }, [selectedPresetId, healingPresets]);


  const renderDiagnosticBar = useCallback((label: string, value: number, color: string) => (
    <div className="mb-3">
      <label className="block text-gray-300 text-sm mb-1">{label} <span className={`text-${color}-400`}>({value.toFixed(2)}%)</span></label>
      <div className="w-full h-4 bg-gray-700 rounded-full border border-blue-600 overflow-hidden">
        <div
          className={`h-full bg-${color}-500 transition-all duration-300 ease-out`}
          style={{ width: `${value}%`, boxShadow: `0 0 8px rgba(0, 255, 255, ${value / 200})` }}
        ></div>
      </div>
    </div>
  ), []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full p-4">
      <Panel title="QUANTUM HEALING MATRIX" className="flex flex-col">
        <h3 className="text-blue-200 text-lg mb-4 neon-text">Chakra/Energy Map</h3>
        <div className="relative w-full aspect-square bg-gray-900 border-2 border-cyan-500 rounded overflow-hidden flex-grow mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 to-indigo-900">
            {/* Quantum Fractal Background - Simple CSS grid for animated "fractal" effect */}
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 gap-[1px]">
              {[...Array(100)].map((_, i) => (
                <div
                  key={i}
                  className={`bg-blue-500 opacity-0 animate-fade-in-out`}
                  style={{ animationDelay: `${Math.random() * 3}s`, animationDuration: `${2 + Math.random() * 3}s` }}
                ></div>
              ))}
            </div>
          </div>
          {CHAKRAS.map((chakra) => {
            // Pre-calculate random values for particle flow animation
            const dx1 = Math.random() * 20 - 10;
            const dy1 = Math.random() * 20 - 10;
            const dx2 = Math.random() * 20 - 10;
            const dy2 = Math.random() * 20 - 10;
            const dx3 = Math.random() * 20 - 10;
            const dy3 = Math.random() * 20 - 10;
            const dx4 = Math.random() * 20 - 10;
            const dy4 = Math.random() * 20 - 10;

            return (
            <div
              key={chakra.name}
              className={`absolute w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center cursor-pointer
                          border-2 border-${chakra.color}-500
                          transition-all duration-300 ease-in-out
                          ${activeChakra === chakra.name ? `bg-${chakra.color}-500/70 shadow-lg shadow-${chakra.color}-400 animate-pulse` : `bg-${chakra.color}-500/30 hover:bg-${chakra.color}-500/50`
                          } ${chakra.position}`}
              onClick={() => setActiveChakra(chakra.name)}
              style={{ filter: activeChakra === chakra.name ? 'brightness(1.5)' : 'none' }}
            >
              <span className={`text-xs md:text-sm font-bold text-${chakra.color}-100 opacity-0 ${activeChakra === chakra.name ? 'opacity-100' : 'group-hover:opacity-100'}`}>{chakra.name.charAt(0)}</span>
              {isHealing && activeChakra === chakra.name && (
                <div className="absolute inset-0 rounded-full bg-cyan-400 opacity-20 animate-ping"></div>
              )}
            </div>
          )})}
          {/* Particle-field healing animation */}
          {isHealing && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-cyan-300 opacity-70 animate-particle-flow"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    animationDuration: `${3 + Math.random() * 5}s`,
                    // Use CSS variables for random translations
                    '--dx1': `${Math.random() * 20 - 10}px`,
                    '--dy1': `${Math.random() * 20 - 10}px`,
                    '--dx2': `${Math.random() * 20 - 10}px`,
                    '--dy2': `${Math.random() * 20 - 10}px`,
                    '--dx3': `${Math.random() * 20 - 10}px`,
                    '--dy3': `${Math.random() * 20 - 10}px`,
                    '--dx4': `${Math.random() * 20 - 10}px`,
                    '--dy4': `${Math.random() * 20 - 10}px`,
                  } as React.CSSProperties}
                ></div>
              ))}
            </div>
          )}
        </div>

        <h3 className="text-blue-200 text-lg mb-4 neon-text">Healing Controls</h3>
        <div className="flex justify-around mb-4">
          <Button onClick={startHealing} disabled={isHealing || !activeChakra} className="w-[48%]">
            {isHealing ? 'HEALING...' : 'INITIATE HEALING'}
          </Button>
          <Button onClick={stopHealing} disabled={!isHealing} variant="secondary" className="w-[48%]">
            STOP HEALING
          </Button>
        </div>
      </Panel>

      <Panel title="DIAGNOSTICS & PRESETS" className="flex flex-col">
        <h3 className="text-blue-200 text-lg mb-4 neon-text">System Diagnostics</h3>
        <div className="mb-6">
          {renderDiagnosticBar('Energy Coherence', energyCoherence, 'cyan')}
          {renderDiagnosticBar('Harmony Meter', harmonyMeter, 'green')}
          {renderDiagnosticBar('Alignment Indicator', alignmentIndicator, 'indigo')}
          <p className="text-gray-400 text-sm mt-4">
            Focused on: <span className="text-cyan-400">{activeChakra || 'None'}</span>
          </p>
        </div>

        <h3 className="text-blue-200 text-lg mb-4 neon-text">Healing Presets</h3>
        <div className="mb-4">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset Name (max 50 characters)"
            maxLength={50}
            className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200 focus:ring-blue-500 focus:border-blue-500 mb-2"
          />
          <Button onClick={handleSavePreset} className="w-full" disabled={!presetName.trim() || !activeChakra}>SAVE PRESET</Button>
        </div>
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
          {healingPresets.length === 0 ? (
            <p className="text-gray-400 text-center">No healing presets saved.</p>
          ) : (
            <select
              value={selectedPresetId}
              onChange={(e) => handleLoadPreset(e.target.value)}
              className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200 mb-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>Load Preset</option>
              {healingPresets.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.name} ({preset.chakraFocus})</option>
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
    </div>
  );
};

export default QuantumHealing;