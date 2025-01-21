"use client";

import { useCallback, useEffect, useState } from "react";
import { AnnouncementDetails } from "./_components/AnnouncementDetails";
import { StealthAddressGenerator } from "./_components/StealthAddressGenerator";
import { StealthBroadcastForm } from "./_components/StealthBroadcastForm";
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

// Add LSP0 (ERC725Account) ABI for getting owner
const LSP0_ABI = [
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

// Add UP detection interface
interface AccountType {
  isUniversalProfile: boolean;
  isContract: boolean;
  isLoading: boolean;
}

// Add LSP6 Key Manager ABI
const LSP6_ABI = [
  {
    name: "hasPermissions",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "caller", type: "address" },
      { name: "permissions", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "executeRelayCall",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "signature", type: "bytes" },
      { name: "nonce", type: "uint256" },
      { name: "validityTimestamps", type: "bytes32" },
      { name: "payload", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bytes" }],
  },
] as const;

// Update permission constants with the correct LSP6 permission bits
const PERMISSIONS = {
  SETDATA: "0x0000000000000000000000000000000000000000000000000000000000000002",
  // Add more permissions as needed
} as const;

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
  const [currentViewTag, setCurrentViewTag] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType>({
    isUniversalProfile: false,
    isContract: false,
    isLoading: true,
  });
  const [isCheckingAnnouncements, setIsCheckingAnnouncements] = useState(false);
  const [hasSetDataPermission, setHasSetDataPermission] = useState(false);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const [isGrantingPermissions, setIsGrantingPermissions] = useState(false);
  const [upOwner, setUpOwner] = useState<string | null>(null);
  const [isCheckingOwner, setIsCheckingOwner] = useState(false);

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
  const checkAccountType = useCallback(
    async (address: string | undefined): Promise<AccountType> => {
      if (!address || !publicClient) {
        return { isContract: false, isUniversalProfile: false, isLoading: false };
      }

      try {
        // First check if it's a contract
        const code = await publicClient.getBytecode({ address: address as `0x${string}` });
        const isContract = code !== undefined && code !== "0x";

        if (!isContract) {
          return { isContract: false, isUniversalProfile: false, isLoading: false };
        }

        try {
          // Try to call owner() function which all UPs must implement
          const universalProfile = {
            address: address as `0x${string}`,
            abi: LSP0_ABI,
          };

          await publicClient.readContract({
            ...universalProfile,
            functionName: "owner",
          });

          // If we get here, it implements the owner function, so it's likely a UP
          return { isContract: true, isUniversalProfile: true, isLoading: false };
        } catch (err) {
          console.log("Error checking UP interface:", err);
          // If we can't verify UP interface, assume it's just a contract
          return { isContract: true, isUniversalProfile: false, isLoading: false };
        }
      } catch (err) {
        console.log("Error checking account type:", err);
        // On RPC errors, assume it might be a UP to allow interaction
        return { isContract: true, isUniversalProfile: true, isLoading: false };
      }
    },
    [publicClient],
  );

  // Check account type on mount and when address changes
  useEffect(() => {
    if (address) {
      checkAccountType(address).then(setAccountType);
    }
  }, [checkAccountType, address]);

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
    setCurrentViewTag(viewTag);
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
      addDebugLog(`With ephemeral public key: ${currentEphemeralKey}`);
      if (currentViewTag) {
        addDebugLog(`View tag: ${currentViewTag}`);
      }
    } catch (err) {
      console.error(err);
      notification.error("Failed to announce stealth address");
      addDebugLog(`Error announcing stealth address: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsAnnouncing(false);
    }
  };

  // Add function to manually check for announcements
  const checkForAnnouncements = async () => {
    if (!publicClient || !stealthExtensionContract) {
      notification.error("Contract or wallet not ready");
      return;
    }

    setIsCheckingAnnouncements(true);
    try {
      const latestBlock = await publicClient.getBlockNumber();
      const events = await publicClient.getLogs({
        address: stealthExtensionContract.address as `0x${string}`,
        event: {
          name: "Announcement",
          type: "event",
          inputs: [
            { name: "schemeId", type: "uint256", indexed: false },
            { name: "stealthAddress", type: "address", indexed: true },
            { name: "ephemeralPubKey", type: "bytes", indexed: false },
            { name: "metadata", type: "bytes", indexed: false },
            { name: "caller", type: "address", indexed: true },
          ],
        },
        fromBlock: latestBlock - BigInt(1000),
        toBlock: latestBlock,
      });

      const newAnnouncements = events
        .map(event => ({
          schemeId: event.args.schemeId || 0n,
          stealthAddress: (event.args.stealthAddress || "0x") as `0x${string}`,
          caller: (event.args.caller || "0x") as `0x${string}`,
          ephemeralPubKey: (event.args.ephemeralPubKey || "0x") as `0x${string}`,
          metadata: (event.args.metadata || "0x") as `0x${string}`,
          timestamp: Date.now() / 1000,
        }))
        .filter((a): a is Announcement => a !== null);

      if (newAnnouncements.length > 0) {
        setStealthAnnouncements(prev => [...newAnnouncements, ...prev]);
        notification.success(`Found ${newAnnouncements.length} new announcements`);
      } else {
        notification.info("No new announcements found");
      }
    } catch (error) {
      console.error("Error checking announcements:", error);
      notification.error("Failed to check for announcements");
    } finally {
      setIsCheckingAnnouncements(false);
    }
  };

  // Add function to check permissions
  const checkPermissions = useCallback(async () => {
    if (!address || !publicClient || !accountType.isUniversalProfile) {
      setHasSetDataPermission(false);
      return;
    }

    setIsCheckingPermissions(true);
    try {
      const result = await publicClient.readContract({
        address,
        abi: LSP6_ABI,
        functionName: "hasPermissions",
        args: [address, PERMISSIONS.SETDATA],
      });

      setHasSetDataPermission(result);
      if (!result) {
        addDebugLog("Address does not have SETDATA permission");
      }
    } catch (e) {
      console.error("Error checking permissions:", e);
      setHasSetDataPermission(false);
    } finally {
      setIsCheckingPermissions(false);
    }
  }, [address, publicClient, accountType.isUniversalProfile, addDebugLog]);

  // Check permissions when account type changes
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions, accountType]);

  // Add function to get UP owner
  const checkUpOwner = useCallback(async () => {
    if (!address || !publicClient || !accountType.isUniversalProfile) {
      setUpOwner(null);
      return;
    }

    setIsCheckingOwner(true);
    try {
      const owner = await publicClient.readContract({
        address,
        abi: LSP0_ABI,
        functionName: "owner",
      });

      setUpOwner(owner);
      addDebugLog(`UP owner address: ${owner}`);
    } catch (e) {
      console.error("Error getting UP owner:", e);
      setUpOwner(null);
    } finally {
      setIsCheckingOwner(false);
    }
  }, [address, publicClient, accountType.isUniversalProfile, addDebugLog]);

  // Check owner when account type changes
  useEffect(() => {
    checkUpOwner();
  }, [checkUpOwner]);

  // Add function to grant permissions
  const grantSetDataPermission = async () => {
    if (!address || !walletClient || !publicClient) {
      notification.error("Wallet not ready");
      return;
    }

    setIsGrantingPermissions(true);
    try {
      // Encode the grantPermissions function call
      const grantPermissionsData = {
        operationType: 1n, // CALL
        target: address,
        value: 0n,
        data: `0x${[
          // grantPermissions function selector
          "8d5e5c2c",
          // pad address to 32 bytes
          address.slice(2).padStart(64, "0"),
          // pad permission to 32 bytes
          PERMISSIONS.SETDATA.slice(2).padStart(64, "0"),
        ].join("")}` as `0x${string}`,
      };

      // Call the UP contract directly
      const { request } = await publicClient.simulateContract({
        address,
        abi: [
          {
            name: "execute",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "operationType", type: "uint256" },
              { name: "target", type: "address" },
              { name: "value", type: "uint256" },
              { name: "data", type: "bytes" },
            ],
            outputs: [{ name: "", type: "bytes" }],
          },
        ],
        functionName: "execute",
        args: [
          grantPermissionsData.operationType,
          grantPermissionsData.target,
          grantPermissionsData.value,
          grantPermissionsData.data,
        ],
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });

      notification.success("SETDATA permission granted!");
      addDebugLog(`Granted SETDATA permission to address: ${address}`);

      // Recheck permissions
      await checkPermissions();
    } catch (e) {
      console.error("Error granting permission:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes(LSP6_ERROR_SIGNATURE)) {
        notification.error("Permission denied. Make sure you're using the UP's controller address.");
      } else {
        notification.error("Failed to grant permission. Check if you have the right permissions.");
      }
      addDebugLog(`Error granting permission: ${errorMessage}`);
    } finally {
      setIsGrantingPermissions(false);
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

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">How to Use Stealth Addresses</h2>
          {accountType.isUniversalProfile ? (
            <div className="steps steps-vertical">
              <div className="step step-primary">
                <span>
                  1. Grant SETDATA Permission to your address (if using a different address than the UP controller)
                </span>
              </div>
              <div className="step step-primary">
                <span>2. Enable LSP17 Stealth Extension on your Universal Profile</span>
              </div>
              <div className="step step-primary">
                <span>3. Generate a new stealth address for your recipient</span>
              </div>
              <div className="step step-primary">
                <span>4. Announce the stealth address using your Universal Profile</span>
              </div>
              <div className="step step-primary">
                <span>5. Send funds to the generated stealth address</span>
              </div>
              <div className="step">
                <span>6. Recipient can scan for and recover funds using their private key</span>
              </div>
            </div>
          ) : (
            <div className="steps steps-vertical">
              <div className="step step-primary">
                <span>1. Generate a new stealth address for your recipient</span>
              </div>
              <div className="step step-primary">
                <span>2. Announce the stealth address using the LSP17 contract</span>
              </div>
              <div className="step step-primary">
                <span>3. Send funds to the generated stealth address</span>
              </div>
              <div className="step">
                <span>4. Recipient can scan for and recover funds using their private key</span>
              </div>
            </div>
          )}
        </div>
      </div>

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
                      <div className="flex items-center gap-1">
                        <span className="badge badge-sm badge-primary">UP</span>
                        <span className="text-xs text-base-content/70">Universal Profile</span>
                      </div>
                    ) : accountType.isContract ? (
                      <span className="badge badge-sm">Contract</span>
                    ) : (
                      <span className="badge badge-sm">EOA</span>
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
              <h2 className="card-title">Send Stealth Payments</h2>
              {accountType.isUniversalProfile ? (
                <div className="steps steps-vertical">
                  <div className="step step-primary">
                    <div className="flex flex-col items-start">
                      <span>1. Enable LSP17 Stealth Extension</span>
                      {!isExtensionEnabled && (
                        <button
                          className={`btn btn-sm btn-primary mt-2 ${isEnabling ? "loading" : ""}`}
                          onClick={enableStealthExtension}
                          disabled={isEnabling || !address}
                        >
                          {isEnabling ? "Enabling..." : "Enable Extension"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="step step-primary">
                    <div className="flex flex-col items-start w-full">
                      <span>2. Generate Stealth Address</span>
                      <StealthAddressGenerator onAddressGenerated={handleAddressGenerated} onDebugLog={addDebugLog} />
                      {currentStealthAddress && currentEphemeralKey ? (
                        <div className="mt-2 w-full">
                          <div className="bg-base-200 p-4 rounded-lg space-y-2">
                            <div>
                              <span className="text-sm font-semibold">Stealth Address:</span>
                              <p className="text-sm font-mono break-all">{currentStealthAddress}</p>
                            </div>
                            <div>
                              <span className="text-sm font-semibold">Ephemeral Public Key:</span>
                              <p className="text-sm font-mono break-all">{currentEphemeralKey}</p>
                            </div>
                            {currentViewTag && (
                              <div>
                                <span className="text-sm font-semibold">View Tag:</span>
                                <p className="text-sm font-mono break-all">{currentViewTag}</p>
                              </div>
                            )}
                          </div>
                          <button
                            className={`btn btn-sm btn-primary mt-4 ${isAnnouncing ? "loading" : ""}`}
                            onClick={announceStealthAddress}
                            disabled={isAnnouncing || !isExtensionEnabled}
                          >
                            {isAnnouncing ? "Announcing..." : "Announce Address"}
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-sm btn-disabled mt-2">Generate Address First</button>
                      )}
                    </div>
                  </div>
                  <div className="step">
                    <div className="flex flex-col items-start">
                      <span>3. Send Funds</span>
                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text">Amount (LYX)</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Enter amount to send"
                          className="input input-bordered w-full"
                        />
                        <button className="btn btn-primary mt-2">Send Funds</button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="steps steps-vertical">
                  <div className="step step-primary">
                    <div className="flex flex-col items-start">
                      <span>1. Generate Stealth Address</span>
                      <StealthAddressGenerator onAddressGenerated={handleAddressGenerated} onDebugLog={addDebugLog} />
                    </div>
                  </div>
                  <div className="step step-primary">
                    <div className="flex flex-col items-start">
                      <span>2. Announce Stealth Address</span>
                      {currentStealthAddress && currentEphemeralKey ? (
                        <button
                          className={`btn btn-sm btn-primary mt-2 ${isAnnouncing ? "loading" : ""}`}
                          onClick={announceStealthAddress}
                          disabled={isAnnouncing}
                        >
                          {isAnnouncing ? "Announcing..." : "Announce Address"}
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-disabled mt-2" disabled={true}>
                          Generate Address First
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="step">
                    <div className="flex flex-col items-start">
                      <span>3. Send Funds</span>
                      <StealthBroadcastForm />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">LSP17 Stealth Extension</h2>
              {isLoadingContract ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : stealthExtensionContract ? (
                <>
                  <p className="text-sm font-mono">Address: {stealthExtensionContract.address}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <a
                      href={`/debug?address=${stealthExtensionContract.address}`}
                      className="text-sm text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Debug Contract →
                    </a>
                  </div>
                  {accountType.isContract ? (
                    <>
                      <div className="mt-4">
                        <h3 className="text-sm font-semibold mb-2">Universal Profile Info:</h3>
                        {isCheckingOwner ? (
                          <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">Controller Address:</span>
                              {upOwner ? (
                                <span className="text-sm font-mono">{upOwner}</span>
                              ) : (
                                <span className="text-error">Not found</span>
                              )}
                            </div>
                            {upOwner && upOwner.toLowerCase() !== address?.toLowerCase() && (
                              <div className="alert alert-info">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  className="stroke-current shrink-0 w-6 h-6"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  ></path>
                                </svg>
                                <div>
                                  <h3 className="font-bold">Different Controller</h3>
                                  <div className="text-sm">
                                    You&apos;re not using the controller address. Switch to the controller address or
                                    grant permissions below.
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <h3 className="text-sm font-semibold mb-2">Permissions Status:</h3>
                        {isCheckingPermissions ? (
                          <span className="loading loading-spinner loading-sm"></span>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">SETDATA Permission:</span>
                              {hasSetDataPermission ? (
                                <span className="badge badge-success">Granted</span>
                              ) : (
                                <span className="badge badge-error">Not Granted</span>
                              )}
                            </div>
                            {!hasSetDataPermission && (
                              <div className="alert alert-warning">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="stroke-current shrink-0 h-6 w-6"
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
                                <div>
                                  <h3 className="font-bold">Permission Required</h3>
                                  <div className="text-sm">
                                    {upOwner?.toLowerCase() === address?.toLowerCase() ? (
                                      "You are using the controller address. You can enable the extension directly."
                                    ) : (
                                      <>
                                        You need SETDATA permission to enable the stealth extension. You can:
                                        <ul className="list-disc list-inside mt-2">
                                          <li>
                                            Connect with the controller address:{" "}
                                            <code className="bg-base-300 px-1 py-0.5 rounded text-sm">{upOwner}</code>
                                          </li>
                                          <li>Or grant permission using the button below</li>
                                        </ul>
                                        <div className="flex flex-col gap-2 mt-4">
                                          <div className="flex gap-2">
                                            <div className="alert alert-info">
                                              <div>
                                                <h4 className="font-bold">How to connect with controller:</h4>
                                                <ol className="list-decimal list-inside mt-2">
                                                  <li>
                                                    Copy the controller address{" "}
                                                    <button
                                                      className="btn btn-xs btn-ghost"
                                                      onClick={() => {
                                                        if (!upOwner) return;
                                                        navigator.clipboard.writeText(upOwner);
                                                        notification.success("Controller address copied!");
                                                      }}
                                                    >
                                                      <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="h-3 w-3"
                                                        width="24"
                                                        height="24"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                      >
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                      </svg>
                                                    </button>
                                                  </li>
                                                  <li>Click the UP browser extension icon</li>
                                                  <li>Click the account switcher dropdown</li>
                                                  <li>Select or import the controller address</li>
                                                  <li>Refresh this page after switching accounts</li>
                                                </ol>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="divider">OR</div>
                                          <button
                                            className={`btn btn-sm btn-warning ${isGrantingPermissions ? "loading" : ""}`}
                                            onClick={grantSetDataPermission}
                                            disabled={
                                              isGrantingPermissions ||
                                              !upOwner ||
                                              !address ||
                                              upOwner.toLowerCase() !== address?.toLowerCase()
                                            }
                                          >
                                            {isGrantingPermissions ? "Granting..." : "Grant SETDATA Permission"}
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <h3 className="text-sm font-semibold mb-2">Extension Status:</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Extension:</span>
                          {isExtensionEnabled ? (
                            <span className="badge badge-success">Enabled</span>
                          ) : (
                            <span className="badge badge-error">Not Enabled</span>
                          )}
                        </div>
                        {!isExtensionEnabled && hasSetDataPermission && (
                          <button
                            className={`btn btn-primary mt-4 ${isEnabling ? "loading" : ""}`}
                            onClick={enableStealthExtension}
                            disabled={isEnabling || !address || !hasSetDataPermission}
                          >
                            {isEnabling ? "Enabling..." : "Enable Extension"}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <button className="btn btn-sm btn-disabled mt-4" disabled={true}>
                      Deploy Stealth Extension (Contract/UP Only)
                    </button>
                  )}
                </>
              ) : (
                <div>
                  <p className="text-sm text-error mb-4">Contract not deployed</p>
                  {accountType.isContract ? (
                    <button className="btn btn-primary" onClick={handleDeployExtension} disabled={!address}>
                      Deploy LSP17StealthExtension
                    </button>
                  ) : (
                    <button className="btn btn-disabled" disabled={true}>
                      Deploy Stealth Extension (Contract/UP Only)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Receive Stealth Payments</h2>
              <div className="steps steps-vertical">
                <div className="step step-primary">
                  <div className="flex flex-col items-start w-full">
                    <span className="mb-2">1. Check for Announcements</span>
                    <div className="w-full">
                      <button
                        className={`btn btn-sm btn-primary w-full ${isCheckingAnnouncements ? "loading" : ""}`}
                        onClick={checkForAnnouncements}
                        disabled={isCheckingAnnouncements}
                      >
                        {isCheckingAnnouncements ? "Checking..." : "Check Announcements"}
                      </button>
                      <div className="h-48 overflow-auto mt-4 w-full bg-base-200 rounded-lg p-2">
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
                </div>
                <div className="step">
                  <div className="flex flex-col items-start">
                    <span>2. Recover Stealth Address</span>
                    <StealthRecoveryForm />
                  </div>
                </div>
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
