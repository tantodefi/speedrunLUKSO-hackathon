import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { lukso } from "viem/chains";

const client = createPublicClient({
  chain: lukso,
  transport: http(),
});

// LSP3 Profile Metadata Key
const LSP3_PROFILE_KEY = "0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5";

export const useProfile = (address: string) => {
  const [name, setName] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isUniversalProfile, setIsUniversalProfile] = useState<boolean>(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!address) return;

      setLoading(true);
      setName("");
      setProfileImage("");
      setIsUniversalProfile(false);

      try {
        // Try to fetch LSP3 Profile data
        const data = await client
          .readContract({
            address,
            abi: [
              {
                name: "getData",
                type: "function",
                stateMutability: "view",
                inputs: [{ name: "key", type: "bytes32" }],
                outputs: [{ name: "value", type: "bytes" }],
              },
            ],
            functionName: "getData",
            args: [LSP3_PROFILE_KEY],
          })
          .catch(() => null); // Catch contract call errors and return null

        // If no data or contract call failed, this is not a UP
        if (!data) {
          setLoading(false);
          return;
        }

        try {
          const jsonString = Buffer.from(data.slice(2), "hex").toString();
          const profileData = JSON.parse(jsonString);

          if (profileData?.LSP3Profile) {
            setIsUniversalProfile(true);

            // Set name if available
            if (profileData.LSP3Profile.name) {
              setName(profileData.LSP3Profile.name);
            }

            // Set profile image if available
            const images = profileData.LSP3Profile.profileImage;
            if (Array.isArray(images) && images.length > 0) {
              const image = images[0];
              if (image?.url) {
                setProfileImage(image.url.replace("ipfs://", "https://api.universalprofile.cloud/ipfs/"));
              } else if (image?.hash) {
                setProfileImage(`https://api.universalprofile.cloud/ipfs/${image.hash}`);
              }
            }
          }
        } catch (e) {
          console.debug("Not a valid LSP3 Profile:", e);
        }
      } catch (error) {
        console.debug("Not a Universal Profile:", error);
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
