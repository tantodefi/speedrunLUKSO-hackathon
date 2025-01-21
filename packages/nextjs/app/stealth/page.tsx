"use client";

import { useCallback, useEffect, useState } from "react";
import { AnnouncementDetails } from "./_components/AnnouncementDetails";
import { StealthAddressGenerator } from "./_components/StealthAddressGenerator";
import { StealthBroadcastForm } from "./_components/StealthBroadcastForm";
import { StealthDebugPanel } from "./_components/StealthDebugPanel";
import { StealthInstructions } from "./_components/StealthInstructions";
import { StealthRecoveryForm } from "./_components/StealthRecoveryForm";
import { keccak256, toHex } from "viem";
import type { Block } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
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
  // Move all hooks to the top
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { data: stealthExtensionContract, isLoading: isLoadingContract } =
    useDeployedContractInfo("LSP17StealthExtension");
  const { data: stealthExtensionContractWrite } = useScaffoldContract({
    contractName: "LSP17StealthExtension",
    walletClient,
  });
  const { data: events, isLoading: isLoadingEvents } = useScaffoldEventHistory({
    contractName: "LSP17StealthExtension",
    eventName: "Announcement",
    fromBlock: BigInt(0),
    blockData: true,
    filters: {},
    transactionData: true,
    receiptData: true,
  });

  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [isExtensionEnabled, setIsExtensionEnabled] = useState(false);
  const [stealthAnnouncements, setStealthAnnouncements] = useState<Announcement[]>([]);
  const [currentStealthAddress, setCurrentStealthAddress] = useState<string | null>(null);
  const [currentEphemeralKey, setCurrentEphemeralKey] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>({
    isUniversalProfile: false,
    isContract: false,
    isLoading: true,
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
    setStealthAnnouncements(newAnnouncements);
  }, [events]);

  // Check if the account is a Universal Profile
  const checkAccountType = useCallback(async () => {
    if (!address || !publicClient) {
      setAccountType({ isUniversalProfile: false, isContract: false, isLoading: false });
      return;
    }

    try {
      const code = await publicClient.getBytecode({ address });
      const isContract = code !== undefined && code !== "0x";

      if (!isContract) {
        setAccountType({ isUniversalProfile: false, isContract: false, isLoading: false });
        return;
      }

      // Check if it's a Universal Profile by trying to call getData
      try {
        await publicClient.readContract({
          address,
          abi: ERC725Y_ABI,
          functionName: "getData",
          args: [keccak256(toHex(LSP17_EXTENSION_PREFIX))],
        });
        setAccountType({ isUniversalProfile: true, isContract: true, isLoading: false });
      } catch (e) {
        setAccountType({ isUniversalProfile: false, isContract: true, isLoading: false });
      }
    } catch (e) {
      console.error("Error checking account type:", e);
      setAccountType({ isUniversalProfile: false, isContract: false, isLoading: false });
    }
  }, [address, publicClient]);

  // Check account type on mount and when address changes
  useEffect(() => {
    checkAccountType();
  }, [checkAccountType]);

  // Check if the stealth extension is enabled for Universal Profiles
  useEffect(() => {
    const checkExtensionEnabled = async () => {
      if (!address || !publicClient || !accountType.isUniversalProfile) {
        setIsExtensionEnabled(false);
        return;
      }

      try {
        const result = await publicClient.readContract({
          address,
          abi: ERC725Y_ABI,
          functionName: "getData",
          args: [keccak256(toHex(LSP17_EXTENSION_PREFIX))],
        });

        setIsExtensionEnabled(result !== "0x" && result !== undefined);
      } catch (e) {
        console.error("Error checking extension:", e);
        setIsExtensionEnabled(false);
      }
    };

    checkExtensionEnabled();
  }, [address, publicClient, accountType.isUniversalProfile]);

  // Enable stealth extension for Universal Profiles
  const enableStealthExtension = async () => {
    if (!stealthExtensionContract?.address || !walletClient || !address || !publicClient) {
      notification.error("Contract or wallet not ready");
      return;
    }

    setIsEnabling(true);
    try {
      const { request } = await publicClient.simulateContract({
        address,
        abi: ERC725Y_ABI,
        functionName: "setData",
        args: [keccak256(toHex(LSP17_EXTENSION_PREFIX)), toHex(stealthExtensionContract.address)],
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      notification.success("Stealth extension enabled!");
      setIsExtensionEnabled(true);
    } catch (e) {
      console.error("Error enabling extension:", e);
      notification.error("Failed to enable stealth extension");
    } finally {
      setIsEnabling(false);
    }
  };

  const addDebugLog = (log: string) => {
    setDebugLogs(prev => [...prev, `[${new Date().toISOString()}] ${log}`]);
  };

  const handleAddressGenerated = async (stealthAddress: string, pubKey: string, viewTag: string) => {
    addDebugLog(`Generated stealth address: ${stealthAddress}`);
    addDebugLog(`Ephemeral public key: ${pubKey}`);
    addDebugLog(`View tag: ${viewTag}`);
    setCurrentStealthAddress(stealthAddress);
    setCurrentEphemeralKey(pubKey);
  };

  const handleDeployExtension = async () => {
    notification.info("Please deploy the contract using hardhat: yarn deploy");
    addDebugLog("Deployment should be done via hardhat: yarn deploy");
  };

  const announceStealthAddress = async () => {
    if (
      !stealthExtensionContractWrite ||
      !walletClient ||
      !address ||
      !publicClient ||
      !currentStealthAddress ||
      !currentEphemeralKey
    ) {
      notification.error("Contract, wallet, or stealth data not ready");
      return;
    }

    setIsAnnouncing(true);
    try {
      const { request } = await publicClient.simulateContract({
        address: stealthExtensionContractWrite.address,
        abi: stealthExtensionContractWrite.abi,
        functionName: "announce",
        args: [SCHEME_ID, currentStealthAddress as `0x${string}`, currentEphemeralKey as `0x${string}`, "0x"],
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      notification.success("Successfully announced stealth address!");
      addDebugLog(`Announced stealth address: ${currentStealthAddress}`);
    } catch (err) {
      console.error(err);
      notification.error("Failed to announce stealth address");
      addDebugLog(`Error announcing stealth address: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsAnnouncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-8 px-6 lg:px-10 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-4">Stealth Addresses</h1>

      <StealthInstructions isUniversalProfile={accountType.isUniversalProfile} />

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
                ) : stealthAnnouncements.length > 0 ? (
                  stealthAnnouncements.map((announcement, index) => (
                    <AnnouncementDetails key={index} {...announcement} />
                  ))
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
