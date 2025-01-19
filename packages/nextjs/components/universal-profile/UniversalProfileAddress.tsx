"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { getAddress, isAddress } from "viem";
import { CheckCircleIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useUniversalProfile } from "~~/contexts/universal-profile/UniversalProfileContext";

type AddressProps = {
  address: string;
  size?: number;
};

export const UniversalProfileAddress = ({ address, size = 35 }: AddressProps) => {
  const { profile, loading } = useUniversalProfile();
  const [addressCopied, setAddressCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [profile?.profileImage]);

  if (loading) {
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="rounded-full bg-gray-200 h-8 w-8"></div>
        <div className="flex items-center">
          <div className="h-2 w-28 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAddress(address)) {
    return <span className="text-error">Invalid address</span>;
  }

  const displayName = profile?.name || `${address.slice(0, 6)}...${address.slice(-4)}`;
  const profileImage = profile?.profileImage?.[0]?.url?.replace("ipfs://", "https://api.universalprofile.cloud/ipfs/");

  return (
    <div className="flex items-center">
      {profileImage && !imageError ? (
        <Image
          className="rounded-full"
          alt="UP Profile"
          src={profileImage}
          width={size}
          height={size}
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className="rounded-full bg-gray-200 flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <span className="text-gray-500 font-bold text-sm">UP</span>
        </div>
      )}
      <span className="ml-2 font-bold">{displayName}</span>
      {addressCopied ? (
        <CheckCircleIcon
          className="ml-1.5 text-xl font-normal text-sky-600 h-5 w-5 cursor-pointer"
          aria-hidden="true"
        />
      ) : (
        <CopyToClipboard
          text={getAddress(address)}
          onCopy={() => {
            setAddressCopied(true);
            setTimeout(() => {
              setAddressCopied(false);
            }, 800);
          }}
        >
          <DocumentDuplicateIcon
            className="ml-1.5 text-xl font-normal text-sky-600 h-5 w-5 cursor-pointer"
            aria-hidden="true"
          />
        </CopyToClipboard>
      )}
    </div>
  );
};
