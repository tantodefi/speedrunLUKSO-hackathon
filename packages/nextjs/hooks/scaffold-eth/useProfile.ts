import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { lukso } from "viem/chains";

const client = createPublicClient({
  chain: lukso,
  transport: http(),
});

export const useProfile = (address: string) => {
  const [name, setName] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string>("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await client.readContract({
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
          args: ["0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5"],
        });

        if (data) {
          const jsonString = Buffer.from(data.slice(2), "hex").toString();
          try {
            const profileData = JSON.parse(jsonString);
            if (profileData.LSP3Profile) {
              setName(profileData.LSP3Profile.name || "");
              const images = profileData.LSP3Profile.profileImage;
              if (Array.isArray(images) && images.length > 0) {
                const image = images[0];
                if (image.url) {
                  setProfileImage(image.url.replace("ipfs://", "https://api.universalprofile.cloud/ipfs/"));
                } else if (image.hash) {
                  setProfileImage(`https://api.universalprofile.cloud/ipfs/${image.hash}`);
                }
              }
            }
          } catch (e) {
            console.error("Error parsing profile data:", e);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    if (address) {
      fetchProfile();
    }
  }, [address]);

  return { name, profileImage };
};
