import { storageService } from './storageService';

class PermissionsService {
  constructor() {}

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // If successful, stop the tracks immediately as we only need permission, not continuous stream here.
      stream.getTracks().forEach(track => track.stop());
      storageService.setMicPermissionGranted(true);
      return true;
    } catch (error: any) {
      console.error("Microphone permission denied:", error);
      storageService.setMicPermissionGranted(false);
      // More specific error handling
      if (error.name === 'NotAllowedError') {
        alert("Microphone access was denied. Please enable it in your browser/device settings.");
      } else if (error.name === 'NotFoundError') {
        alert("No microphone found. Please ensure one is connected and enabled.");
      } else {
        alert(`Could not access microphone: ${error.message}`);
      }
      return false;
    }
  }

  hasMicrophonePermission(): boolean {
    return storageService.getMicPermissionGranted();
  }
}

export const permissionsService = new PermissionsService();
