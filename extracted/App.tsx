import React, { useState, useEffect, useCallback } from 'react';
import Panel from './js/components/UI/Panel';
import Button from './js/components/UI/Button';
import HUDOverlay from './js/components/UI/HUDOverlay';
import WelcomeModal from './js/components/UI/WelcomeModal'; // Changed import from Disclaimer to WelcomeModal
import Loader from './js/components/UI/Loader';
import RadionicsSimulator from './js/components/modules/RadionicsSimulator';
import SubliminalAmplifier from './js/components/modules/SubliminalAmplifier';
import SubliminalMaker from './js/components/modules/SubliminalMaker';
import QuantumHealing from './js/components/modules/QuantumHealing';
import FrequencyGenerator from './js/components/modules/FrequencyGenerator';
import MantraSiddhi from './js/components/modules/MantraSiddhi';
import { storageService } from './js/services/storageService';
import { ModuleType, AppSettings } from './types';
import { APP_NAME, DEFAULT_APP_SETTINGS, STORAGE_KEYS, WELCOME_TEXT } from './constants';

const App: React.FC = () => {
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);

  const loadAppSettings = useCallback(async () => {
    setIsLoading(true);
    const settings = storageService.getAppSettings();
    setAppSettings(settings);

    const welcomeMessageShown = storageService.getWelcomeMessageShown();
    if (!welcomeMessageShown) {
      setShowWelcomeModal(true);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAppSettings();
  }, [loadAppSettings]);

  useEffect(() => {
    // Persist settings whenever they change
    if (!isLoading) {
      storageService.saveAppSettings(appSettings);
    }
  }, [appSettings, isLoading]);

  const handleModuleChange = useCallback((module: ModuleType) => {
    setAppSettings(prev => ({ ...prev, activeModule: module }));
  }, []);

  const handleCloseWelcomeModal = useCallback(() => {
    setShowWelcomeModal(false);
    storageService.setWelcomeMessageShown(true);
  }, []);

  const renderModule = () => {
    switch (appSettings.activeModule) {
      case ModuleType.Radionics:
        return <RadionicsSimulator />;
      case ModuleType.SubliminalAmplifier:
        return <SubliminalAmplifier />;
      case ModuleType.SubliminalMaker:
        return <SubliminalMaker />;
      case ModuleType.QuantumHealing:
        return <QuantumHealing />;
      case ModuleType.FrequencyGenerator:
        return <FrequencyGenerator />;
      case ModuleType.MantraSiddhi:
        return <MantraSiddhi />;
      case ModuleType.Settings:
        return (
          <Panel title="SYSTEM SETTINGS" className="h-full w-full max-w-lg mx-auto p-4">
            <h3 className="text-blue-200 text-lg mb-4 neon-text">General</h3>
            <div className="mb-4">
              <span className="block text-gray-300 text-sm mb-2">Welcome Message:</span>
              <div className="flex items-center justify-between bg-gray-700/50 p-2 rounded border border-blue-600/50">
                <span className="text-gray-200">{storageService.getWelcomeMessageShown() ? 'Shown' : 'Not Shown'}</span>
                <Button onClick={() => setShowWelcomeModal(true)} variant="secondary">
                  View Welcome
                </Button>
              </div>
            </div>
            <div className="mb-4">
              <span className="block text-gray-300 text-sm mb-2">Microphone Permission:</span>
              <div className="flex items-center justify-between bg-gray-700/50 p-2 rounded border border-blue-600/50">
                <span className="text-gray-200">{storageService.getMicPermissionGranted() ? 'Granted' : 'Denied'}</span>
                <Button onClick={() => {
                    localStorage.removeItem(STORAGE_KEYS.MIC_PERMISSION_GRANTED); // Reset permission status
                    alert('Microphone permission status reset. The app will ask again when needed.');
                }} variant="secondary">
                  Reset Permission
                </Button>
              </div>
            </div>
             <div className="mb-4">
              <h3 className="text-blue-200 text-lg mb-4 neon-text">About</h3>
                <p className="text-gray-400 text-sm">
                  {WELCOME_TEXT}
                </p>
            </div>
            <div className="mb-4">
              <h3 className="text-blue-200 text-lg mb-4 neon-text">Creator & Support</h3>
                <p className="text-gray-400 text-sm mb-2">
                  Created by: <span className="text-cyan-400">jhondurd3n</span>
                </p>
                <p className="text-gray-400 text-sm mb-2">
                  If you enjoy this app and wish to support its continued development or buy the creator a coffee,
                  any donation is greatly appreciated!
                </p>
                <p className="text-gray-400 text-sm">
                  PayPal: <span className="text-green-400">jhondur3n@gmail.com</span>
                </p>
            </div>
          </Panel>
        );
      default:
        return <RadionicsSimulator />;
    }
  };

  if (isLoading) {
    return <Loader isLoading={true} message="INITIALIZING SYSTEM..." />;
  }

  return (
    <div className="relative h-screen w-screen flex flex-col bg-gray-900 font-mono text-gray-100 overflow-hidden">
      <WelcomeModal isOpen={showWelcomeModal} onClose={handleCloseWelcomeModal} />

      <HUDOverlay position="top-left">
        <div className="flex flex-col space-y-1">
          <span className="text-cyan-300">{APP_NAME}</span>
          <span>[STATUS // ONLINE]</span>
          <span>[MODULE // {appSettings.activeModule.toUpperCase()}]</span>
        </div>
      </HUDOverlay>
      <HUDOverlay position="bottom-right">
        <div className="flex flex-col items-end space-y-1">
          <span>[{new Date().toLocaleDateString()}]</span>
          <span>[{new Date().toLocaleTimeString()}]</span>
        </div>
      </HUDOverlay>

      {/* Top Navigation */}
      <nav className="flex-shrink-0 bg-gray-800/80 backdrop-blur-sm border-b border-blue-700/50 shadow-lg shadow-blue-500/20 py-2 px-4 flex flex-wrap justify-center gap-2 md:gap-4 z-10">
        {Object.values(ModuleType)
            // Fix: Removed filter for non-existent ModuleType.Disclaimer
            .map(module => (
          <Button
            key={module}
            onClick={() => handleModuleChange(module)}
            variant={appSettings.activeModule === module ? 'primary' : 'secondary'}
            className="text-xs md:text-sm px-3 py-1 md:px-4 md:py-2"
          >
            {module.replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
          </Button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow p-2 md:p-4 overflow-hidden relative">
        <div className="absolute inset-0 solo-leveling-gradient pointer-events-none opacity-20"></div> {/* Background effect */}
        {renderModule()}
      </main>

      {/* Footer / Persistent Controls (Optional - can add global controls here) */}
      <footer className="flex-shrink-0 bg-gray-800/80 backdrop-blur-sm border-t border-blue-700/50 shadow-lg shadow-blue-500/20 py-2 px-4 flex justify-center z-10">
        <p className="text-gray-400 text-xs md:text-sm">
          {APP_NAME} - Fictional Simulation. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default App;