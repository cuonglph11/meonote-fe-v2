import { registerPlugin } from '@capacitor/core';

export interface KeychainPlugin {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<{ success: boolean }>;
  remove(options: { key: string }): Promise<{ success: boolean }>;
}

const Keychain = registerPlugin<KeychainPlugin>('Keychain');

export default Keychain;
