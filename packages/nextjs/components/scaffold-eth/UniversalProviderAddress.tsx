import { useEffect, useState } from "react";
import Image from "next/image";
import { useProfile } from "~~/hooks/scaffold-eth/useProfile";

interface Props {
  address: string;
  size?: number;
}

export const UniversalProviderAddress = ({ address, size = 35 }: Props) => {
  const { name, profileImage } = useProfile(address);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [profileImage]);

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
      <span className="ml-2 font-bold">{name || address}</span>
    </div>
  );
};
