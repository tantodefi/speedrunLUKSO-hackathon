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
import { useChainId, useSwitchChain } from "wagmi";
import { useDeployedContractInfo, useScaffoldContract, useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { luksoTestnet } from "~~/utils/scaffold-eth/chains";

// Constants
const LSP17_EXTENSION_PREFIX = "0xcee78b4094da860110960000";
const SCHEME_ID = 0n; // Using scheme 0 for basic stealth addresses

// Add LSP6 error signature
const LSP6_ERROR_SIGNATURE = "0xf292052a"; // LSP6ExecutionNotAuthorized

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
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
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

  const addDebugLog = useCallback((log: string) => {
    setDebugLogs(prev => [...prev, `[${new Date().toISOString()}] ${log}`]);
  }, []);

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

      // Try multiple methods to detect a Universal Profile
      try {
        // Method 1: Check LSP0 interface support
        let isUP = false;
        try {
          const supportsLSP0 = await publicClient.readContract({
            address,
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
            args: ["0x63cb749b"],
          });
          isUP = Boolean(supportsLSP0);
        } catch {
          // Method 2: Check LSP0 data key
          try {
            const lsp0Data = await publicClient.readContract({
              address,
              abi: ERC725Y_ABI,
              functionName: "getData",
              args: ["0x0cfc51aec37c55a4d0b1a65c6255c4bf2fbdf6277f3cc0730c45b828b6db8b47"],
            });
            isUP = lsp0Data !== "0x" && lsp0Data !== undefined;
          } catch {
            // Method 3: Check for owner function
            try {
              await publicClient.readContract({
                address,
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
              isUP = true;
            } catch {
              isUP = false;
            }
          }
        }

        setAccountType({ isUniversalProfile: isUP, isContract: true, isLoading: false });
        if (isUP) {
          addDebugLog("Successfully detected Universal Profile");
        }
      } catch (e) {
        console.error("Error checking UP:", e);
        setAccountType({ isUniversalProfile: false, isContract: true, isLoading: false });
      }
    } catch (e) {
      console.error("Error checking account type:", e);
      setAccountType({ isUniversalProfile: false, isContract: false, isLoading: false });
    }
  }, [address, publicClient, addDebugLog]);

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

      // Check if it's an LSP6 permission error
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes(LSP6_ERROR_SIGNATURE)) {
        notification.error("Permission denied. Make sure you have the right permissions on your Universal Profile.");
      } else {
        notification.error("Failed to enable stealth extension. Check if you have the right permissions.");
      }
    } finally {
      setIsEnabling(false);
    }
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
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold">Stealth Addresses</h1>
        <p className="text-sm opacity-80">
          Stealth addresses enable private, non-interactive transactions on LUKSO.{" "}
          <a
            href="https://eips.ethereum.org/EIPS/eip-5564"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            For more info
          </a>
        </p>
      </div>

      {chainId !== luksoTestnet.id && (
        <div className="alert alert-warning shadow-lg">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current flex-shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="font-bold">Testnet Only Feature</h3>
              <div className="text-xs">Stealth addresses are currently only supported on LUKSO Testnet.</div>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => switchChain?.({ chainId: luksoTestnet.id })}>
              Switch to Testnet
            </button>
          </div>
        </div>
      )}

      <StealthInstructions isUniversalProfile={accountType.isUniversalProfile} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Your Address</h2>
            {accountType.isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-mono">{address || "Not connected"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Type:</span>
                    {accountType.isUniversalProfile ? (
                      <span className="badge badge-success">Universal Profile</span>
                    ) : accountType.isContract ? (
                      <span className="badge badge-warning">Contract</span>
                    ) : (
                      <span className="badge badge-info">EOA</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Stealth Address Combinations</h2>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Sender</th>
                    <th>Recipient</th>
                    <th>Process</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>EOA</td>
                    <td>EOA</td>
                    <td>Basic stealth transfer, direct announcement</td>
                  </tr>
                  <tr>
                    <td>UP</td>
                    <td>EOA</td>
                    <td>Announcement through UP&apos;s LSP17 extension</td>
                  </tr>
                  <tr>
                    <td>UP</td>
                    <td>UP</td>
                    <td>UP-to-UP transfer with LSP17 extension</td>
                  </tr>
                  <tr>
                    <td>EOA</td>
                    <td>UP</td>
                    <td>Basic announcement to UP&apos;s stealth address</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

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
