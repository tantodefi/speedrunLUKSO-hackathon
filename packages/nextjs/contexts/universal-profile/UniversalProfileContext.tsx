"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ERC725, ERC725JSONSchema } from "@erc725/erc725.js";
import { useAccount } from "wagmi";

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
}

const UniversalProfileContext = createContext<UniversalProfileContextType>({
  profile: null,
  loading: false,
  error: null,
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

export const UniversalProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const account = useAccount();
  const [profile, setProfile] = useState<LSP3Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      // Don't fetch if not mounted or no account or not connected
      if (!mounted || !account?.address || account?.status !== "connected") {
        setProfile(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const erc725 = new ERC725(LSP3ProfileSchema, account.address, "https://rpc.lukso.gateway.fm");
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
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [mounted, account?.address, account?.status]);

  // Don't render anything until mounted
  if (!mounted) return null;

  return (
    <UniversalProfileContext.Provider value={{ profile, loading, error }}>{children}</UniversalProfileContext.Provider>
  );
};

export const useUniversalProfile = () => {
  const context = useContext(UniversalProfileContext);
  if (context === undefined) {
    throw new Error("useUniversalProfile must be used within a UniversalProfileProvider");
  }
  return context;
};
