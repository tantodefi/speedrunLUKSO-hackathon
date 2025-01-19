import { useEffect, useState } from "react";
import Image from "next/image";
import { getAddress, isAddress } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { useProfile } from "~~/hooks/scaffold-eth/useProfile";

interface Props {
  address: string;
  size?: number;
}

export const UniversalProviderAddress = ({ address, size = 35 }: Props) => {
  const [displayAddress, setDisplayAddress] = useState("");
  const [imageError, setImageError] = useState(false);
  const { name, profileImage, loading, error } = useProfile(address);

  useEffect(() => {
    if (address && isAddress(address)) {
      setDisplayAddress(getAddress(address));
    }
  }, [address]);

  useEffect(() => {
    setImageError(false);
  }, [profileImage]);

  if (!displayAddress) return null;

  // If there's an error or no profile data, fallback to Address component
  if (error || (!loading && !name && !profileImage)) {
    return <Address address={displayAddress} />;
  }

  const displayName = name || `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`;

  return (
    <div className="flex items-center">
      {loading ? (
        <div className="animate-pulse">
          <div className="rounded-full bg-gray-200" style={{ width: size, height: size }} />
        </div>
      ) : profileImage && !imageError ? (
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
    </div>
  );
};
