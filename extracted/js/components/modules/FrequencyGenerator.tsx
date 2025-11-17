import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Panel from '../UI/Panel';
import Button from '../UI/Button';
import { storageService } from '../../services/storageService';
import { FrequencyPreset } from '../../../types';
import { DB_STORE_NAMES, DEFAULT_FREQUENCY_PRESET } from '../../../constants';

const WAVEFORM_TYPES = ['sine', 'square', 'sawtooth'] as const;

const FrequencyGenerator: React.FC = () => {
  const [frequency, setFrequency] = useState<number>(DEFAULT_FREQUENCY_PRESET.frequencyHz);
  const [emissionIntensity, setEmissionIntensity] = useState<number>(DEFAULT_FREQUENCY_PRESET.emissionIntensity);
  const [waveformType, setWaveformType] = useState<(typeof WAVEFORM_TYPES)[number]>(DEFAULT_FREQUENCY_PRESET.waveformType);
  const [frequencyPresets, setFrequencyPresets] = useState<FrequencyPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [presetName, setPresetName] = useState<string>('');
  const [isEmitting, setIsEmitting] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadInitialData = useCallback(async () => {
    const presets = await storageService.getFrequencyPresets();
    setFrequencyPresets(presets.sort((a, b) => b.createdAt - a.createdAt));

    const lastActivePresetId = localStorage.getItem('frequencyGenLastActivePresetId');
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
      const existingPreset = frequencyPresets.find(p => p.id === selectedPresetId);
      const updatedPreset: FrequencyPreset = {
        id: selectedPresetId,
        name: presetName.trim(),
        frequencyHz: frequency,
        emissionIntensity: emissionIntensity,
        waveformType: waveformType,
        createdAt: existingPreset ? existingPreset.createdAt : Date.now(), // Preserve original creation time
      };
      storageService.saveFrequencyPreset(updatedPreset);
      setFrequencyPresets(prev => prev.map(p => p.id === selectedPresetId ? updatedPreset : p));
    }
  }, [frequency, emissionIntensity, waveformType, selectedPresetId, presetName, frequencyPresets]);


  const handleFrequencyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFrequency(parseInt(e.target.value));
  }, []);

  const handleIntensityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmissionIntensity(parseInt(e.target.value));
  }, []);

  const handleWaveformTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setWaveformType(e.target.value as (typeof WAVEFORM_TYPES)[number]);
  }, []);

  const handleToggleEmission = useCallback(() => {
    setIsEmitting(prev => !prev);
  }, []);

  const handleSavePreset = useCallback(async () => {
    if (!presetName.trim()) {
      alert('Preset name cannot be empty!');
      return;
    }
    const newPreset: FrequencyPreset = {
      id: uuidv4(),
      name: presetName.trim(),
      frequencyHz: frequency,
      emissionIntensity: emissionIntensity,
      waveformType: waveformType,
      createdAt: Date.now(),
    };
    await storageService.saveFrequencyPreset(newPreset);
    setFrequencyPresets(prev => [newPreset, ...prev].sort((a, b) => b.createdAt - a.createdAt));
    setSelectedPresetId(newPreset.id);
    localStorage.setItem('frequencyGenLastActivePresetId', newPreset.id);
    alert('Frequency preset saved!');
  }, [presetName, frequency, emissionIntensity, waveformType]);

  const loadPreset = useCallback((preset: FrequencyPreset) => {
    setPresetName(preset.name);
    setFrequency(preset.frequencyHz);
    setEmissionIntensity(preset.emissionIntensity);
    setWaveformType(preset.waveformType);
    setSelectedPresetId(preset.id);
    localStorage.setItem('frequencyGenLastActivePresetId', preset.id);
  }, []);

  const handleLoadPreset = useCallback((presetId: string) => {
    const preset = frequencyPresets.find(p => p.id === presetId);
    if (preset) {
      loadPreset(preset);
    }
  }, [frequencyPresets, loadPreset]);

  const handleDeletePreset = useCallback(async (presetId: string) => {
    if (window.confirm('Are you sure you want to delete this preset?')) {
      await storageService.deleteFrequencyPreset(presetId);
      setFrequencyPresets(prev => prev.filter(p => p.id !== presetId));
      if (selectedPresetId === presetId) {
        setPresetName('');
        setFrequency(DEFAULT_FREQUENCY_PRESET.frequencyHz);
        setEmissionIntensity(DEFAULT_FREQUENCY_PRESET.emissionIntensity);
        setWaveformType(DEFAULT_FREQUENCY_PRESET.waveformType);
        setSelectedPresetId('');
        localStorage.removeItem('frequencyGenLastActivePresetId');
      }
    }
  }, [selectedPresetId]);

  // Waveform visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = isEmitting ? `hsl(${frequency / 2}, 100%, 70%)` : 'rgba(0, 150, 255, 0.5)';
      ctx.shadowBlur = isEmitting ? emissionIntensity / 5 : 0;
      ctx.shadowColor = `hsl(${frequency / 2}, 100%, 50%)`;
      ctx.beginPath();

      const amplitude = (emissionIntensity / 100) * (canvas.height / 3);
      const wavelength = (1000 - frequency) / 1000 * (canvas.width / 2); // Higher freq = shorter wavelength
      const offsetY = canvas.height / 2;
      const time = Date.now() * 0.005; // for animation

      for (let x = 0; x < canvas.width; x++) {
        let y = offsetY;
        const angle = (x / wavelength) * 2 * Math.PI + time;

        switch (waveformType) {
          case 'sine':
            y = offsetY + amplitude * Math.sin(angle);
            break;
          case 'square':
            y = offsetY + amplitude * (Math.sin(angle) > 0 ? 1 : -1);
            break;
          case 'sawtooth':
            y = offsetY + amplitude * ((angle / (2 * Math.PI)) % 1 - 0.5) * 2;
            break;
          default:
            break;
        }

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animationFrameId);
  }, [frequency, emissionIntensity, waveformType, isEmitting]);

  const currentStatusText = useMemo(() => {
    return isEmitting ? (
      <span className="text-cyan-300 neon-text animate-pulse">EMITTING F_{frequency}Hz</span>
    ) : (
      <span className="text-blue-400">IDLE</span>
    );
  }, [isEmitting, frequency]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full p-4">
      <Panel title="FREQUENCY GENERATOR" className="flex flex-col">
        <h3 className="text-blue-200 text-lg mb-4 neon-text">Frequency Controls</h3>
        <div className="mb-6">
          <label htmlFor="frequency-slider" className="block text-gray-300 text-sm mb-2">Frequency ({frequency} Hz)</label>
          <input
            id="frequency-slider"
            type="range"
            min="1"
            max="1000"
            value={frequency}
            onChange={handleFrequencyChange}
            className="w-full h-2 bg-blue-700 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            style={{
              background: `linear-gradient(to right, #00BCD4 0%, #00BCD4 ${frequency / 10}%, #2C3E50 ${frequency / 10}%, #2C3E50 100%)`
            }}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="intensity-slider" className="block text-gray-300 text-sm mb-2">Emission Intensity ({emissionIntensity}%)</label>
          <input
            id="intensity-slider"
            type="range"
            min="0"
            max="100"
            value={emissionIntensity}
            onChange={handleIntensityChange}
            className="w-full h-2 bg-purple-700 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            style={{
              background: `linear-gradient(to right, #8A2BE2 0%, #8A2BE2 ${emissionIntensity}%, #2C3E50 ${emissionIntensity}%, #2C3E50 100%)`
            }}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="waveform-type" className="block text-gray-300 text-sm mb-2">Waveform Type</label>
          <select
            id="waveform-type"
            value={waveformType}
            onChange={handleWaveformTypeChange}
            className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            {WAVEFORM_TYPES.map(type => (
              <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
            ))}
          </select>
        </div>

        <Button onClick={handleToggleEmission} className="w-full mt-auto">
          {isEmitting ? 'STOP EMISSION' : 'START EMISSION'}
        </Button>
      </Panel>

      <Panel title="WAVEFORM VISUALIZER" className="flex flex-col">
        <h3 className="text-blue-200 text-lg mb-4 neon-text">Output Visualization</h3>
        <div
          className={`relative w-full aspect-video bg-gray-900 border-2 border-cyan-500 rounded flex items-center justify-center overflow-hidden
                     transition-all duration-300 ease-in-out
                     ${isEmitting ? 'shadow-lg shadow-cyan-400/80 aura-effect' : 'shadow-md shadow-blue-500/30'}`}
          style={{
            opacity: isEmitting ? 1 : 0.7,
            filter: `hue-rotate(${frequency / 2}deg) brightness(${emissionIntensity / 100 * 0.5 + 0.5})`,
          }}
        >
          <canvas ref={canvasRef} width="600" height="200" className="absolute inset-0 w-full h-full"></canvas>
          <div className="absolute inset-0 grid grid-cols-20 grid-rows-10 opacity-50 pointer-events-none">
            {[...Array(200)].map((_, i) => (
              <div
                key={i}
                className={`bg-blue-400 transition-opacity duration-300 ${isEmitting && Math.random() > 0.8 ? 'opacity-20 animate-pulse-fast' : 'opacity-0'}`}
                style={{ animationDelay: `${Math.random() * 2}s` }}
              ></div>
            ))}
          </div>
          <span className="absolute text-xl md:text-2xl font-bold text-gray-100 mix-blend-screen z-10">
            {currentStatusText}
          </span>
        </div>

        <h3 className="text-blue-200 text-lg mb-4 mt-6 neon-text">Preset Management</h3>
        <div className="mb-4">
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset Name (max 50 characters)"
            maxLength={50}
            className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200 focus:ring-blue-500 focus:border-blue-500 mb-2"
          />
          <Button onClick={handleSavePreset} className="w-full" disabled={!presetName.trim()}>SAVE PRESET</Button>
        </div>
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
          {frequencyPresets.length === 0 ? (
            <p className="text-gray-400 text-center">No presets saved.</p>
          ) : (
            <select
              value={selectedPresetId}
              onChange={(e) => handleLoadPreset(e.target.value)}
              className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200 mb-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>Load Preset</option>
              {frequencyPresets.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.name} ({preset.frequencyHz} Hz, {preset.waveformType})</option>
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

export default FrequencyGenerator;