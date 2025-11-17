import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Panel from '../UI/Panel';
import Button from '../UI/Button';
import EnergyBar from '../UI/EnergyBar';
import { storageService } from '../../services/storageService';
import { permissionsService } from '../../services/permissionsService';
import { MantraSession, MantraRepetitionTarget } from '../../../types';
import { DB_STORE_NAMES } from '../../../constants';

const MantraSiddhi: React.FC = () => {
  const [name, setName] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [tob, setTob] = useState<string>('');
  const [ritualDescription, setRitualDescription] = useState<string>('');
  const [mantraText, setMantraText] = useState<string>('');
  const [requiredRepetitions, setRequiredRepetitions] = useState<MantraRepetitionTarget | number>(MantraRepetitionTarget.TenThousandEight);
  const [customRepetitions, setCustomRepetitions] = useState<number>(100);

  const [activeSession, setActiveSession] = useState<MantraSession | null>(null);
  const [currentRepetitions, setCurrentRepetitions] = useState<number>(0);
  const [mantraSessions, setMantraSessions] = useState<MantraSession[]>([]);

  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const lastPeakTimeRef = useRef<number>(0);

  const loadInitialData = useCallback(async () => {
    const sessions = await storageService.getMantraSessions();
    setMantraSessions(sessions.sort((a, b) => b.startedAt - a.startedAt));
    setMicPermissionGranted(permissionsService.hasMicrophonePermission());

    const lastActiveSessionId = localStorage.getItem('mantraSiddhiLastActiveSessionId');
    if (lastActiveSessionId) {
      const session = sessions.find(s => s.id === lastActiveSessionId);
      if (session && session.isActive) {
        // When loading, ensure the session is active.
        // If it was previously completed, loading it makes it active again for counting.
        setActiveSession({ ...session, isActive: true });
        setCurrentRepetitions(session.currentRepetitions);
        // Also load other session details into form fields
        setName(session.name);
        setDob(session.dateOfBirth || '');
        setTob(session.timeOfBirth || '');
        setRitualDescription(session.ritualDescription);
        setMantraText(session.mantraText);
        setRequiredRepetitions(session.requiredRepetitions);
        if (session.requiredRepetitions === MantraRepetitionTarget.Custom) {
          setCustomRepetitions(session.requiredRepetitions as number);
        } else {
          setCustomRepetitions(100);
        }
      }
    }
  }, []);

  useEffect(() => {
    loadInitialData();
    return () => {
      // Cleanup audio context on unmount
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      stopVoiceDetection();
    };
  }, [loadInitialData]);

  const stopVoiceDetection = useCallback(() => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend(); // Pause context, don't close completely to allow restart
    }
  }, []);

  // Use this memoized callback for ending a session.
  // It takes an optional finalRepetitions to ensure the most accurate count is saved.
  const endSession = useCallback(async (finalRepetitions?: number) => {
    if (!activeSession) return;
    stopVoiceDetection(); // Stop voice detection first

    const repsToSave = finalRepetitions !== undefined ? finalRepetitions : currentRepetitions;

    const completedSession = {
      ...activeSession,
      isActive: false,
      currentRepetitions: repsToSave,
      completedAt: Date.now(),
    };
    await storageService.saveMantraSession(completedSession);
    setMantraSessions(prev => prev.map(s => s.id === completedSession.id ? completedSession : s));
    setActiveSession(null);
    setCurrentRepetitions(0);
    localStorage.removeItem('mantraSiddhiLastActiveSessionId');
  }, [activeSession, currentRepetitions, stopVoiceDetection]); // Depend on currentRepetitions as fallback

  // Auto-save active session details whenever relevant state changes
  useEffect(() => {
    if (activeSession && activeSession.isActive) {
      const currentRequired = requiredRepetitions === MantraRepetitionTarget.Custom ? customRepetitions : requiredRepetitions;
      const updatedSession = {
        ...activeSession,
        name: name.trim() || `Mantra Session ${new Date(activeSession.startedAt).toLocaleDateString()}`,
        dateOfBirth: dob || undefined,
        timeOfBirth: tob || undefined,
        ritualDescription: ritualDescription.trim(),
        mantraText: mantraText.trim(),
        requiredRepetitions: currentRequired,
        currentRepetitions: currentRepetitions,
        // activeSession.log is handled by setActiveSession in incrementCounter
      };
      storageService.saveMantraSession(updatedSession);
      setMantraSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    }
  }, [
    currentRepetitions, activeSession, name, dob, tob, ritualDescription, mantraText,
    requiredRepetitions, customRepetitions
  ]);


  const startNewSession = useCallback(async () => {
    if (!mantraText.trim()) {
      alert('Mantra text cannot be empty!');
      return;
    }
    const required = requiredRepetitions === MantraRepetitionTarget.Custom ? customRepetitions : requiredRepetitions;
    if (isNaN(required) || required <= 0) {
      alert('Required repetitions must be a positive number.');
      return;
    }

    const newSession: MantraSession = {
      id: uuidv4(),
      name: name.trim() || `Mantra Session ${new Date().toLocaleDateString()}`,
      dateOfBirth: dob || undefined,
      timeOfBirth: tob || undefined,
      ritualDescription: ritualDescription.trim(),
      mantraText: mantraText.trim(),
      requiredRepetitions: required,
      currentRepetitions: 0,
      isActive: true,
      startedAt: Date.now(),
      log: [],
    };
    await storageService.saveMantraSession(newSession);
    setMantraSessions(prev => [newSession, ...prev].sort((a, b) => b.startedAt - a.startedAt));
    setActiveSession(newSession);
    setCurrentRepetitions(0);
    localStorage.setItem('mantraSiddhiLastActiveSessionId', newSession.id);
  }, [name, dob, tob, ritualDescription, mantraText, requiredRepetitions, customRepetitions]);

  const loadSession = useCallback(async (sessionId: string) => { // Make async
    const session = mantraSessions.find(s => s.id === sessionId);
    if (session) {
      if (activeSession && activeSession.id !== session.id) {
        // Automatically save and end current active session before loading new one
        await endSession(); // Await here for graceful state transition
      }
      setName(session.name);
      setDob(session.dateOfBirth || '');
      setTob(session.timeOfBirth || '');
      setRitualDescription(session.ritualDescription);
      setMantraText(session.mantraText);
      setRequiredRepetitions(session.requiredRepetitions);
      if (session.requiredRepetitions === MantraRepetitionTarget.Custom) {
        setCustomRepetitions(session.requiredRepetitions as number);
      } else {
        setCustomRepetitions(100); // Reset custom rep if not applicable
      }
      // When loading, ensure the session is active.
      // If it was previously completed, loading it makes it active again for counting.
      setActiveSession({ ...session, isActive: true });
      setCurrentRepetitions(session.currentRepetitions);
      localStorage.setItem('mantraSiddhiLastActiveSessionId', session.id);
    }
  }, [mantraSessions, activeSession, endSession]);


  const deleteSession = useCallback(async (sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      await storageService.deleteMantraSession(sessionId);
      setMantraSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setCurrentRepetitions(0);
        localStorage.removeItem('mantraSiddhiLastActiveSessionId');
      }
    }
  }, [activeSession, mantraSessions]);

  const incrementCounter = useCallback((type: 'tap' | 'voice' | 'manual') => {
    // Use functional update for activeSession to get the latest state
    setActiveSession(prevActive => {
      if (!prevActive) return null; // If no active session, do nothing

      const newLog = [...prevActive.log, { timestamp: Date.now(), type }];
      const updatedActiveSession = { ...prevActive, log: newLog };

      setCurrentRepetitions(prevCount => {
        const newCount = prevCount + 1;
        if (newCount >= updatedActiveSession.requiredRepetitions) {
          endSession(newCount); // Pass the final count to endSession
          alert('Mantra session completed!');
        }
        return newCount;
      });
      return updatedActiveSession; // Return the updated active session
    });
  }, [endSession]); // Dependencies: only endSession is needed here now. activeSession is accessed via functional update.

  const requestMic = useCallback(async () => {
    const granted = await permissionsService.requestMicrophonePermission();
    setMicPermissionGranted(granted);
  }, []);

  const startVoiceDetection = useCallback(async () => {
    if (!micPermissionGranted) {
      alert('Microphone permission is required for voice detection.');
      return;
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256; // Smaller FFT size for faster processing
    }

    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(micStreamRef.current);
      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(2048, 1, 1);

      scriptProcessorRef.current.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0); // inputData is Float32Array
        const dataArray = new Uint8Array(analyserRef.current!.fftSize);
        analyserRef.current!.getByteFrequencyData(dataArray); // Fills dataArray with byte frequency data

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;

        const currentTime = Date.now();
        const debounceTime = 500; // ms to prevent rapid counts

        if (average > 30 && (currentTime - lastPeakTimeRef.current > debounceTime)) { // Adjust threshold as needed
          incrementCounter('voice');
          lastPeakTimeRef.current = currentTime;
        }
      };

      mediaStreamSourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(audioContextRef.current.destination);
    } catch (error) {
      console.error("Error starting voice detection:", error);
      setMicPermissionGranted(false);
      alert('Failed to start voice detection. Ensure microphone access is granted.');
    }
  }, [micPermissionGranted, incrementCounter]);


  const progressPercentage = useMemo(() => {
    if (!activeSession) return 0;
    return (currentRepetitions / activeSession.requiredRepetitions) * 100;
  }, [currentRepetitions, activeSession]);

  const requiredRepetitionsDisplay = useMemo(() => {
    if (!activeSession) return 'N/A';
    return activeSession.requiredRepetitions === MantraRepetitionTarget.Custom
      ? customRepetitions
      : activeSession.requiredRepetitions;
  }, [activeSession, customRepetitions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full p-4">
      <Panel title="MANTRA SIDDHI SYSTEM" className="flex flex-col">
        <h3 className="text-blue-200 text-lg mb-4 neon-text">Activation Parameters</h3>
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200" placeholder="Session Name (max 100 characters)" />
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1">Date of Birth</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200" />
            </div>
            <div>
              <label className="block text-gray-300 text-sm mb-1">Time of Birth</label>
              <input type="time" value={tob} onChange={(e) => setTob(e.target.value)} className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-1">Ritual Description</label>
            <textarea value={ritualDescription} onChange={(e) => setRitualDescription(e.target.value)} rows={3} maxLength={1000} className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200" placeholder="Describe the ritual (max 1000 characters)"></textarea>
          </div>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-1">Mantra Text (Required)</label>
            <textarea value={mantraText} onChange={(e) => setMantraText(e.target.value)} rows={4} maxLength={500} className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200" placeholder="Enter mantra text (max 500 characters)"></textarea>
          </div>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm mb-1">Required Repetitions</label>
            <select
              value={requiredRepetitions}
              onChange={(e) => setRequiredRepetitions(parseInt(e.target.value))}
              className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200"
            >
              <option value={MantraRepetitionTarget.TenThousandEight}>{MantraRepetitionTarget.TenThousandEight.toLocaleString()}</option>
              <option value={MantraRepetitionTarget.TwentyThousand}>{MantraRepetitionTarget.TwentyThousand.toLocaleString()}</option>
              <option value={MantraRepetitionTarget.HundredThousand}>{MantraRepetitionTarget.HundredThousand.toLocaleString()}</option>
              <option value={MantraRepetitionTarget.Custom}>Custom</option>
            </select>
            {requiredRepetitions === MantraRepetitionTarget.Custom && (
              <input
                type="number"
                value={customRepetitions}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setCustomRepetitions(isNaN(val) ? 0 : val);
                }}
                min="1"
                max="1000000" // Added max attribute for custom repetitions
                className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200 mt-2"
                placeholder="Enter custom repetitions (min 1, max 1,000,000)"
              />
            )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-blue-700/50 flex justify-center">
          {!activeSession ? (
            <Button onClick={startNewSession} className="w-full" disabled={!mantraText.trim() || (requiredRepetitions === MantraRepetitionTarget.Custom && (isNaN(customRepetitions) || customRepetitions <= 0))}>START NEW SESSION</Button>
          ) : (
            <Button onClick={() => endSession()} variant="danger" className="w-full">END ACTIVE SESSION</Button>
          )}
        </div>
      </Panel>

      <Panel title="SESSION PROGRESS" className="flex flex-col">
        <h3 className="text-blue-200 text-lg mb-4 neon-text">Current Session Status</h3>
        {activeSession ? (
          <div className="flex flex-col flex-grow overflow-hidden">
            <p className="text-gray-300 mb-2">Mantra: <span className="text-cyan-400 font-bold">{activeSession.mantraText}</span></p>
            <p className="text-gray-300 mb-2">Target: <span className="text-blue-300">{requiredRepetitionsDisplay.toLocaleString()}</span></p>
            <p className="text-gray-300 mb-4">Current: <span className="text-green-400 font-bold text-xl">{currentRepetitions.toLocaleString()}</span></p>

            <EnergyBar value={currentRepetitions} max={activeSession.requiredRepetitions} label="Progress" className="mb-4" />

            <div className="flex justify-around mt-4 mb-4">
              <Button onClick={() => incrementCounter('tap')} className="w-[48%] py-3">TAP COUNTER</Button>
              {micStreamRef.current ? (
                <Button
                  onClick={stopVoiceDetection}
                  className="w-[48%] py-3"
                  variant={'danger'}
                >
                  STOP VOICE DET.
                </Button>
              ) : (
                micPermissionGranted ? (
                  <Button onClick={startVoiceDetection} className="w-[48%] py-3" variant="primary">START VOICE DET.</Button>
                ) : (
                  <Button onClick={requestMic} className="w-[48%] py-3" variant="secondary">REQUEST MIC</Button>
                )
              )}
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 mb-4">
              <h4 className="text-blue-200 text-md mb-2 neon-text">Activation Animation</h4>
              <div className={`relative w-full h-32 bg-gray-900 border-2 border-cyan-500 rounded flex items-center justify-center overflow-hidden
                         ${currentRepetitions > 0 ? 'shadow-lg shadow-cyan-400/80 aura-effect' : 'shadow-md shadow-blue-500/30'}`}
                style={{
                  background: `radial-gradient(circle at center, rgba(0,255,255,${progressPercentage / 300}) 0%, rgba(0,0,0,0) 70%)`
                }}
              >
                {currentRepetitions > 0 && (
                  <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 opacity-50">
                    {[...Array(100)].map((_, i) => (
                      <div
                        key={i}
                        className={`bg-blue-400 transition-opacity duration-300 ${Math.random() * 100 < progressPercentage / 5 ? 'opacity-20 animate-pulse-fast' : 'opacity-0'}`}
                        style={{ animationDelay: `${Math.random() * 2}s` }}
                      ></div>
                    ))}
                  </div>
                )}
                <span className={`relative z-10 text-2xl font-bold ${currentRepetitions > 0 ? 'text-cyan-200 neon-text animate-pulse' : 'text-gray-400'}`}>
                  {currentRepetitions > 0 ? 'ACTIVATING...' : 'IDLE'}
                </span>
              </div>
            </div>

            <h3 className="text-blue-200 text-lg mb-4 neon-text">History Log</h3>
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
              {activeSession.log.length === 0 ? (
                <p className="text-gray-400 text-center text-sm">No log entries for this session.</p>
              ) : (
                activeSession.log.map((entry, index) => (
                  <div key={index} className="bg-gray-700/50 p-1 rounded-sm text-xs mb-1 border border-blue-600/30">
                    <span className="text-blue-300">{new Date(entry.timestamp).toLocaleTimeString()}</span> - <span className="text-cyan-400">{entry.type.toUpperCase()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-center py-8">
            <p>No active session. Start a new one or load from history.</p>
          </div>
        )}
      </Panel>

      <Panel title="SESSION HISTORY" className="flex flex-col">
        <h3 className="text-blue-200 text-lg mb-4 neon-text">Saved Sessions</h3>
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
          {mantraSessions.length === 0 ? (
            <p className="text-gray-400 text-center">No mantra sessions saved.</p>
          ) : (
            <select
              value={activeSession?.id || ''}
              onChange={(e) => loadSession(e.target.value)}
              className="w-full p-2 bg-gray-700/60 border border-blue-600 rounded text-gray-200 mb-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>Load Session</option>
              {mantraSessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name} ({session.currentRepetitions}/{session.requiredRepetitions}) {session.isActive ? '[ACTIVE]' : (session.completedAt ? '[COMPLETED]' : '')}
                </option>
              ))}
            </select>
          )}
          {activeSession && (
            <Button onClick={() => deleteSession(activeSession.id)} variant="danger" className="w-full mt-2">
              DELETE CURRENT SESSION
            </Button>
          )}
        </div>
      </Panel>
    </div>
  );
};

export default MantraSiddhi;