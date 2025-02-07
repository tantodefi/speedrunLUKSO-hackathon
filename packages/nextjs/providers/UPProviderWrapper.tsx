"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { ERC725 } from "@erc725/erc725.js";
import Web3 from "web3";

// Extend Window interface to include lukso
declare global {
  interface Window {
    lukso:
      | {
          request: (args: { method: string }) => Promise<any>;
          on: (event: string, callback: (params: any) => void) => void;
          isLukso?: boolean;
        }
      | undefined;
  }
}

// Constants
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 3000;
const MAX_RETRY_DELAY = 15000;
const BACKOFF_FACTOR = 2;
const REQUEST_COOLDOWN = 2000;
const LUKSO_RPC_URLS = [
  process.env.NEXT_PUBLIC_LUKSO_RPC_URL || "https://rpc.lukso.gateway.fm",
  "https://rpc.testnet.lukso.network",
  "/api/rpc-proxy",
];

interface UPProviderContext {
  web3: Web3 | null;
  account: string | null;
  isLoading: boolean;
  error: string | null;
  erc725: ERC725 | null;
}

const UPProviderContext = createContext<UPProviderContext>({
  web3: null,
  account: null,
  isLoading: false,
  error: null,
  erc725: null,
});

export const useUPProvider = () => useContext(UPProviderContext);

interface UPProviderWrapperProps {
  children: ReactNode;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRateLimit<T>(operation: () => Promise<T>, retryCount = 0): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retryCount >= MAX_RETRIES) {
      throw error;
    }

    const baseDelay = Math.min(INITIAL_RETRY_DELAY * Math.pow(BACKOFF_FACTOR, retryCount), MAX_RETRY_DELAY);
    const jitteredDelay = baseDelay + Math.random() * REQUEST_COOLDOWN;

    await delay(jitteredDelay);
    return withRateLimit(operation, retryCount + 1);
  }
}

export function UPProviderWrapper({ children }: UPProviderWrapperProps) {
  const [providerState, setProviderState] = useState<UPProviderContext>({
    web3: null,
    account: null,
    isLoading: true,
    error: null,
    erc725: null,
  });

  useEffect(() => {
    let mounted = true;
    let currentProvider: any = null;

    const initializeProvider = async () => {
      try {
        // Check if we're in a browser environment
        if (typeof window === "undefined") {
          console.log("Not in browser environment, skipping provider initialization");
          return;
        }

        const lukso = window?.lukso;
        if (!lukso) {
          console.warn("LUKSO UP browser extension not detected");
          throw new Error("LUKSO UP browser extension not detected");
        }

        console.log("Initializing Web3 provider...");

        // Initialize Web3 with the LUKSO provider
        const web3 = new Web3(lukso as any);
        console.log("Web3 initialized");

        // Request account access with rate limit handling
        const accounts = await withRateLimit(async () => {
          const result = await lukso.request({ method: "eth_requestAccounts" });
          await delay(REQUEST_COOLDOWN); // Add cooldown between requests
          return result;
        });

        const account = accounts[0];
        if (!account) {
          throw new Error("No account selected");
        }

        console.log("Account connected:", account);

        // Try RPC URLs with rate limit handling
        for (const rpcUrl of LUKSO_RPC_URLS) {
          try {
            console.log("Attempting to connect to RPC:", rpcUrl);
            const provider = new web3.providers.HttpProvider(rpcUrl);

            // Test the connection with rate limit handling
            await withRateLimit(async () => {
              await web3.eth.getBlockNumber();
              await delay(REQUEST_COOLDOWN);
            });

            console.log("Successfully connected to RPC:", rpcUrl);
            currentProvider = provider;
            break;
          } catch (error) {
            console.warn(`Failed to connect to RPC ${rpcUrl}:`, error);
            continue;
          }
        }

        if (!currentProvider) {
          throw new Error("Failed to connect to any RPC endpoint");
        }

        // Create ERC725 instance with rate limit handling
        const erc725 = new ERC725([], account, currentProvider, {
          ipfsGateway: "https://api.universalprofile.cloud/ipfs",
        });

        if (mounted) {
          setProviderState({
            web3,
            account,
            isLoading: false,
            error: null,
            erc725,
          });

          // Set up event listeners
          lukso.on("accountsChanged", async (accounts: string[]) => {
            if (!mounted) return;
            const newAccount = accounts[0];

            if (!newAccount) {
              setProviderState(prev => ({
                ...prev,
                account: null,
                erc725: null,
                error: "No account selected",
              }));
              return;
            }

            try {
              // Update provider state with new account using rate limit handling
              await withRateLimit(async () => {
                const newErc725 = new ERC725([], newAccount, currentProvider, {
                  ipfsGateway: "https://api.universalprofile.cloud/ipfs",
                });

                if (mounted) {
                  setProviderState(prev => ({
                    ...prev,
                    account: newAccount,
                    erc725: newErc725,
                    error: null,
                  }));
                }
              });
            } catch (error: any) {
              console.error("Error updating account:", error);
              setProviderState(prev => ({
                ...prev,
                error: error?.message || "Failed to update account",
              }));
            }
          });

          lukso.on("chainChanged", () => {
            if (mounted) {
              window.location.reload();
            }
          });

          lukso.on("disconnect", () => {
            if (mounted) {
              setProviderState(prev => ({
                ...prev,
                account: null,
                erc725: null,
                error: "Disconnected from LUKSO network",
              }));
            }
          });
        }
      } catch (error: any) {
        console.error("Failed to initialize provider:", error);
        if (mounted) {
          setProviderState(prev => ({
            ...prev,
            isLoading: false,
            error: error?.message || "Failed to initialize provider",
          }));
        }
      }
    };

    initializeProvider();

    return () => {
      mounted = false;
      currentProvider = null;
    };
  }, []);

  return <UPProviderContext.Provider value={providerState}>{children}</UPProviderContext.Provider>;
}
