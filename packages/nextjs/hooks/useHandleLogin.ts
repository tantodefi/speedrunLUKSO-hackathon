import { useCallback } from "react";
import { getCsrfToken, signIn } from "next-auth/react";
import { SiweMessage } from "siwe";
import { useAccount, useSignMessage } from "wagmi";

export const useHandleLogin = () => {
  const { signMessageAsync } = useSignMessage();
  const { address, chain } = useAccount();

  const handleLogin = useCallback(async () => {
    try {
      if (!address) {
        console.error("No address available");
        return;
      }

      const csrfToken = await getCsrfToken();
      if (!csrfToken) {
        console.error("Failed to get CSRF token");
        return;
      }

      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: "Sign in with LUKSO UP to submit your project.",
        uri: window.location.origin,
        version: "1",
        chainId: chain?.id,
        nonce: csrfToken,
      });

      console.log("Preparing to sign message:", message.prepareMessage());

      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      console.log("Message signed successfully:", {
        signature,
        address,
        chainId: chain?.id,
      });

      const callbackUrl = "/submit";
      const response = await signIn("credentials", {
        message: JSON.stringify(message),
        signature,
        redirect: true,
        callbackUrl,
      });

      if (response?.error) {
        console.error("Login failed:", {
          error: response.error,
          status: response.status,
          ok: response.ok,
        });
        throw new Error(`Login failed: ${response.error}`);
      } else {
        console.log("Login successful, redirecting to:", callbackUrl);
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }, [address, chain?.id, signMessageAsync]);

  return { handleLogin };
};
