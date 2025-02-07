"use client";

import { useEffect, useState } from "react";
import { useUPProvider } from "../../providers/UPProviderWrapper";
import { GridItem, GridState } from "./types";
import { ERC725, ERC725JSONSchema } from "@erc725/erc725.js";

// Constants
const RPC_URLS = [
  process.env.NEXT_PUBLIC_LUKSO_RPC_URL || "https://rpc.testnet.lukso.gateway.fm",
  "https://rpc.testnet.lukso.network",
  "/api/rpc-proxy",
];

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 3000;
const MAX_RETRY_DELAY = 15000;
const BACKOFF_FACTOR = 2;

// LSP12 Schema
const LSP12Schema: ERC725JSONSchema[] = [
  {
    name: "LSP12IssuedAssets[]",
    key: "0x7c8c3416d6cda87cd42c71ea1843df28ac4850354f988d55ee2eaa47b6dc05cd",
    keyType: "Array",
    valueType: "address",
    valueContent: "Address",
  },
];

// Add additional schema for LSP3 Profile
const LSP3ProfileSchema: ERC725JSONSchema[] = [
  {
    name: "LSP3Profile",
    key: "0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5",
    keyType: "Singleton",
    valueType: "bytes",
    valueContent: "URL",
  },
];

// Add LSP3 metadata schema
const LSP3MetadataSchema: ERC725JSONSchema[] = [
  {
    name: "LSP3Metadata",
    key: "0x37c92ca1c30efc8cc2916d49a0475e17c645ab053005e65aefe72a2588e947ec",
    keyType: "Singleton",
    valueType: "bytes",
    valueContent: "URL",
  },
];

// Grid Items Schema
const GridItemsSchema: ERC725JSONSchema[] = [
  {
    name: "GridItems[]",
    key: "0x467d37a9a23be65fb78b79ed3c2bb7a7b54ad2dd5ab74ac28dcc2315531ba9b2",
    keyType: "Array",
    valueType: "address",
    valueContent: "Address",
  },
  {
    name: "GridItemMetadata:<address>",
    key: "0xd06e3a4de9629a3a238930b8e4fe9b6a52a0d1b89edfa6e5d79f534812e7d7d1",
    keyType: "Mapping",
    valueType: "string",
    valueContent: "URL",
  },
  {
    name: "GridItemName:<address>",
    key: "0x7c14754bda4daa215575b45ddc7853785b495bda17b508c3602dae2547cc2638",
    keyType: "Mapping",
    valueType: "string",
    valueContent: "String",
  },
  {
    name: "GridItemDescription:<address>",
    key: "0x88bc0d06a19c1107295c25f0adc55d0d5fcaed8cefd589c48f68d02b040be06c",
    keyType: "Mapping",
    valueType: "string",
    valueContent: "String",
  },
  {
    name: "GridItemIcon:<address>",
    key: "0xc24bf1f2db576a42ea72f45a1af25d6bff9f2dad1e50b76cb2ae10312fb657a2",
    keyType: "Mapping",
    valueType: "string",
    valueContent: "String",
  },
];

// Add helper function for exponential backoff with jitter
const calculateDelay = (retryCount: number): number => {
  const baseDelay = Math.min(INITIAL_RETRY_DELAY * Math.pow(BACKOFF_FACTOR, retryCount), MAX_RETRY_DELAY);
  return baseDelay + Math.random() * 1000;
};

const wait = (ms: number): Promise<void> => new Promise((resolve: () => void) => setTimeout(resolve, ms));

const retryWithBackoff = async <T,>(
  operation: () => Promise<T>,
  retryCount = 0,
  onRetry?: (attempt: number, delay: number) => void,
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const typedError = error as Error;
    if (retryCount >= MAX_RETRIES) {
      throw new Error(`Max retries (${MAX_RETRIES}) reached: ${typedError.message}`);
    }

    const delay = calculateDelay(retryCount);
    if (onRetry) onRetry(retryCount + 1, delay);
    await wait(delay);
    return retryWithBackoff(operation, retryCount + 1, onRetry);
  }
};

interface RpcResponse {
  lsp12: any;
  grid: any;
  profile: any;
  metadata: any;
}

const fetchERC725Data = async (erc725Instance: ERC725, timeoutMs = 10000): Promise<[any, any, any, any]> => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("RPC request timeout")), timeoutMs),
  );

  return (await Promise.race([
    Promise.all([
      erc725Instance.getData("LSP12IssuedAssets[]"),
      erc725Instance.getData("GridItems[]"),
      erc725Instance.getData("LSP3Profile"),
      erc725Instance.getData("LSP3Metadata"),
    ]),
    timeoutPromise,
  ])) as [any, any, any, any];
};

export default function GridPage() {
  const { web3, account, isLoading: providerLoading, error: providerError } = useUPProvider();
  const [gridState, setGridState] = useState<GridState>({
    items: [],
    isLoading: true,
    error: undefined,
  });
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<RpcResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchGridItems = async () => {
      if (!web3 || !account) {
        console.log("Provider not ready:", { web3: !!web3, account });
        return;
      }

      try {
        console.log("Starting grid items fetch for account:", account);
        setGridState(prev => ({ ...prev, isLoading: true }));
        setRpcError(null);

        let erc725Instance: ERC725 | null = null;
        let connected = false;
        let results: [any, any, any, any] | null = null;

        for (const rpcUrl of RPC_URLS) {
          if (!isMounted) return;

          try {
            const provider = new web3.providers.HttpProvider(rpcUrl);

            results = await retryWithBackoff(
              async () => {
                erc725Instance = new ERC725(
                  [...GridItemsSchema, ...LSP12Schema, ...LSP3ProfileSchema, ...LSP3MetadataSchema],
                  account,
                  provider,
                  { ipfsGateway: "https://api.universalprofile.cloud/ipfs" },
                );

                return await fetchERC725Data(erc725Instance);
              },
              0,
              (attempt, delay) => {
                console.log(`Rate limit hit for ${rpcUrl}, waiting ${delay}ms before retry ${attempt}/${MAX_RETRIES}`);
              },
            );

            console.log("Successfully connected to RPC:", rpcUrl);
            connected = true;
            break;
          } catch (error) {
            const typedError = error as Error;
            console.warn(`Failed to connect to RPC ${rpcUrl}:`, typedError);
            if (rpcUrl === RPC_URLS[RPC_URLS.length - 1]) {
              throw typedError;
            }
          }
        }

        if (!connected || !erc725Instance || !results) {
          throw new Error("Failed to connect to any RPC endpoint");
        }

        const [lsp12Result, gridResult, profileResult, metadataResult] = results;

        // Store debug info
        setDebugInfo({
          lsp12: lsp12Result,
          grid: gridResult,
          profile: profileResult,
          metadata: metadataResult,
        });

        // Try multiple methods to find grid items
        let foundGridItems: GridItem[] = [];

        // 1. Try LSP3Metadata first (universalprofile.cloud's approach)
        console.log("Checking LSP3Metadata...");
        const metadataResultValue = metadataResult.value;
        if (metadataResultValue) {
          try {
            const metadataUrl = metadataResultValue.toString();
            console.log("Fetching LSP3Metadata from:", metadataUrl);
            const response = await fetch(metadataUrl.replace("ipfs://", "https://api.universalprofile.cloud/ipfs/"));
            const metadata = await response.json();
            console.log("LSP3Metadata:", metadata);

            if (metadata?.LSP3Profile?.gridItems) {
              console.log("Found grid items in LSP3Metadata");
              foundGridItems = metadata.LSP3Profile.gridItems.map((item: any) => ({
                id: item.id || item.address || "unknown",
                title: item.title || item.name || "Untitled App",
                url: item.url || "#",
                description: item.description || "",
                icon: item.icon || item.image || "",
              }));
            }
          } catch (error) {
            console.error("Error fetching LSP3Metadata:", error);
          }
        }

        // 2. If no items found, try LSP3Profile
        if (foundGridItems.length === 0) {
          console.log("Checking LSP3Profile...");
          const profileResultValue = profileResult.value;
          if (profileResultValue) {
            try {
              const profileUrl = profileResultValue.toString();
              console.log("Fetching profile from:", profileUrl);
              const response = await fetch(profileUrl.replace("ipfs://", "https://api.universalprofile.cloud/ipfs/"));
              const profileJson = await response.json();
              console.log("Profile data:", profileJson);

              if (profileJson?.LSP3Profile?.gridItems) {
                console.log("Found grid items in LSP3Profile");
                foundGridItems = profileJson.LSP3Profile.gridItems.map((item: any) => ({
                  id: item.id || item.address || "unknown",
                  title: item.title || item.name || "Untitled App",
                  url: item.url || "#",
                  description: item.description || "",
                  icon: item.icon || item.image || "",
                }));
              }
            } catch (error) {
              console.error("Error fetching profile:", error);
            }
          }
        }

        // 3. If still no items, try direct GridItems[]
        if (foundGridItems.length === 0) {
          console.log("Checking direct GridItems[]...");
          const gridResultValue = gridResult.value;
          const gridItemAddresses = (gridResultValue as string[]) || [];

          if (gridItemAddresses.length > 0) {
            console.log("Found direct grid items:", gridItemAddresses);
            foundGridItems = await Promise.all(
              gridItemAddresses.map(async (itemAddress: string) => {
                try {
                  const itemKeys = [
                    `0x74ac2555c10b9349e78f0000${itemAddress.toLowerCase().slice(2)}`,
                    `0x74ac2555c10b9349e78f0001${itemAddress.toLowerCase().slice(2)}`,
                    `0x74ac2555c10b9349e78f0002${itemAddress.toLowerCase().slice(2)}`,
                    `0x74ac2555c10b9349e78f0003${itemAddress.toLowerCase().slice(2)}`,
                  ];

                  if (!erc725Instance) {
                    throw new Error("ERC725 instance not initialized");
                  }

                  const itemData = await erc725Instance.getData(itemKeys);
                  return {
                    id: itemAddress,
                    title: itemData[1]?.value?.toString() || "Untitled App",
                    url: itemData[0]?.value?.toString() || "#",
                    description: itemData[2]?.value?.toString() || "",
                    icon: itemData[3]?.value?.toString() || "",
                  };
                } catch (error) {
                  console.error(`Error fetching grid item ${itemAddress}:`, error);
                  return {
                    id: itemAddress,
                    title: "Untitled App",
                    url: "#",
                    description: "Error loading app details",
                  };
                }
              }),
            );
          }
        }

        // Update state with found items
        setGridState({
          items: foundGridItems,
          isLoading: false,
          error:
            foundGridItems.length === 0
              ? "No grid items found. This Universal Profile has not added any apps to their grid yet."
              : undefined,
        });
      } catch (error) {
        console.error("Error fetching grid items:", error);
        setGridState(prev => ({
          ...prev,
          isLoading: false,
          error: "Failed to load grid items. Please try again later.",
        }));
      }
    };

    if (web3 && account) {
      fetchGridItems();
    }

    return () => {
      isMounted = false;
    };
  }, [web3, account]);

  if (providerError) {
    return (
      <div className="text-center p-4">
        <div className="alert alert-error">
          <span>Provider Error: {providerError}</span>
        </div>
      </div>
    );
  }

  if (rpcError) {
    return (
      <div className="text-center p-4">
        <div className="alert alert-error">
          <span>RPC Error: {rpcError}</span>
        </div>
      </div>
    );
  }

  if (gridState.isLoading || providerLoading) {
    return (
      <div className="text-center p-4">
        <div className="loading loading-spinner loading-lg"></div>
        <p className="mt-4">Loading grid items...</p>
      </div>
    );
  }

  if (gridState.error) {
    return (
      <div className="text-center p-4">
        <div className="alert alert-warning">
          <span>{gridState.error}</span>
        </div>
      </div>
    );
  }

  if (gridState.items.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="alert alert-info shadow-lg max-w-2xl mx-auto">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current flex-shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div>
              <h3 className="font-bold">No Grid Apps Found</h3>
              <div className="text-sm">
                {gridState.error || "This Universal Profile has not added any apps to their grid yet."}
              </div>
              {debugInfo && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm">Debug Information</summary>
                  <pre className="text-xs mt-2 p-2 bg-base-200 rounded">{JSON.stringify(debugInfo, null, 2)}</pre>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">My Grid Apps</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gridState.items.map(item => (
          <div key={item.id} className="border border-primary rounded-lg p-6 hover:shadow-lg transition-shadow">
            {item.icon && <img src={item.icon} alt={item.title} className="w-16 h-16 mb-4" />}
            <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
            {item.description && <p className="text-gray-600 mb-4">{item.description}</p>}
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Open App
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
