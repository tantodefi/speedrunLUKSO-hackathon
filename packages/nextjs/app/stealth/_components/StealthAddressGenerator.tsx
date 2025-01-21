"use client";

import { useState } from "react";
import { secp256k1 } from "@noble/curves/secp256k1";
import { bytesToHex, getAddress, hexToBytes, isAddress, keccak256, toHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { useAccount, useWalletClient } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";

interface Props {
  onAddressGenerated: (address: string, pubKey: string, viewTag: string) => void;
  onDebugLog: (message: string) => void;
}

export const StealthAddressGenerator = ({ onAddressGenerated, onDebugLog }: Props) => {
  const [error, setError] = useState<string>("");
  const { address: connectedAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [recipientAddress, setRecipientAddress] = useState<string>("");

  const generateStealthAddress = async () => {
    const logPrefix = `[${new Date().toISOString()}]`;
    try {
      if (!connectedAddress || !walletClient) {
        throw new Error("Please connect your wallet first");
      }

      if (!recipientAddress || !isAddress(recipientAddress)) {
        throw new Error("Please enter a valid recipient address");
      }

      // Log initial step
      onDebugLog(`${logPrefix} Starting stealth address generation flow:`);
      onDebugLog(`${logPrefix} 1. Connected address: ${connectedAddress}`);
      onDebugLog(`${logPrefix} 2. Recipient address: ${recipientAddress}`);

      // Generate ephemeral key pair first
      onDebugLog(`${logPrefix} 3. Generating ephemeral key pair...`);
      const ephemeralPrivateKey = generatePrivateKey();
      const ephemeralAccount = privateKeyToAccount(ephemeralPrivateKey);
      const ephemeralPublicKey = ephemeralAccount.publicKey;
      onDebugLog(
        `${logPrefix} 4. Generated ephemeral public key: ${ephemeralPublicKey.slice(0, 10)}...${ephemeralPublicKey.slice(-8)}`,
      );

      // Get recipient's public key by asking them to sign a message
      onDebugLog(`${logPrefix} 5. Requesting signature to derive recipient's public key...`);
      const message = `Sign to share your public key for stealth address generation\n\nRecipient: ${recipientAddress}\nEphemeral Public Key: ${ephemeralPublicKey}\nTimestamp: ${Date.now()}`;
      const signature = await walletClient.request({
        method: "personal_sign",
        params: [toHex(message), connectedAddress],
      });
      onDebugLog(`${logPrefix} 6. Received signature: ${signature.slice(0, 10)}...${signature.slice(-8)}`);

      // Use the signature to derive recipient's key pair
      onDebugLog(`${logPrefix} 7. Deriving recipient's public key from signature...`);
      const recipientPrivateKeyBytes = hexToBytes(signature);
      const recipientPublicKey = secp256k1.getPublicKey(new Uint8Array(recipientPrivateKeyBytes.slice(0, 32)));
      onDebugLog(
        `${logPrefix} 8. Derived recipient's public key: ${bytesToHex(recipientPublicKey).slice(0, 10)}...${bytesToHex(recipientPublicKey).slice(-8)}`,
      );

      // Derive shared secret using ECDH
      onDebugLog(`${logPrefix} 9. Performing ECDH key exchange...`);
      const sharedSecret = secp256k1.getSharedSecret(hexToBytes(ephemeralPrivateKey), recipientPublicKey);
      onDebugLog(
        `${logPrefix} 10. Generated shared secret: ${bytesToHex(sharedSecret).slice(0, 10)}...${bytesToHex(sharedSecret).slice(-8)}`,
      );

      // Generate stealth address
      onDebugLog(`${logPrefix} 11. Deriving stealth address components...`);
      const stealthPrivateKeyBytes = hexToBytes(keccak256(bytesToHex(sharedSecret) as `0x${string}`));
      const stealthPublicKey = secp256k1.getPublicKey(new Uint8Array(stealthPrivateKeyBytes.slice(0, 32)));
      const stealthAddress = getAddress(`0x${keccak256(bytesToHex(stealthPublicKey) as `0x${string}`).slice(-40)}`);
      onDebugLog(`${logPrefix} 12. Generated stealth address: ${stealthAddress}`);

      // Generate view tag
      onDebugLog(`${logPrefix} 13. Generating view tag...`);
      const viewTag = `0x${keccak256(bytesToHex(sharedSecret) as `0x${string}`).slice(2, 4)}`;
      onDebugLog(`${logPrefix} 14. Generated view tag: ${viewTag}`);

      if (!isAddress(stealthAddress)) {
        throw new Error("Invalid stealth address generated");
      }

      onDebugLog(`${logPrefix} 15. Validation complete - all components generated successfully`);
      onAddressGenerated(stealthAddress, ephemeralPublicKey, viewTag);
      setError("");

      notification.success("Generated new stealth address with view tag!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate stealth address";
      setError(errorMessage);
      notification.error(errorMessage);
      onDebugLog(`${logPrefix} ❌ Error: ${errorMessage}`);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-base-100 shadow-xl rounded-3xl">
      <h2 className="text-2xl font-bold">Generate Stealth Address</h2>
      <p className="text-sm opacity-80">
        Generate a new stealth address and ephemeral public key pair for secure transactions.
      </p>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Recipient Address</span>
        </label>
        <input
          type="text"
          placeholder="Enter recipient's address"
          className="input input-bordered"
          value={recipientAddress}
          onChange={e => setRecipientAddress(e.target.value)}
        />
      </div>

      <button
        className="btn btn-primary"
        onClick={generateStealthAddress}
        disabled={!connectedAddress || !recipientAddress}
      >
        {!connectedAddress ? "Connect Wallet First" : "Generate New Stealth Address"}
      </button>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      <div className="divider">OR</div>

      <p className="text-sm mt-4">
        You can also manually enter a stealth address and ephemeral public key in the form below.
      </p>
    </div>
  );
};
