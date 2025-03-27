import Credentials from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";

export const createSiweProvider = () => {
  return Credentials({
    id: "siwe",
    name: "SIWE",
    credentials: {
      message: { label: "Message", type: "text" },
      signature: { label: "Signature", type: "text" },
    },
    async authorize(credentials: Record<string, string> | undefined) {
      if (!credentials?.message || !credentials?.signature) {
        console.log("SIWE credentials missing");
        return null;
      }

      try {
        console.log("Parsing SIWE message");
        const message = JSON.parse(credentials.message);
        const siweMessage = new SiweMessage(message);

        // Debug info about domains
        console.log("SIWE domain verification:", {
          messageDomain: siweMessage.domain,
          requestDomain: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : "unknown",
          rawMessage: message,
        });

        // Verify the signature
        const { success, data: fields } = await siweMessage.verify({
          signature: credentials.signature,
          domain: siweMessage.domain, // Use the domain from the message
          nonce: siweMessage.nonce,
        });

        if (!success) {
          console.error("SIWE verification failed", fields);
          return null;
        }

        // Authentication successful
        return {
          id: fields.address,
          address: fields.address,
          role: "user",
          voter: fields.address ? true : false,
        };
      } catch (error) {
        console.error("SIWE authorize error:", error);
        return null;
      }
    },
  });
};
