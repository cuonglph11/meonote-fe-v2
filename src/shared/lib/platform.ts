import { Capacitor } from '@capacitor/core';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatform(): string {
  return Capacitor.getPlatform();
}

export async function isLiveActivitySupported(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { Device } = await import('@capacitor/device');
    const info = await Device.getInfo();
    if (info.platform !== 'ios') return false;
    const [major, minor] = (info.osVersion || '0.0').split('.').map(Number);
    return major > 16 || (major === 16 && (minor || 0) >= 2);
  } catch {
    return false;
  }
}
