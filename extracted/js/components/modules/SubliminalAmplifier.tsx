import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Panel from '../UI/Panel';
import Button from '../UI/Button';
import { storageService } from '../../services/storageService';
import { permissionsService } from '../../services/permissionsService';
import { AudioTrack, AmplifierSettings } from '../../../types';
import { DB_STORE_NAMES, DEFAULT_AMPLIFIER_SETTINGS } from '../../../constants';

const SubliminalAmplifier: React.FC = () => {
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [settings, setSettings] = useState<AmplifierSettings>(DEFAULT_AMPLIFIER_SETTINGS);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean>(false);
  const [micInputLevel, setMicInputLevel] = useState<number>(0);

  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadInitialData = useCallback(async () => {
    const savedTracks = await storageService.getAudioTracks();
    const savedSettings = await storageService.getAmplifierSettings();
    setAudioTracks(savedTracks);
    setSettings(savedSettings);
    setMicPermissionGranted(permissionsService.hasMicrophonePermission());
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    // Persist settings whenever they change
    storageService.saveAmplifierSettings(settings);
  }, [settings]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const id = uuidv4();
      const fileDataUrl = await storageService.fileToDataUrl(file);
      const newTrack: AudioTrack = { id, name: file.name, fileDataUrl, mimeType: file.type };

      // Cache the file itself (optional, if Data URL is too large for IndexedDB)
      // For this app, Data URL directly in IndexedDB is simpler for offline.
      // If files were massive, we'd cache the Blob and store a blob URL or ID in IndexedDB.
      // await storageService.cacheFile(id, file); // Example for caching raw blobs

      await storageService.saveAudioTrack(newTrack);
      setAudioTracks(prev => [...prev, newTrack]);

      setSettings(prev => {
        const newActiveTracks = [...prev.activeTracks];
        newActiveTracks[slotIndex] = id;
        return { ...prev, activeTracks: newActiveTracks };
      });
    }
    e.target.value = ''; // Clear file input
  }, [settings.activeTracks]);

  const handleRemoveTrack = useCallback(async (slotIndex: number) => {
    const trackIdToRemove = settings.activeTracks[slotIndex];
    if (trackIdToRemove) {
      // Don't delete from storage, just from active slot, as track can be reused
      // If truly deleting track permanently: await storageService.deleteAudioTrack(trackIdToRemove);
      // setAudioTracks(prev => prev.filter(t => t.id !== trackIdToRemove));
      setSettings(prev => {
        const newActiveTracks = [...prev.activeTracks];
        newActiveTracks[slotIndex] = null;
        return { ...prev, activeTracks: newActiveTracks };
      });
    }
  }, [settings.activeTracks]);

  const handleSlotTrackChange = useCallback((slotIndex: number, trackId: string) => {
    setSettings(prev => {
      const newActiveTracks = [...prev.activeTracks];
      newActiveTracks[slotIndex] = trackId;
      return { ...prev, activeTracks: newActiveTracks };
    });
  }, []);

  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleAuraExpansionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, auraExpansion: parseInt(e.target.value) }));
  }, []);

  const handleFrequencyFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, frequencyField: parseInt(e.target.value) }));
  }, []);

  const requestMic = useCallback(async () => {
    const granted = await permissionsService.requestMicrophonePermission();
    setMicPermissionGranted(granted);
  }, []);

  // Audio Context and Visualization Logic
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      if (analyserRef.current) {
        analyserRef.current.fftSize = 256;
      }
    }
  }, []);

  const connectAudioSource = useCallback((audioElement: HTMLAudioElement | null) => {
    if (audioElement && audioContextRef.current && analyserRef.current) {
      const source = audioContextRef.current.createMediaElementSource(audioElement);
      source.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination); // Connect analyser to speakers
    }
  }, []);

  const connectMicSource = useCallback(async () => {
    if (!micPermissionGranted) return;
    initAudioContext();
    if (audioContextRef.current && analyserRef.current && !micStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination); // Connect analyser to speakers (optional for mic monitor)
      } catch (error) {
        console.error("Error accessing microphone for visualization:", error);
        setMicPermissionGranted(false);
      }
    }
  }, [micPermissionGranted, initAudioContext]);

  const disconnectMicSource = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    initAudioContext();

    if (isPlaying) {
      // Connect all active audio tracks
      audioRefs.current.forEach((audioEl, index) => {
        if (audioEl && settings.activeTracks[index]) {
          audioEl.play().catch(e => console.error("Error playing audio:", e));
          connectAudioSource(audioEl);
        }
      });
    } else {
      audioRefs.current.forEach(audioEl => {
        if (audioEl) audioEl.pause();
      });
    }

    return () => {
      // Cleanup: Stop all audio, disconnect mic, and close audio context
      audioRefs.current.forEach(audioEl => {
        if (audioEl) audioEl.pause();
      });
      disconnectMicSource();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [isPlaying, settings.activeTracks, initAudioContext, connectAudioSource, disconnectMicSource]);

  const drawWaveform = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = `hsl(${settings.frequencyField * 2.5}, 100%, 50%)`; // Dynamic color based on freq field
    ctx.beginPath();

    const sliceWidth = canvas.width * 1.0 / bufferLength;
    let x = 0;

    let totalAmplitude = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * canvas.height / 2;

      totalAmplitude += Math.abs(v - 1); // Amplitude is 0-2, so subtract 1 to get -1 to 1 range, then abs.

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }
    setMicInputLevel(Math.min(100, Math.round((totalAmplitude / bufferLength) * 200))); // Scale to 0-100
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    animationFrameId.current = requestAnimationFrame(drawWaveform);
  }, [settings.frequencyField]);

  useEffect(() => {
    // Start/stop waveform drawing
    if (isPlaying || micStreamRef.current) { // Draw if playing or mic is active
      animationFrameId.current = requestAnimationFrame(drawWaveform);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      setMicInputLevel(0);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      // Mic source is already handled by the main useEffect cleanup
    };
  }, [isPlaying, drawWaveform]);

  const activeAudioTracks = useMemo(() => {
    return settings.activeTracks.map((trackId, index) => {
      const track = trackId ? audioTracks.find(t => t.id === trackId) : null;
      return (
        <div key={index} className="flex flex-col mb-4 p-3 bg-gray-700/50 border border-blue-600/50 rounded-md">
          <label className="block text-gray-300 text-sm mb-2">Audio Slot {index + 1}</label>
          {track ? (
            <div className="flex items-center justify-between bg-gray-600 p-2 rounded-md mb-2">
              <span className="text-blue-200 text-sm">{track.name}</span>
              <Button onClick={() => handleRemoveTrack(index)} variant="danger" className="py-1 px-3 text-xs">Remove</Button>
            </div>
          ) : (
            <>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => handleFileChange(e, index)}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/30 file:text-blue-200 hover:file:bg-blue-500/50 mb-2"
              />
              <select
                className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200 text-sm focus:ring-blue-500 focus:border-blue-500"
                value={settings.activeTracks[index] || ''}
                onChange={(e) => handleSlotTrackChange(index, e.target.value)}
              >
                <option value="" disabled>Or select existing track</option>
                {audioTracks.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </>
          )}
          <audio ref={el => audioRefs.current[index] = el} src={track?.fileDataUrl} loop preload="auto" className="hidden" />
        </div>
      );
    });
  }, [audioTracks, settings.activeTracks, handleFileChange, handleRemoveTrack, handleSlotTrackChange]);


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full p-4">
      <Panel title="SUBLIMINAL AMPLIFIER" className="flex flex-col">
        <div className="flex flex-col flex-grow overflow-hidden">
          <h3 className="text-blue-200 text-lg mb-4 neon-text">Audio Configuration</h3>
          <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
            {activeAudioTracks}
          </div>

          <div className="flex flex-col mt-4 pt-4 border-t border-blue-700/50">
            <h3 className="text-blue-200 text-lg mb-4 neon-text">Amplification Controls</h3>
            <div className="mb-4">
              <label htmlFor="aura-expansion" className="block text-gray-300 text-sm mb-2">Aura Expansion ({settings.auraExpansion})</label>
              <input
                id="aura-expansion"
                type="range"
                min="0"
                max="100"
                value={settings.auraExpansion}
                onChange={handleAuraExpansionChange}
                className="w-full h-2 bg-blue-700 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{
                  background: `linear-gradient(to right, #00BCD4 0%, #00BCD4 ${settings.auraExpansion}%, #2C3E50 ${settings.auraExpansion}%, #2C3E50 100%)`
                }}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="frequency-field" className="block text-gray-300 text-sm mb-2">Frequency Field ({settings.frequencyField})</label>
              <input
                id="frequency-field"
                type="range"
                min="0"
                max="100"
                value={settings.frequencyField}
                onChange={handleFrequencyFieldChange}
                className="w-full h-2 bg-blue-700 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{
                  background: `linear-gradient(to right, #8A2BE2 0%, #8A2BE2 ${settings.frequencyField}%, #2C3E50 ${settings.frequencyField}%, #2C3E50 100%)`
                }}
              />
            </div>
            <Button onClick={togglePlayback} className="w-full mt-auto" disabled={settings.activeTracks.every(t => t === null)}>
              {isPlaying ? 'PAUSE AMPLIFICATION' : 'START AMPLIFICATION'}
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="VISUALIZATION" className="flex flex-col">
        <h3 className="text-blue-200 text-lg mb-4 neon-text">Waveform + Aura Display</h3>
        <div
          className="relative w-full aspect-video bg-gray-900 border-2 border-cyan-500 rounded flex items-center justify-center overflow-hidden
                     transition-all duration-300 ease-in-out"
          style={{
            boxShadow: `0 0 ${settings.auraExpansion / 5}px rgba(0, 255, 255, ${settings.auraExpansion / 150})`,
            background: `radial-gradient(circle at center, rgba(0,255,255,${settings.frequencyField / 300}) 0%, rgba(0,0,0,0) 70%)`
          }}
        >
          <canvas ref={canvasRef} width="600" height="200" className="absolute inset-0 w-full h-full"></canvas>
          {!isPlaying && !micStreamRef.current && (
            <span className="text-blue-400 neon-text animate-pulse">NO AUDIO INPUT</span>
          )}
        </div>

        <h3 className="text-blue-200 text-lg mb-4 mt-6 neon-text">Energy Matrix Display</h3>
        <div className="grid grid-cols-5 gap-1 w-full p-2 bg-gray-900 border border-blue-700 rounded mb-4">
          {[...Array(25)].map((_, i) => (
            <div
              key={i}
              className={`w-full aspect-square bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-sm
                          transition-all duration-100 ease-in-out
                          ${Math.random() * 100 < (settings.frequencyField / 2 + settings.auraExpansion / 2) ? 'shadow-sm shadow-cyan-400/70 animate-pulse-fast' : ''}`}
              style={{
                animationDelay: `${Math.random() * 2}s`,
                opacity: `${(settings.frequencyField / 100) * 0.5 + (settings.auraExpansion / 100) * 0.5}`
              }}
            ></div>
          ))}
        </div>
        <div className="flex justify-between items-center text-sm mb-4">
          <span className="text-gray-300">Microphone Input Level:</span>
          <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden border border-blue-600">
            <div
              className="h-full bg-green-500 transition-all duration-100"
              style={{ width: `${micInputLevel}%` }}
            ></div>
          </div>
          <span className="text-cyan-400">{micInputLevel}%</span>
        </div>
        {!micPermissionGranted ? (
          <Button onClick={requestMic} className="w-full mt-auto">Request Microphone Access</Button>
        ) : (
          <Button onClick={micStreamRef.current ? disconnectMicSource : connectMicSource} className="w-full mt-auto">
            {micStreamRef.current ? 'Stop Mic Visualization' : 'Start Mic Visualization'}
          </Button>
        )}
      </Panel>
    </div>
  );
};

export default SubliminalAmplifier;