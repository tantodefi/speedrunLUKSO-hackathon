"use client";

import React from "react";
import Image from "next/image";
import identicon from "ethereum-blockies-base64";
import { useAccount } from "wagmi";
import { useUniversalProfile } from "~~/contexts/universal-profile/UniversalProfileContext";

interface Props {
  address?: string;
}

export const UniversalProfile: React.FC<Props> = ({ address }) => {
  const { profile } = useUniversalProfile();
  const account = useAccount();
  const displayAddress = address || account.address;
  const identiconUrl = displayAddress ? identicon(displayAddress) : "";

  return (
    <div className={`relative bg-base-200 rounded-lg shadow-lg p-4 mx-auto flex flex-col items-center`}>
      {profile?.backgroundImage && profile.backgroundImage.length > 0 && (
        <Image
          src={profile.backgroundImage[0].url.replace("ipfs://", "https://api.universalprofile.cloud/ipfs/")}
          alt="Background"
          className={`text-center rounded-lg absolute inset-0`}
          fill
          sizes="(max-width: 432px) 100vw"
          style={{
            objectFit: "cover",
          }}
        />
      )}

      <div className="flex justify-center relative">
        <div
          className={`text-center w-24 h-24 bg-base-300 rounded-full overflow-hidden relative border-4 border-base-100`}
        >
          {!profile?.profileImage || profile.profileImage.length === 0 ? (
            <div className="w-full h-full bg-base-300 rounded-full"></div>
          ) : (
            <Image
              src={profile.profileImage[0].url.replace("ipfs://", "https://api.universalprofile.cloud/ipfs/")}
              alt="Profile"
              className="rounded-full"
              fill
              sizes="(max-width: 768px) 100vw"
              priority={true}
              style={{
                objectFit: "cover",
              }}
            />
          )}
        </div>
        <div
          className={`absolute w-[38px] h-[38px] bottom-0 right-[-0.3rem] bg-base-300 rounded-full overflow-hidden border-4 border-base-100`}
        >
          {!profile?.profileImage || profile.profileImage.length === 0 || !identiconUrl ? (
            <div className="w-full h-full bg-base-300 rounded-full"></div>
          ) : (
            <Image
              src={identiconUrl}
              alt="Blockie"
              className="rounded-full"
              fill
              sizes="100vw"
              style={{
                objectFit: "cover",
              }}
            />
          )}
        </div>
      </div>

      <div className={`w-full max-w-[400px] text-center mt-4 bg-base-100 p-2 rounded-lg relative`}>
        <p className="text-lg font-semibold">{profile?.name || "Anonymous"}</p>
        <p className="text-sm text-base-content/70">{displayAddress || "0x"}</p>
        {profile?.description ? (
          <p className="text-sm text-base-content/70 mt-2">{profile?.description}</p>
        ) : (
          <div className={`min-h-[120px] w-full bg-base-300 mt-2 rounded-lg`}></div>
        )}

        {profile?.tags && profile.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {profile.tags.map((tag: string, index: number) => (
              <span key={index} className="badge badge-primary">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
