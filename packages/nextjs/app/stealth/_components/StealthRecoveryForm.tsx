import { useState } from "react";
import { secp256k1 } from "@noble/curves/secp256k1";
import { Log } from "viem";
import { bytesToHex, hexToBytes, keccak256, toHex } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { BytesInput } from "~~/components/scaffold-eth/Input";
import { useScaffoldContract } from "~~/hooks/scaffold-eth/useScaffoldContract";
import { notification } from "~~/utils/scaffold-eth";

interface AnnouncedEvent extends Log {
  args: {
    stealthAddress: `0x${string}`;
    ephemeralPubKey: `0x${string}`;
    viewTag: `0x${string}`;
    announcer: `0x${string}`;
  };
}

export const StealthRecoveryForm = () => {
  const [ephemeralPublicKey, setEphemeralPublicKey] = useState("");
  const [recoveredAddress, setRecoveredAddress] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { data: stealthExtensionContract } = useScaffoldContract({
    contractName: "LSP17StealthExtension",
    walletClient,
  });

  const handleRecovery = async () => {
    if (!ephemeralPublicKey || !stealthExtensionContract || !walletClient || !publicClient) {
      notification.error("Please connect your wallet and enter an ephemeral public key");
      return;
    }

    try {
      setIsRecovering(true);

      // 1. Get the recipient's private key (this should be securely stored/derived)
      const message = toHex("Sign to derive stealth key");
      const signature = await walletClient.request({
        method: "personal_sign",
        params: [message, walletClient.account.address],
      });

      // Use the signature as the private key seed
      const privateKeyBytes = hexToBytes(signature);

      // 2. Convert the ephemeral public key to bytes
      const ephemeralPubKeyBytes = hexToBytes(ephemeralPublicKey as `0x${string}`);

      // 3. Derive the shared secret using ECDH
      const sharedSecret = secp256k1.getSharedSecret(
        new Uint8Array(privateKeyBytes.slice(0, 32)),
        new Uint8Array(ephemeralPubKeyBytes),
      );

      // 4. Generate the stealth address
      const stealthPrivateKeyBytes = hexToBytes(keccak256(bytesToHex(sharedSecret) as `0x${string}`));
      const stealthPublicKey = secp256k1.getPublicKey(new Uint8Array(stealthPrivateKeyBytes.slice(0, 32)));

      // 5. Convert the stealth public key to an Ethereum address
      const stealthAddress =
        `0x${keccak256(bytesToHex(stealthPublicKey) as `0x${string}`).slice(-40)}` as `0x${string}`;

      setRecoveredAddress(stealthAddress);

      // 6. Check for announcements to this stealth address
      const latestBlock = await publicClient.getBlockNumber();
      const events = (await publicClient.getLogs({
        address: stealthExtensionContract.address as `0x${string}`,
        event: {
          name: "Announced",
          type: "event",
          inputs: [
            { name: "stealthAddress", type: "address", indexed: true },
            { name: "ephemeralPubKey", type: "bytes", indexed: false },
            { name: "viewTag", type: "bytes1", indexed: false },
            { name: "announcer", type: "address", indexed: true },
          ],
        },
        fromBlock: latestBlock - BigInt(1000),
        toBlock: latestBlock,
      })) as AnnouncedEvent[];

      const matchingAnnouncements = events.filter(
        event => event.args.stealthAddress.toLowerCase() === stealthAddress.toLowerCase(),
      );

      if (matchingAnnouncements.length > 0) {
        notification.success(`Found ${matchingAnnouncements.length} announcements for this stealth address`);
      } else {
        notification.info("No announcements found for this stealth address");
      }
    } catch (error) {
      console.error("Error recovering stealth address:", error);
      notification.error("Failed to recover stealth address");
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-base-100 rounded-xl">
      <h2 className="text-2xl font-bold">Recover Stealth Address</h2>
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
      <button
        className={`btn btn-primary ${isRecovering ? "loading" : ""}`}
        onClick={handleRecovery}
        disabled={isRecovering || !ephemeralPublicKey}
      >
        {isRecovering ? "Recovering..." : "Recover Address"}
      </button>
      {recoveredAddress && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Recovered Address:</h3>
          <code className="block p-2 bg-base-200 rounded">{recoveredAddress}</code>
        </div>
      )}
    </div>
  );
};
