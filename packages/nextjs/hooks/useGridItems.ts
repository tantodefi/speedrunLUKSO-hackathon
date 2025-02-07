import { useCallback, useEffect, useState } from "react";
import { useUPProvider } from "../providers/UPProviderWrapper";

// Constants
const LSP3_PROFILE_KEY = "0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5";
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;
const CACHE_DURATION = 5 * 60 * 1000;
const LUKSO_IPFS_GATEWAY = "https://api.universalprofile.cloud/ipfs";

// Types
interface GridItem {
  url: string;
  metadata?: any;
}

interface ProfileValue {
  verification?: any;
  url: string;
  LSP3Profile?: {
    gridItems?: GridItem[];
  };
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

// Cache implementation
const cache: { [key: string]: CacheEntry } = {};

function getCachedData(key: string): any | null {
  const entry = cache[key];
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_DURATION) {
    delete cache[key];
    return null;
  }

  return entry.data;
}

function setCachedData(key: string, data: any): void {
  cache[key] = {
    data,
    timestamp: Date.now(),
  };
}

async function fetchIPFSJson(ipfsUrl: string): Promise<any> {
  const cacheKey = `ipfs:${ipfsUrl}`;
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    console.log("📦 Using cached IPFS data for:", ipfsUrl);
    return cachedData;
  }

  try {
    // Use LUKSO's IPFS gateway
    const httpUrl = ipfsUrl.replace("ipfs://", `${LUKSO_IPFS_GATEWAY}/`);
    console.log("🌐 Fetching IPFS data from:", httpUrl);

    const response = await fetch(httpUrl);
    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("📦 IPFS data fetched successfully:", {
      url: httpUrl,
      data: JSON.stringify(data, null, 2),
    });

    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    console.error("❌ IPFS fetch error:", {
      url: ipfsUrl,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

async function retryOperation<T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: any;
  let delay = INITIAL_RETRY_DELAY;

  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      if (error?.code === -32005) {
        console.log(`⏳ Rate limit hit, retrying in ${delay}ms... (${retries - i - 1} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

export function useGridItems() {
  const { erc725, account } = useUPProvider();
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGridItems = useCallback(async () => {
    console.log("🔄 Starting grid items fetch...");

    if (!erc725 || !account) {
      console.log("❌ UP Provider not ready:", {
        erc725: !!erc725 ? "✅" : "❌",
        account: account || "❌",
      });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("🔍 Fetching grid items for account:", account);

      const profileCacheKey = `profile:${account}`;
      let profileData = getCachedData(profileCacheKey);

      if (!profileData) {
        console.log("📡 Fetching fresh profile data...");
        profileData = await retryOperation(async () => {
          const data = await erc725.getData(LSP3_PROFILE_KEY);
          console.log("📄 Raw profile data:", JSON.stringify(data, null, 2));
          return data;
        });

        if (profileData) {
          console.log("💾 Caching profile data");
          setCachedData(profileCacheKey, profileData);
        }
      } else {
        console.log("📋 Using cached profile data:", JSON.stringify(profileData, null, 2));
      }

      if (!profileData?.value) {
        console.log("⚠️ No profile value found:", profileData);
        setGridItems([]);
        return;
      }

      const value = profileData.value as ProfileValue;
      console.log("📝 Profile value:", JSON.stringify(value, null, 2));

      if (value?.url) {
        try {
          const profileJson = await fetchIPFSJson(value.url);
          console.log("🎯 Profile metadata:", JSON.stringify(profileJson, null, 2));

          if (profileJson?.LSP3Profile?.gridItems) {
            const items = profileJson.LSP3Profile.gridItems;
            console.log("✨ Grid items found:", JSON.stringify(items, null, 2));
            setGridItems(items);
          } else {
            console.log("📭 No grid items in profile metadata:", profileJson);
            setGridItems([]);
          }
        } catch (parseErr) {
          console.error("🚫 Profile metadata parse error:", parseErr);
          setError("Failed to parse profile metadata");
        }
      } else {
        console.log("❌ No IPFS URL in profile value:", value);
        setGridItems([]);
      }
    } catch (err: any) {
      console.error("❌ Grid items fetch error:", {
        code: err.code,
        message: err.message,
        details: err,
      });

      const errorMessage =
        err.code === -32005
          ? "Rate limit exceeded. Please try again in a few moments."
          : `Failed to fetch grid items: ${err.message || "Unknown error"}`;
      setError(errorMessage);
      setGridItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [erc725, account]);

  useEffect(() => {
    console.log("🔄 Grid items effect triggered");
    fetchGridItems();
  }, [fetchGridItems]);

  return {
    gridItems,
    isLoading,
    error,
    refresh: fetchGridItems,
    hasItems: gridItems.length > 0,
  };
}
