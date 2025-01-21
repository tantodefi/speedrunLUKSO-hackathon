import { useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { AddressInput, BytesInput } from "~~/components/scaffold-eth/Input";
import { useScaffoldContract } from "~~/hooks/scaffold-eth/useScaffoldContract";
import { notification } from "~~/utils/scaffold-eth";

export const StealthBroadcastForm = () => {
  const [stealthAddress, setStealthAddress] = useState("");
  const [ephemeralPublicKey, setEphemeralPublicKey] = useState("");
  const [viewTag, setViewTag] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { data: stealthExtensionContract } = useScaffoldContract({
    contractName: "LSP17StealthExtension",
    walletClient,
  });

  const handleBroadcast = async () => {
    if (!stealthAddress || !ephemeralPublicKey) {
      notification.error("Please provide both stealth address and ephemeral public key");
      return;
    }

    if (!stealthExtensionContract || !publicClient || !walletClient) {
      notification.error("Please connect your wallet");
      return;
    }

    setIsLoading(true);
    try {
      // Check if the stealth address is valid
      if (!stealthAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        notification.error("Invalid stealth address format");
        return;
      }

      // Check if the ephemeral public key is valid (should be 33 or 65 bytes)
      const keyLength = (ephemeralPublicKey.length - 2) / 2; // subtract 2 for '0x' prefix
      if (keyLength !== 33 && keyLength !== 65) {
        notification.error("Invalid ephemeral public key format");
        return;
      }

      // Check if the account has enough funds
      const address = await walletClient.getAddresses();
      const balance = await publicClient.getBalance({ address: address[0] });
      if (balance === 0n) {
        notification.error("Insufficient funds to broadcast announcement");
        return;
      }

      notification.info("Broadcasting announcement...");

      const tx = await stealthExtensionContract.write.announce([
        BigInt(0), // scheme ID
        stealthAddress as `0x${string}`,
        ephemeralPublicKey as `0x${string}`,
        (viewTag || "0x00") as `0x${string}`, // Default view tag if not provided
      ]);

      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

      if (receipt.status === "success") {
        notification.success("Announcement broadcasted successfully!");
        // Clear form after successful broadcast
        setStealthAddress("");
        setEphemeralPublicKey("");
        setViewTag("");
      } else {
        notification.error("Failed to broadcast announcement");
      }
    } catch (error) {
      console.error("Error broadcasting announcement:", error);
      if (error instanceof Error) {
        notification.error(`Error: ${error.message}`);
      } else {
        notification.error("Failed to broadcast announcement");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-base-100 rounded-xl">
      <h2 className="text-2xl font-bold">Broadcast Announcement</h2>
      <div className="form-control">
        <label className="label">
          <span className="label-text">Stealth Address</span>
        </label>
        <AddressInput
          value={stealthAddress}
          onChange={setStealthAddress}
          placeholder="Enter stealth address"
          disabled={isLoading}
        />
      </div>
      <div className="form-control">
        <label className="label">
          <span className="label-text">Ephemeral Public Key</span>
        </label>
        <BytesInput
          value={ephemeralPublicKey}
          onChange={setEphemeralPublicKey}
          placeholder="Enter ephemeral public key"
          disabled={isLoading}
        />
      </div>
      <div className="form-control">
        <label className="label">
          <span className="label-text">View Tag (optional)</span>
        </label>
        <BytesInput
          value={viewTag}
          onChange={setViewTag}
          placeholder="Enter view tag (optional)"
          disabled={isLoading}
        />
      </div>
      <button
        className={`btn btn-primary ${isLoading ? "loading" : ""}`}
        onClick={handleBroadcast}
        disabled={isLoading || !stealthAddress || !ephemeralPublicKey}
      >
        {isLoading ? "Broadcasting..." : "Broadcast"}
      </button>
    </div>
  );
};
