import { useEffect, useState } from "react";
import { ERC725, ERC725JSONSchema } from "@erc725/erc725.js";
import { createPublicClient, getAddress, http, isAddress } from "viem";
import { lukso } from "viem/chains";

const LSP3ProfileSchema: ERC725JSONSchema[] = [
  {
    name: "LSP3Profile",
    key: "0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5",
    keyType: "Singleton",
    valueType: "bytes",
    valueContent: "VerifiableURI",
  },
];

const provider = createPublicClient({
  chain: lukso,
  transport: http(),
});

export const useProfile = (address?: string) => {
  const [name, setName] = useState<string | undefined>();
  const [profileImage, setProfileImage] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [isUniversalProfile, setIsUniversalProfile] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!address || !isAddress(address)) return;

      setLoading(true);
      setName(undefined);
      setProfileImage(undefined);
      setIsUniversalProfile(false);

      try {
        const erc725 = new ERC725(LSP3ProfileSchema, getAddress(address), provider);
        const data = await erc725.getData("LSP3Profile");
        console.log("Profile data fetched:", data);

        if (!data.value) {
          console.log("No profile data found");
          setLoading(false);
          return;
        }

        try {
          const profileMetadata = JSON.parse(data.value as string);
          console.log("Profile metadata:", profileMetadata);

          if (profileMetadata.LSP3Profile) {
            setName(profileMetadata.LSP3Profile.name);
            if (profileMetadata.LSP3Profile.profileImage?.[0]?.url) {
              setProfileImage(
                profileMetadata.LSP3Profile.profileImage[0].url.replace(
                  "ipfs://",
                  "https://api.universalprofile.cloud/ipfs/",
                ),
              );
            }
            setIsUniversalProfile(true);
          }
        } catch (error) {
          console.error("Error parsing profile data:", error);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [address]);

  return {
    name,
    profileImage,
    loading,
    isUniversalProfile,
  };
};
