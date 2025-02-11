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

      // First try to get CSRF token
      let csrfToken: string | undefined;
      try {
        csrfToken = await getCsrfToken();
        console.log("Got CSRF token:", csrfToken);
      } catch (e) {
        console.error("Failed to get CSRF token:", e);
        throw new Error("Failed to get CSRF token");
      }

      if (!csrfToken) {
        console.error("No CSRF token returned");
        throw new Error("No CSRF token available");
      }

      // Create and prepare SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: "Sign in with LUKSO UP to submit your project.",
        uri: window.location.origin,
        version: "1",
        chainId: chain?.id,
        nonce: csrfToken,
      });

      const preparedMessage = message.prepareMessage();
      console.log("Prepared message:", preparedMessage);

      // Get signature
      let signature: string;
      try {
        signature = await signMessageAsync({
          message: preparedMessage,
        });
        console.log("Got signature:", signature);
      } catch (e) {
        console.error("Failed to sign message:", e);
        throw new Error("Failed to sign message");
      }

      // Attempt sign in
      try {
        const response = await signIn("siwe", {
          message: JSON.stringify(message),
          signature,
          redirect: true,
          callbackUrl: "/submit",
        });

        if (response?.error) {
          console.error("Sign in failed:", {
            error: response.error,
            status: response.status,
          });
          throw new Error(`Sign in failed: ${response.error}`);
        }

        console.log("Sign in successful:", response);
      } catch (e) {
        console.error("Sign in threw error:", e);
        throw e;
      }
    } catch (error) {
      console.error("Login process failed:", error);
      throw error;
    }
  }, [address, chain?.id, signMessageAsync]);

  return { handleLogin };
};
