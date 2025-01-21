"use client";

import type { Announcement } from "../types";

export interface AnnouncementDetailsProps {
  announcements: Announcement[];
}

export const AnnouncementDetails = ({ announcements }: AnnouncementDetailsProps) => {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Found Announcements:</h3>
      <div className="space-y-2">
        {announcements.map(announcement => (
          <div key={announcement.key} className="bg-base-200 p-2 rounded-lg space-y-1">
            <div>
              <span className="text-sm font-semibold">Stealth Address:</span>
              <p className="text-sm font-mono break-all">{announcement.stealthAddress}</p>
            </div>
            <div>
              <span className="text-sm font-semibold">Ephemeral Public Key:</span>
              <p className="text-sm font-mono break-all">{announcement.ephemeralPubKey}</p>
            </div>
            <div>
              <span className="text-sm font-semibold">Announced By:</span>
              <p className="text-sm font-mono break-all">{announcement.caller}</p>
            </div>
            <div>
              <span className="text-sm font-semibold">Timestamp:</span>
              <p className="text-sm">{new Date(announcement.timestamp * 1000).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
