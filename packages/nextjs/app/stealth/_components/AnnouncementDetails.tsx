"use client";

import { useEffect, useState } from "react";
import { Address } from "~~/components/scaffold-eth";

interface AnnouncementDetailsProps {
  schemeId: bigint;
  stealthAddress: string;
  caller: string;
  ephemeralPubKey: string;
  metadata: string;
  timestamp?: number;
}

export const AnnouncementDetails: React.FC<AnnouncementDetailsProps> = ({
  schemeId,
  stealthAddress,
  caller,
  ephemeralPubKey,
  metadata,
  timestamp,
}) => {
  const [decodedMetadata, setDecodedMetadata] = useState<string>("");

  useEffect(() => {
    try {
      // Attempt to decode metadata if it's hex encoded
      if (metadata.startsWith("0x")) {
        const decoded = new TextDecoder().decode(new Uint8Array(Buffer.from(metadata.slice(2), "hex")));
        setDecodedMetadata(decoded);
      } else {
        setDecodedMetadata(metadata);
      }
    } catch (err) {
      console.error("Failed to decode metadata:", err);
      setDecodedMetadata(metadata);
    }
  }, [metadata]);

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title">Announcement Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              <span className="label-text font-semibold">Scheme ID</span>
            </label>
            <p className="text-sm">{schemeId.toString()}</p>
          </div>

          <div>
            <label className="label">
              <span className="label-text font-semibold">Stealth Address</span>
            </label>
            <Address address={stealthAddress} />
          </div>

          <div>
            <label className="label">
              <span className="label-text font-semibold">Caller</span>
            </label>
            <Address address={caller} />
          </div>

          <div>
            <label className="label">
              <span className="label-text font-semibold">Ephemeral Public Key</span>
            </label>
            <p className="text-sm font-mono break-all">{ephemeralPubKey}</p>
          </div>

          <div className="md:col-span-2">
            <label className="label">
              <span className="label-text font-semibold">Metadata</span>
            </label>
            <div className="bg-base-200 p-2 rounded-lg">
              <p className="text-sm font-mono break-all">{metadata}</p>
              {decodedMetadata !== metadata && <p className="text-sm mt-2 text-accent">Decoded: {decodedMetadata}</p>}
            </div>
          </div>

          {timestamp && (
            <div>
              <label className="label">
                <span className="label-text font-semibold">Timestamp</span>
              </label>
              <p className="text-sm">{new Date(timestamp * 1000).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
