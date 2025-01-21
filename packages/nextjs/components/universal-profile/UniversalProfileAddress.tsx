"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import copy from "copy-to-clipboard";
import { getAddress, isAddress } from "viem";
import { CheckCircleIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { useProfile } from "~~/hooks/scaffold-eth/useProfile";

type AddressProps = {
  address: string;
  size?: number;
};

export const UniversalProfileAddress = ({ address, size = 35 }: AddressProps) => {
  const { name, profileImage } = useProfile(address);
  const [addressCopied, setAddressCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [profileImage]);

  const handleCopy = () => {
    copy(getAddress(address));
    setAddressCopied(true);
    setTimeout(() => {
      setAddressCopied(false);
    }, 800);
  };

  if (!isAddress(address)) {
    return <span className="text-error">Invalid address</span>;
  }

  const displayName = name || `${address.slice(0, 6)}...${address.slice(-4)}`;

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
        <button type="button" onClick={handleCopy}>
          <DocumentDuplicateIcon
            className="ml-1.5 text-xl font-normal text-sky-600 h-5 w-5 cursor-pointer"
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
};
