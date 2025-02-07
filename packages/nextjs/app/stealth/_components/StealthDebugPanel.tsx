import { useState } from "react";
import { Log } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { useScaffoldContract } from "~~/hooks/scaffold-eth/useScaffoldContract";
import { notification } from "~~/utils/scaffold-eth";

interface Announcement {
  stealthAddress: `0x${string}`;
  ephemeralPublicKey: `0x${string}`;
  viewTag: `0x${string}`;
  timestamp: number;
  announcer: `0x${string}`;
}

interface AnnouncedEvent extends Log {
  args: {
    stealthAddress: `0x${string}`;
    ephemeralPubKey: `0x${string}`;
    viewTag: `0x${string}`;
    announcer: `0x${string}`;
  };
}

export const StealthDebugPanel = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { data: stealthExtensionContract } = useScaffoldContract({
    contractName: "LSP17StealthExtension",
    walletClient,
  });

  const fetchAnnouncements = async () => {
    if (!stealthExtensionContract || !publicClient) return;

    try {
      setIsLoadingEvents(true);

      // Get the latest block number
      const latestBlock = await publicClient.getBlockNumber();

      // Fetch events from the last 1000 blocks (adjust as needed)
      const fromBlock = latestBlock - BigInt(1000);

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
        fromBlock,
        toBlock: latestBlock,
      })) as AnnouncedEvent[];

      // Format announcements
      const formattedAnnouncements = await Promise.all(
        events.map(async event => {
          const blockNumber = event.blockNumber;
          if (!blockNumber) {
            return null;
          }
          const block = await publicClient.getBlock({ blockNumber });
          if (!block) {
            return null;
          }
          return {
            stealthAddress: event.args.stealthAddress,
            ephemeralPublicKey: event.args.ephemeralPubKey,
            viewTag: event.args.viewTag,
            timestamp: Number(block.timestamp),
            announcer: event.args.announcer,
          } satisfies Announcement;
        }),
      );

      // Filter out null values and set announcements
      const validAnnouncements = formattedAnnouncements.filter((a): a is Announcement => a !== null);
      setAnnouncements(validAnnouncements);
      notification.success(`Found ${validAnnouncements.length} announcements`);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      notification.error("Failed to fetch announcements");
    } finally {
      setIsLoadingEvents(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-base-100 rounded-xl">
      <h2 className="text-2xl font-bold">Debug Panel</h2>
      <div className="flex justify-between items-center">
        <button
          className={`btn btn-primary ${isLoadingEvents ? "loading" : ""}`}
          onClick={fetchAnnouncements}
          disabled={isLoadingEvents}
        >
          {isLoadingEvents ? "Loading..." : "Fetch Recent Announcements"}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Stealth Address</th>
              <th>Ephemeral Public Key</th>
              <th>View Tag</th>
              <th>Announcer</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {announcements.map((announcement, index) => (
              <tr key={index}>
                <td className="font-mono text-sm">{announcement.stealthAddress}</td>
                <td className="font-mono text-sm">{announcement.ephemeralPublicKey}</td>
                <td className="font-mono text-sm">{announcement.viewTag}</td>
                <td className="font-mono text-sm">{announcement.announcer}</td>
                <td>{new Date(announcement.timestamp * 1000).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
