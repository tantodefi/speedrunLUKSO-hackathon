"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ERC725, ERC725JSONSchema } from "@erc725/erc725.js";
import { createClientUPProvider } from "@lukso/up-provider";
import { createWalletClient, custom } from "viem";
import { luksoTestnet } from "viem/chains";
import { usePublicClient } from "wagmi";

export interface LSP3Profile {
  name?: string;
  description?: string;
  profileImage?: Array<{ url: string; hash?: string }>;
  backgroundImage?: Array<{ url: string; hash?: string }>;
  tags?: string[];
}

interface UniversalProfileContextType {
  profile: LSP3Profile | null;
  loading: boolean;
  error: Error | null;
  isUniversalProfile: boolean;
  provider: any;
  client: any;
  chainId: number;
  accounts: Array<`0x${string}`>;
  contextAccounts: Array<`0x${string}`>;
  walletConnected: boolean;
  selectedAddress: `0x${string}` | null;
  setSelectedAddress: (address: `0x${string}` | null) => void;
}

const UniversalProfileContext = createContext<UniversalProfileContextType>({
  profile: null,
  loading: false,
  error: null,
  isUniversalProfile: false,
  provider: null,
  client: null,
  chainId: 0,
  accounts: [],
  contextAccounts: [],
  walletConnected: false,
  selectedAddress: null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setSelectedAddress: (address: `0x${string}` | null) => {
    console.warn("setSelectedAddress not implemented in default context");
  },
});

const LSP3ProfileSchema: ERC725JSONSchema[] = [
  {
    name: "LSP3Profile",
    key: "0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5",
    keyType: "Singleton",
    valueType: "bytes",
    valueContent: "VerifiableURI",
  },
];

// ERC725Y interface ID
const ERC725Y_INTERFACE_ID = "0x2bd57b73";

export const UniversalProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<LSP3Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isUniversalProfile, setIsUniversalProfile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const publicClient = usePublicClient();

  // UP Provider state
  const [provider, setProvider] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [chainId, setChainId] = useState<number>(0);
  const [accounts, setAccounts] = useState<Array<`0x${string}`>>([]);
  const [contextAccounts, setContextAccounts] = useState<Array<`0x${string}`>>([]);
  const [walletConnected, setWalletConnected] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<`0x${string}` | null>(null);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Initialize UP Provider
  useEffect(() => {
    let mounted = true;
    const maxRetries = 5;
    const baseDelay = 1000; // Start with 1 second

    const initializeProvider = async () => {
      try {
        if (typeof window === "undefined") return;

        // Don't set loading to true on retries to avoid UI flicker
        if (initializationAttempts === 0) {
          setLoading(true);
          setError(null);
          // Initial delay only on first attempt
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Check if UP extension is available
        if (!window.lukso) {
          // If extension is not found, we'll just render children without UP functionality
          console.log("UP Browser Extension not found. Proceeding without UP functionality.");
          setLoading(false);
          return;
        }

        const upProvider = createClientUPProvider();
        if (!mounted) return;

        // Test the provider by requesting permissions
        try {
          await upProvider.request({ method: "eth_requestAccounts" });
        } catch (e) {
          // If permission request fails, we'll still proceed but without UP functionality
          console.log("Permission request failed. Proceeding without UP functionality.");
          setLoading(false);
          return;
        }

        setProvider(upProvider);
        const walletClient = createWalletClient({
          chain: luksoTestnet,
          transport: custom(upProvider),
        });

        if (!mounted) return;
        setClient(walletClient);
        setLoading(false);
        setIsRateLimited(false);
        console.log("UP Provider initialized successfully");
      } catch (error: any) {
        console.error("Error initializing UP Provider:", error);

        // Handle rate limiting specifically
        if (error.message?.includes("rate limit") || isRateLimited) {
          setIsRateLimited(true);
          if (initializationAttempts < maxRetries) {
            const delay = Math.min(baseDelay * Math.pow(2, initializationAttempts), 10000); // Cap at 10 seconds
            console.log(`Rate limit hit, waiting ${delay}ms before retry ${initializationAttempts + 1}/${maxRetries}`);
            setTimeout(() => {
              if (mounted) {
                setInitializationAttempts(prev => prev + 1);
              }
            }, delay);
          } else {
            setError(new Error("Failed to initialize after maximum retries due to rate limiting"));
            setLoading(false);
          }
          return;
        }

        // For "No UP found" error, we'll proceed without UP functionality
        if (error.message?.includes("No UP found")) {
          console.log("No UP found. Proceeding without UP functionality.");
          setLoading(false);
          return;
        }

        // Handle other errors
        if (initializationAttempts < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(1.5, initializationAttempts), 5000); // Cap at 5 seconds
          console.log(
            `Retrying UP Provider initialization in ${delay}ms (${initializationAttempts + 1}/${maxRetries})`,
          );
          setTimeout(() => {
            if (mounted) {
              setInitializationAttempts(prev => prev + 1);
            }
          }, delay);
        } else {
          setError(error as Error);
          setLoading(false);
        }
      }
    };

    initializeProvider();

    return () => {
      mounted = false;
    };
  }, [initializationAttempts, isRateLimited]);

  // Initialize UP Provider state
  useEffect(() => {
    let mounted = true;

    const initializeState = async () => {
      try {
        if (!client || !provider) return;
        setLoading(true);

        const _chainId = (await client.getChainId()) as number;
        if (!mounted) return;
        setChainId(_chainId);

        const _accounts = (await client.getAddresses()) as Array<`0x${string}`>;
        if (!mounted) return;
        setAccounts(_accounts);

        const _contextAccounts = provider.contextAccounts;
        if (!mounted) return;
        setContextAccounts(_contextAccounts);
        setWalletConnected(_accounts.length > 0 && _contextAccounts.length > 0);
        setLoading(false);
      } catch (error) {
        console.error("Error initializing UP Provider state:", error);
        setError(error as Error);
        setLoading(false);
      }
    };

    initializeState();

    if (provider) {
      const accountsChanged = (_accounts: Array<`0x${string}`>) => {
        if (!mounted) return;
        setAccounts(_accounts);
        setWalletConnected(_accounts.length > 0 && contextAccounts.length > 0);
      };

      const contextAccountsChanged = (_accounts: Array<`0x${string}`>) => {
        if (!mounted) return;
        setContextAccounts(_accounts);
        setWalletConnected(accounts.length > 0 && _accounts.length > 0);
      };

      const chainChanged = (_chainId: number) => {
        if (!mounted) return;
        setChainId(_chainId);
      };

      provider.on("accountsChanged", accountsChanged);
      provider.on("chainChanged", chainChanged);
      provider.on("contextAccountsChanged", contextAccountsChanged);

      return () => {
        mounted = false;
        provider.removeListener("accountsChanged", accountsChanged);
        provider.removeListener("contextAccountsChanged", contextAccountsChanged);
        provider.removeListener("chainChanged", chainChanged);
      };
    }
  }, [client, provider, accounts.length, contextAccounts.length]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkAndFetchProfile = async () => {
      if (!mounted || !publicClient) {
        setProfile(null);
        setIsUniversalProfile(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Use the first account from the accounts array as the default address
        const defaultAddress = accounts[0];
        if (!defaultAddress) {
          setIsUniversalProfile(false);
          setProfile(null);
          return;
        }

        // First check if the address is a contract
        const code = await publicClient.getBytecode({ address: defaultAddress });
        const isContractAddress = code !== undefined && code !== "0x";
        if (!isContractAddress) {
          setIsUniversalProfile(false);
          setProfile(null);
          return;
        }

        // Check if contract supports ERC725Y interface
        const supportsERC725Y = await publicClient.readContract({
          address: defaultAddress,
          abi: [
            {
              name: "supportsInterface",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "interfaceId", type: "bytes4" }],
              outputs: [{ name: "", type: "bool" }],
            },
          ],
          functionName: "supportsInterface",
          args: [ERC725Y_INTERFACE_ID],
        });

        if (!supportsERC725Y) {
          setIsUniversalProfile(false);
          setProfile(null);
          return;
        }

        setIsUniversalProfile(true);

        // Now fetch the profile data
        const erc725 = new ERC725(LSP3ProfileSchema, defaultAddress, "https://rpc.testnet.lukso.network");
        const profileData = await erc725.getData();
        const rawMetadata = profileData?.find(data => data.name === "LSP3Profile")?.value;

        if (rawMetadata && typeof rawMetadata === "string") {
          try {
            const jsonData = JSON.parse(rawMetadata);
            if (jsonData && typeof jsonData === "object" && "LSP3Profile" in jsonData) {
              setProfile(jsonData.LSP3Profile);
            } else {
              setProfile(null);
            }
          } catch (e) {
            console.error("Error parsing profile metadata:", e);
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err as Error);
        setProfile(null);
        setIsUniversalProfile(false);
      } finally {
        setLoading(false);
      }
    };

    checkAndFetchProfile();
  }, [mounted, publicClient, accounts]);

  if (!mounted) {
    return (
      <UniversalProfileContext.Provider
        value={{
          profile: null,
          loading: true,
          error: null,
          isUniversalProfile: false,
          provider: null,
          client: null,
          chainId: 0,
          accounts: [],
          contextAccounts: [],
          walletConnected: false,
          selectedAddress: null,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          setSelectedAddress: (address: `0x${string}` | null) => {
            console.warn("setSelectedAddress not implemented in unmounted state");
          },
        }}
      >
        {children}
      </UniversalProfileContext.Provider>
    );
  }

  return (
    <UniversalProfileContext.Provider
      value={{
        profile,
        loading,
        error,
        isUniversalProfile,
        provider,
        client,
        chainId,
        accounts,
        contextAccounts,
        walletConnected,
        selectedAddress,
        setSelectedAddress,
      }}
    >
      {children}
    </UniversalProfileContext.Provider>
  );
};

export const useUniversalProfile = () => {
  const context = useContext(UniversalProfileContext);
  if (context === undefined) {
    throw new Error("useUniversalProfile must be used within a UniversalProfileProvider");
  }
  return context;
};

// Client-side wrapper component
export const ClientUniversalProfile = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <UniversalProfileProvider>{children}</UniversalProfileProvider>;
};
