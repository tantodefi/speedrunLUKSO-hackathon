import { useState } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { AddressInput, BytesInput } from "~~/components/scaffold-eth/Input";
import { useScaffoldContract } from "~~/hooks/scaffold-eth/useScaffoldContract";
import { notification } from "~~/utils/scaffold-eth";

export const StealthBroadcastForm = () => {
  const [stealthAddress, setStealthAddress] = useState("");
  const [ephemeralPublicKey, setEphemeralPublicKey] = useState("");
  const [viewTag, setViewTag] = useState("");
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { data: stealthExtensionContract } = useScaffoldContract({
    contractName: "LSP17StealthExtension",
    walletClient,
  });

  const handleBroadcast = async () => {
    if (!stealthAddress || !ephemeralPublicKey || !stealthExtensionContract || !publicClient) return;

    try {
      const tx = await stealthExtensionContract.write.announce([
        BigInt(0), // scheme ID
        stealthAddress as `0x${string}`,
        ephemeralPublicKey as `0x${string}`,
        (viewTag || "0x00") as `0x${string}`, // Default view tag if not provided
      ]);

      notification.info("Broadcasting announcement...");

      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

      if (receipt.status === "success") {
        notification.success("Announcement broadcasted successfully!");
      } else {
        notification.error("Failed to broadcast announcement");
      }
    } catch (error) {
      console.error("Error broadcasting announcement:", error);
      notification.error("Error broadcasting announcement");
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-base-100 rounded-xl">
      <h2 className="text-2xl font-bold">Broadcast Announcement</h2>
      <div className="form-control">
        <label className="label">
          <span className="label-text">Stealth Address</span>
        </label>
        <AddressInput placeholder="Enter stealth address" value={stealthAddress} onChange={setStealthAddress} />
      </div>
      <div className="form-control">
        <label className="label">
          <span className="label-text">Ephemeral Public Key</span>
        </label>
        <BytesInput
          placeholder="Enter ephemeral public key"
          value={ephemeralPublicKey}
          onChange={setEphemeralPublicKey}
        />
      </div>
      <div className="form-control">
        <label className="label">
          <span className="label-text">View Tag (optional)</span>
        </label>
        <BytesInput placeholder="Enter view tag" value={viewTag} onChange={setViewTag} />
      </div>
      <button className="btn btn-primary" onClick={handleBroadcast}>
        Broadcast Announcement
      </button>
    </div>
  );
};
