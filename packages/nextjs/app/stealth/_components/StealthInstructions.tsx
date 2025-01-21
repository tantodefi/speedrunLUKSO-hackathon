import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { AddressInput } from "~~/components/scaffold-eth/Input";
import { notification } from "~~/utils/scaffold-eth";

export const StealthInstructions = ({ isUniversalProfile }: { isUniversalProfile: boolean }) => {
  const [transferAmount, setTransferAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const handleTransfer = async () => {
    if (!walletClient || !address || !recipientAddress || !publicClient) {
      notification.error("Please connect your wallet and enter recipient address");
      return;
    }

    try {
      setIsLoading(true);
      const tx = await walletClient.sendTransaction({
        to: recipientAddress,
        value: parseEther(transferAmount),
      });

      notification.info("Sending funds to stealth address...");
      await publicClient.waitForTransactionReceipt({ hash: tx });
      notification.success("Successfully sent funds to stealth address!");
    } catch (error) {
      console.error("Transfer error:", error);
      notification.error("Failed to send funds to stealth address");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">How to Use Stealth Addresses</h2>

          {isUniversalProfile ? (
            <div className="steps steps-vertical">
              <div className="step step-primary">1. Enable LSP17 Stealth Extension on your Universal Profile</div>
              <div className="step step-primary">2. Generate a new stealth address for your recipient</div>
              <div className="step step-primary">3. Announce the stealth address using your Universal Profile</div>
              <div className="step step-primary">4. Send funds to the generated stealth address</div>
              <div className="step">5. Recipient can scan for and recover funds using their private key</div>
            </div>
          ) : (
            <div className="steps steps-vertical">
              <div className="step step-primary">1. Generate a new stealth address for your recipient</div>
              <div className="step step-primary">2. Announce the stealth address using the LSP17 contract</div>
              <div className="step step-primary">3. Send funds to the generated stealth address</div>
              <div className="step">4. Recipient can scan for and recover funds using their private key</div>
            </div>
          )}

          <div className="divider">Testing Transfers</div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Stealth Address (Recipient)</span>
            </label>
            <AddressInput
              value={recipientAddress}
              onChange={setRecipientAddress}
              placeholder="Enter stealth address"
              disabled={isLoading}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Amount (ETH)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={transferAmount}
              onChange={e => setTransferAmount(e.target.value)}
              placeholder="Enter amount in ETH"
              className="input input-bordered"
              disabled={isLoading}
            />
          </div>

          <button
            className={`btn btn-primary mt-4 ${isLoading ? "loading" : ""}`}
            onClick={handleTransfer}
            disabled={isLoading || !recipientAddress || !transferAmount}
          >
            {isLoading ? "Sending..." : "Send to Stealth Address"}
          </button>
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
  );
};
