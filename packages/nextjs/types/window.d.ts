import { EventEmitter } from "events";

interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeListener: (event: string, callback: (...args: any[]) => void) => void;
    isMetaMask?: boolean;
    isUniversalProfileExtension?: boolean;
  };
  lukso?: {
    on(event: string, callback: (...args: any[]) => void): void;
    removeListener(event: string, callback: (...args: any[]) => void): void;
    request(args: { method: string; params?: any[] }): Promise<any>;
    isConnected(): boolean;
    enable(): Promise<string[]>;
    selectedAddress?: string;
    chainId?: string;
    isLukso?: boolean;
  } & EventEmitter;
}
