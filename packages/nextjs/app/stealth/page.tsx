"use client";

import { useCallback, useEffect, useState } from "react";
import { AnnouncementDetails } from "./_components/AnnouncementDetails";
import { StealthAddressGenerator } from "./_components/StealthAddressGenerator";
import { StealthBroadcastForm } from "./_components/StealthBroadcastForm";
import { StealthDebugPanel } from "./_components/StealthDebugPanel";
import { StealthRecoveryForm } from "./_components/StealthRecoveryForm";
import { keccak256, toHex } from "viem";
import type { Block } from "viem";
import { useAccount, useContractRead, usePublicClient, useWalletClient } from "wagmi";
import { useDeployedContractInfo, useScaffoldContract, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

// Constants
const LSP17_EXTENSION_PREFIX = "0xcee78b4094da860110960000";
const SCHEME_ID = 0n; // Using scheme 0 for basic stealth addresses

interface Announcement {
  schemeId: bigint;
  stealthAddress: `0x${string}`;
  caller: `0x${string}`;
  ephemeralPubKey: `0x${string}`;
  metadata: `0x${string}`;
  timestamp: number;
}

// Add ERC725Y ABI for Universal Profile
const ERC725Y_ABI = [
  {
    name: "getData",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "dataKey", type: "bytes32" }],
    outputs: [{ name: "dataValue", type: "bytes" }],
  },
  {
    name: "setData",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dataKey", type: "bytes32" },
      { name: "dataValue", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

// Add UP detection interface
interface AccountType {
  isUniversalProfile: boolean;
  isContract: boolean;
  isLoading: boolean;
}

const StealthPage = () => {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [isExtensionEnabled, setIsExtensionEnabled] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentStealthAddress, setCurrentStealthAddress] = useState<string | null>(null);
  const [currentEphemeralKey, setCurrentEphemeralKey] = useState<string | null>(null);
  const [currentViewTag, setCurrentViewTag] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>({
    isUniversalProfile: false,
    isContract: false,
    isLoading: true,
  });

  // Get contract info
  const { data: stealthExtensionContract, isLoading: isLoadingContract } =
    useDeployedContractInfo("LSP17StealthExtension");

  // Get the stealth extension contract for writing
  const { data: stealthExtensionContractWrite } = useScaffoldContract({
    contractName: "LSP17StealthExtension",
    walletClient,
  });

  // Get events
  const { data: events, isLoading: isLoadingEvents } = useScaffoldEventHistory({
    contractName: "LSP17StealthExtension",
    eventName: "Announcement",
    fromBlock: 0n,
  });

  // Process events into announcements
  useEffect(() => {
    if (!events) return;
    const newAnnouncements = events
      .filter(event => event.block !== null && event.args.schemeId !== undefined)
      .map(event => {
        if (!event.block) return null;
        const block = event.block as unknown as Block;
        if (!block?.timestamp) return null;
        return {
          schemeId: event.args.schemeId || 0n,
          stealthAddress: (event.args.stealthAddress || "0x") as `0x${string}`,
          caller: (event.args.caller || "0x") as `0x${string}`,
          ephemeralPubKey: (event.args.ephemeralPubKey || "0x") as `0x${string}`,
          metadata: (event.args.metadata || "0x") as `0x${string}`,
          timestamp: Number(block.timestamp),
        } satisfies Announcement;
      })
      .filter((a): a is Announcement => a !== null);
    setAnnouncements(newAnnouncements);
  }, [events]);

  // Universal Profile contract interactions
  const { data: extensionValue } = useContractRead({
    address: address as `0x${string}`,
    abi: ERC725Y_ABI,
    functionName: "getData",
    args: [
      stealthExtensionContract?.address
        ? LSP17_EXTENSION_PREFIX +
          keccak256(toHex("announce(uint256,address,bytes,bytes)")).slice(2, 10) +
          stealthExtensionContract.address.slice(2)
        : "0x0000000000000000000000000000000000000000000000000000000000000000",
    ],
  });

  // Check if extension is enabled
  const checkExtensionEnabled = useCallback(async () => {
    if (!extensionValue) return;
    setIsExtensionEnabled(extensionValue === "0x");
  }, [extensionValue]);

  useEffect(() => {
    checkExtensionEnabled();
  }, [checkExtensionEnabled]);

  // Check if the connected address is a Universal Profile
  useEffect(() => {
    const checkAccountType = async () => {
      if (!address || !publicClient) {
        setAccountType({
          isUniversalProfile: false,
          isContract: false,
          isLoading: false,
        });
        return;
      }

      try {
        setAccountType(prev => ({ ...prev, isLoading: true }));

        // First check if it's a contract
        const code = await publicClient.getBytecode({ address: address as `0x${string}` });
        const isContract = code !== undefined && code !== "0x";

        if (!isContract) {
          setAccountType({
            isUniversalProfile: false,
            isContract: false,
            isLoading: false,
          });
          addDebugLog(`Address ${address} is an EOA`);
          return;
        }

        addDebugLog(`Address ${address} is a contract`);

        // Try to detect Universal Profile in multiple ways
        let isUniversalProfile = false;

        // Method 1: Check interfaces directly
        try {
          const [supportsERC725Y, supportsLSP0] = await Promise.all([
            publicClient
              .readContract({
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
                args: ["0x2bd57b73"], // ERC725Y interface ID
              })
              .catch(() => false),
            publicClient
              .readContract({
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
                args: ["0x63cb749b"], // LSP0 (Universal Profile) interface ID
              })
              .catch(() => false),
          ]);

          addDebugLog(`Interface checks - ERC725Y: ${supportsERC725Y}, LSP0: ${supportsLSP0}`);
          if (supportsERC725Y && supportsLSP0) {
            isUniversalProfile = true;
          }
        } catch (err) {
          addDebugLog(`Error checking interfaces: ${err instanceof Error ? err.message : String(err)}`);
        }

        // Method 2: Try to read LSP3Profile data key
        if (!isUniversalProfile) {
          try {
            const LSP3_PROFILE_KEY = "0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5";
            const profileData = await publicClient.readContract({
              address: address as `0x${string}`,
              abi: ERC725Y_ABI,
              functionName: "getData",
              args: [LSP3_PROFILE_KEY],
            });
            addDebugLog(`Successfully read LSP3Profile data: ${profileData.slice(0, 10)}...`);
            isUniversalProfile = true;
          } catch (err) {
            addDebugLog(`Error reading LSP3Profile: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        // Method 3: Try to read owner
        if (!isUniversalProfile) {
          try {
            const owner = await publicClient.readContract({
              address: address as `0x${string}`,
              abi: [
                {
                  name: "owner",
                  type: "function",
                  stateMutability: "view",
                  inputs: [],
                  outputs: [{ name: "", type: "address" }],
                },
              ],
              functionName: "owner",
            });
            addDebugLog(`Successfully read owner: ${owner}`);
            isUniversalProfile = true;
          } catch (err) {
            addDebugLog(`Error reading owner: ${err instanceof Error ? err.message : String(err)}`);
          }
        }

        setAccountType({
          isUniversalProfile,
          isContract: true,
          isLoading: false,
        });

        addDebugLog(
          `Final determination: Address ${address} is a ${isUniversalProfile ? "Universal Profile" : "non-UP Contract"}`,
        );
      } catch (err) {
        console.error("Error checking account type:", err);
        setAccountType({
          isUniversalProfile: false,
          isContract: false,
          isLoading: false,
        });
        addDebugLog(`Error checking account type for ${address}: ${err instanceof Error ? err.message : String(err)}`);
      }
    };

    checkAccountType();
  }, [address, publicClient]);

  const addDebugLog = (log: string) => {
    setDebugLogs(prev => [...prev, `[${new Date().toISOString()}] ${log}`]);
  };

  const handleAddressGenerated = async (stealthAddress: string, pubKey: string, viewTag: string) => {
    addDebugLog(`Generated stealth address: ${stealthAddress}`);
    addDebugLog(`Ephemeral public key: ${pubKey}`);
    addDebugLog(`View tag: ${viewTag}`);
    setCurrentStealthAddress(stealthAddress);
    setCurrentEphemeralKey(pubKey);
    setCurrentViewTag(viewTag);
  };

  const handleDeployExtension = async () => {
    notification.info("Please deploy the contract using hardhat: yarn deploy");
    addDebugLog("Deployment should be done via hardhat: yarn deploy");
  };

  const enableStealthExtension = async () => {
    if (!address || !stealthExtensionContract?.address || !walletClient || !publicClient) {
      notification.error("Please connect your wallet and ensure contracts are deployed");
      return;
    }

    if (!accountType.isUniversalProfile) {
      notification.error("This operation requires a Universal Profile");
      addDebugLog("Failed to enable extension: Connected address is not a Universal Profile");
      return;
    }

    setIsEnabling(true);
    try {
      addDebugLog("Enabling LSP17StealthExtension on Universal Profile...");

      // LSP17 Extension data key format:
      // keccak256(LSP17Extension:["functionSelector"]["extension"])
      const announceSelector = keccak256(toHex("announce(uint256,address,bytes,bytes)")).slice(0, 10);
      const extensionBytes =
        `0x${LSP17_EXTENSION_PREFIX.slice(2)}${announceSelector.slice(2)}${stealthExtensionContract.address.slice(2)}` as const;
      const dataKey = keccak256(extensionBytes);
      const dataValue = "0x"; // Empty bytes value as per LSP17 spec

      addDebugLog(`Extension bytes: ${extensionBytes}`);
      addDebugLog(`Data key: ${dataKey}`);

      // First check if the extension is already enabled
      const currentValue = await publicClient.readContract({
        address: address as `0x${string}`,
        abi: ERC725Y_ABI,
        functionName: "getData",
        args: [dataKey],
      });

      if (currentValue === "0x") {
        addDebugLog("Extension is already enabled!");
        notification.success("Extension is already enabled!");
        setIsExtensionEnabled(true);
        return;
      }

      // Call setData on the Universal Profile
      const hash = await walletClient.writeContract({
        address: address as `0x${string}`,
        abi: ERC725Y_ABI,
        functionName: "setData",
        args: [dataKey, dataValue],
      });

      addDebugLog(`Sent transaction to enable extension: ${hash}`);

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });
      notification.success("Successfully enabled stealth extension!");
      addDebugLog("LSP17StealthExtension enabled successfully on Universal Profile");
      await checkExtensionEnabled();
    } catch (err) {
      console.error(err);
      // Check if the error indicates the extension is already enabled
      if (err instanceof Error && err.message.includes("already set in an identical way")) {
        addDebugLog("Extension is already enabled (detected from error)");
        notification.success("Extension is already enabled!");
        setIsExtensionEnabled(true);
      } else {
        notification.error("Failed to enable stealth extension");
        addDebugLog(`Error enabling extension: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      setIsEnabling(false);
    }
  };

  const announceStealthAddress = async () => {
    if (!currentStealthAddress || !currentEphemeralKey || !publicClient || !stealthExtensionContractWrite) {
      notification.error("Please generate a stealth address first");
      addDebugLog("Failed to announce: Missing required data or connections");
      return;
    }

    // For UPs, check if extension is enabled
    if (accountType.isUniversalProfile && !isExtensionEnabled) {
      notification.error("Please enable the stealth extension on your Universal Profile first");
      addDebugLog("Failed to announce: Extension not enabled on Universal Profile");
      return;
    }

    setIsAnnouncing(true);
    try {
      addDebugLog("\n=== Starting Announcement Process ===");
      addDebugLog(`1. Sender Type: ${accountType.isUniversalProfile ? "Universal Profile" : "EOA"}`);
      addDebugLog(`2. Stealth Address: ${currentStealthAddress}`);
      addDebugLog(`3. Ephemeral Public Key: ${currentEphemeralKey}`);
      addDebugLog(`4. View Tag: ${currentViewTag || "0x00"}`);

      if (accountType.isUniversalProfile) {
        addDebugLog("5. UP Flow: Using LSP17 Extension for announcement");
        addDebugLog(`   - Extension Status: Enabled`);
        addDebugLog(`   - Extension Address: ${stealthExtensionContractWrite.address}`);
      } else {
        addDebugLog("5. EOA Flow: Using direct contract call for announcement");
        addDebugLog(`   - Contract Address: ${stealthExtensionContractWrite.address}`);
      }

      addDebugLog("6. Preparing transaction parameters...");
      const params = [
        SCHEME_ID,
        currentStealthAddress as `0x${string}`,
        currentEphemeralKey as `0x${string}`,
        (currentViewTag || "0x00") as `0x${string}`,
      ] as const;
      addDebugLog(`   - Scheme ID: ${SCHEME_ID}`);
      addDebugLog(`   - Parameters prepared successfully`);

      addDebugLog("7. Sending announcement transaction...");
      const hash = await stealthExtensionContractWrite.write.announce(params);
      addDebugLog(`8. Transaction sent: ${hash}`);

      addDebugLog("9. Waiting for transaction confirmation...");
      await publicClient.waitForTransactionReceipt({ hash });
      addDebugLog("10. Transaction confirmed!");
      addDebugLog("=== Announcement Process Complete ===\n");

      notification.success("Successfully announced stealth address!");
    } catch (err) {
      console.error(err);
      notification.error("Failed to announce stealth address");
      addDebugLog(`❌ Error during announcement: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsAnnouncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-8 px-6 lg:px-10 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">Stealth Addresses</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">LSP17 Stealth Extension</h2>
              {isLoadingContract ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : stealthExtensionContract ? (
                <>
                  <p className="text-sm font-mono">Address: {stealthExtensionContract.address}</p>
                  <a
                    href={`/debug?address=${stealthExtensionContract.address}`}
                    className="text-sm text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Debug Contract →
                  </a>
                  {accountType.isUniversalProfile ? (
                    <>
                      <p className="text-sm mt-2">
                        Status:{" "}
                        {isExtensionEnabled ? (
                          <span className="text-success">Enabled</span>
                        ) : (
                          <span className="text-error">Not Enabled</span>
                        )}
                      </p>
                      {!isExtensionEnabled && (
                        <button
                          className={`btn btn-primary mt-4 ${isEnabling ? "loading" : ""}`}
                          onClick={enableStealthExtension}
                          disabled={isEnabling || !address}
                        >
                          {isEnabling ? "Enabling..." : "Enable Extension on UP"}
                        </button>
                      )}
                    </>
                  ) : accountType.isContract ? (
                    <>
                      <p className="text-sm mt-2 text-warning">
                        Warning: This address is a contract but not a Universal Profile. The stealth extension may not
                        work correctly.
                      </p>
                      <button
                        className="btn btn-warning mt-4"
                        onClick={() =>
                          notification.warning("Please use a Universal Profile to enable the stealth extension")
                        }
                      >
                        Requires Universal Profile
                      </button>
                    </>
                  ) : null}
                </>
              ) : (
                <div>
                  <p className="text-sm text-error mb-4">Contract not deployed</p>
                  <button className="btn btn-primary" onClick={handleDeployExtension} disabled={!address}>
                    Deploy LSP17StealthExtension
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Your Address</h2>
              {accountType.isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <p className="text-sm font-mono">{address || "Not connected"}</p>
                  <p className="text-sm">
                    Type:{" "}
                    {accountType.isUniversalProfile ? (
                      <span className="text-success">Universal Profile</span>
                    ) : accountType.isContract ? (
                      <span className="text-warning">Contract</span>
                    ) : (
                      <span className="text-info">EOA</span>
                    )}
                  </p>
                </>
              )}
            </div>
          </div>

          <StealthRecoveryForm />

          <StealthDebugPanel />
        </div>

        <div className="flex flex-col gap-6">
          <StealthAddressGenerator onAddressGenerated={handleAddressGenerated} onDebugLog={addDebugLog} />

          {currentStealthAddress && currentEphemeralKey && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">Current Stealth Address</h2>
                <p className="text-sm font-mono break-all">Address: {currentStealthAddress}</p>
                <p className="text-sm font-mono break-all">Ephemeral Key: {currentEphemeralKey}</p>
                <button
                  className={`btn btn-primary mt-4 ${isAnnouncing ? "loading" : ""}`}
                  onClick={announceStealthAddress}
                  disabled={isAnnouncing || !isExtensionEnabled}
                >
                  {isAnnouncing ? "Announcing..." : "Announce Address"}
                </button>
              </div>
            </div>
          )}

          <StealthBroadcastForm />

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Recent Announcements</h2>
              <div className="h-48 overflow-auto">
                {isLoadingEvents ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : announcements.length > 0 ? (
                  announcements.map((announcement, index) => <AnnouncementDetails key={index} {...announcement} />)
                ) : (
                  <p className="text-sm opacity-50">No announcements yet</p>
                )}
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Debug Logs</h2>
              <div className="h-48 overflow-auto bg-base-200 p-2 rounded-lg">
                {debugLogs.map((log, index) => (
                  <p key={index} className="text-xs font-mono whitespace-pre-wrap">
                    {log}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StealthPage;
