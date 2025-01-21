"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ERC725, ERC725JSONSchema } from "@erc725/erc725.js";
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
}

const UniversalProfileContext = createContext<UniversalProfileContextType>({
  profile: null,
  loading: false,
  error: null,
  isUniversalProfile: false,
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

export const UniversalProfileProvider = ({ children, address }: { children: React.ReactNode; address?: string }) => {
  const [profile, setProfile] = useState<LSP3Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isUniversalProfile, setIsUniversalProfile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const publicClient = usePublicClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkAndFetchProfile = async () => {
      if (!mounted || !address || !publicClient) {
        setProfile(null);
        setIsUniversalProfile(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First check if the address is a contract
        const code = await publicClient.getBytecode({ address: address as `0x${string}` });
        const isContractAddress = code !== undefined && code !== "0x";
        if (!isContractAddress) {
          setIsUniversalProfile(false);
          setProfile(null);
          return;
        }

        // Check if contract supports ERC725Y interface
        const supportsERC725Y = await publicClient.readContract({
          address: address as `0x${string}`,
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
        const erc725 = new ERC725(LSP3ProfileSchema, address, "https://rpc.testnet.lukso.network");
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
  }, [mounted, address, publicClient]);

  if (!mounted) {
    return (
      <UniversalProfileContext.Provider
        value={{ profile: null, loading: true, error: null, isUniversalProfile: false }}
      >
        {children}
      </UniversalProfileContext.Provider>
    );
  }

  return (
    <UniversalProfileContext.Provider value={{ profile, loading, error, isUniversalProfile }}>
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
export const ClientUniversalProfile = ({ children, address }: { children: React.ReactNode; address?: string }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <UniversalProfileProvider address={address}>{children}</UniversalProfileProvider>;
};
