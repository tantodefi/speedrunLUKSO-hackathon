"use client";

import React from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Address } from "@/components/scaffold-eth";
import { useProfile } from "@/hooks/scaffold-eth";
import { getAddress, isAddress } from "viem";

interface Props {
  address: string;
  size?: number;
}

export const UniversalProviderAddress = React.forwardRef<HTMLDivElement, Props>(({ address, size = 35 }, ref) => {
  const [displayAddress, setDisplayAddress] = useState("");
  const [imageError, setImageError] = useState(false);
  const { name, profileImage, loading, isUniversalProfile } = useProfile(address);

  useEffect(() => {
    if (address && isAddress(address)) {
      setDisplayAddress(getAddress(address));
    }
  }, [address]);

  useEffect(() => {
    setImageError(false);
  }, [profileImage]);

  console.log("UniversalProviderAddress:", {
    address,
    displayAddress,
    name,
    profileImage,
    loading,
    isUniversalProfile,
  });

  if (!displayAddress) return null;

  // If not a Universal Profile or still loading, use Address component
  if (!isUniversalProfile || loading) {
    return <Address address={displayAddress} />;
  }

  return (
    <div className="flex items-center" ref={ref}>
      {profileImage && !imageError ? (
        <Image
          className="rounded-full"
          alt={name || "UP Profile"}
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
      <span className="ml-2 font-bold">{name || `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`}</span>
    </div>
  );
});

UniversalProviderAddress.displayName = "UniversalProviderAddress";
