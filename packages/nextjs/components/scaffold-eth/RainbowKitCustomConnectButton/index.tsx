"use client";

// @refresh reset
import { useCallback, useEffect } from "react";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { AddressQRCodeModal } from "./AddressQRCodeModal";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { signIn, signOut } from "next-auth/react";
import { SiweMessage } from "siwe";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { useAuthSession } from "~~/hooks/useAuthSession";
import authLock from "~~/utils/authManager";
import { notification } from "~~/utils/scaffold-eth";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-eth/networks";

/**
 * Custom Wagmi Connect Button (watch balance + custom design)
 */
export const RainbowKitCustomConnectButton = ({ fullWidth }: { fullWidth?: boolean }) => {
  const { targetNetwork } = useTargetNetwork();
  const { address, isConnected } = useAccount();
  const { address: sessionAddress } = useAuthSession();

  useEffect(() => {
    if (isConnected && sessionAddress && sessionAddress !== address) {
      signOut();
    }
  }, [address, isConnected, sessionAddress]);

  // Move getCsrfToken to the component level
  const getCsrfToken = async (retries = 3): Promise<string> => {
    for (let i = 0; i < retries; i++) {
      try {
        // Add a small delay before first attempt
        if (i === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Get CSRF token with credentials
        const csrfResponse = await fetch("/api/auth/csrf", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });

        if (!csrfResponse.ok) {
          throw new Error(`CSRF endpoint returned ${csrfResponse.status}`);
        }

        const csrfData = await csrfResponse.json();

        // First try to get token from response
        if (csrfData.csrfToken) {
          return csrfData.csrfToken;
        }

        // Then try to get from cookies
        const cookies = document.cookie.split(";");
        const csrfCookie = cookies.find(c => c.trim().startsWith("next-auth.csrf-token="));
        if (csrfCookie) {
          const csrfValue = csrfCookie.split("=")[1];
          return csrfValue.split("|")[0];
        }

        throw new Error("No CSRF token found in response or cookies");
      } catch (error) {
        console.warn(`CSRF token attempt ${i + 1} failed:`, error);
        if (i === retries - 1) throw error;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    throw new Error("Failed to get CSRF token after retries");
  };

  // Move handleSignIn to component level (not inside useEffect)
  const handleSignIn = useCallback(async () => {
    // Use the auth lock manager
    if (!authLock.acquire()) {
      console.log("Auth in progress or rate limited, skipping RainbowKit sign-in attempt");
      return;
    }

    try {
      if (!address || !isConnected) return;

      // Get the provider
      const activeProvider = (window as any).lukso || (window as any).ethereum;
      if (!activeProvider?.request) {
        throw new Error("No Web3 Provider found");
      }

      // Get CSRF token with retries
      const csrfToken = await getCsrfToken();
      console.log("Got CSRF token:", csrfToken);

      const currentHost = window.location.host;
      console.log("Creating SIWE message with host domain:", currentHost);

      const message = new SiweMessage({
        domain: currentHost, // Use the current domain from the window.location
        address: address as string,
        statement: "Sign in with your Universal Profile to submit your project.",
        uri: window.location.origin, // Use the full origin
        version: "1",
        chainId: 42,
        nonce: csrfToken,
        resources: ["https://docs.lukso.tech/"],
      });

      const messageToSign = message.prepareMessage();
      console.log("SIWE message:", messageToSign);

      // For LUKSO UP, we need to use eth_sign
      let signature;
      try {
        // First try with eth_sign (UP method)
        const messageHex = "0x" + Buffer.from(messageToSign).toString("hex");
        signature = await activeProvider.request({
          method: "eth_sign",
          params: [address, messageHex],
        });
        console.log("UP signature successful");
      } catch (error) {
        console.error("eth_sign failed, trying personal_sign:", error);
        // Fallback to personal_sign for other wallets
        signature = await activeProvider.request({
          method: "personal_sign",
          params: [messageToSign, address],
        });
      }

      console.log("Got signature:", signature);

      // Send the signature to the server
      const siweResponse = await signIn("siwe", {
        message: JSON.stringify(message),
        signature,
        redirect: false,
        callbackUrl: window.location.href,
      });

      console.log("SIWE response:", siweResponse);

      // Instead of checking for session establishment, just assume success
      // if the SIWE response is successful
      if (siweResponse?.ok) {
        notification.success("Authentication successful!");
        return;
      } else {
        console.error("SIWE response was not OK:", siweResponse);
        notification.error("Authentication failed. Please try again.");
      }
    } catch (error: any) {
      console.error("Error signing in:", error);
      notification.error(error.message || "Failed to sign in");
    } finally {
      authLock.release(); // Always release the lock
    }
  }, [address, isConnected]); // Include all dependencies

  // Now use handleSignIn in the useEffect
  useEffect(() => {
    if (isConnected && address && !sessionAddress) {
      handleSignIn();
    }
  }, [isConnected, address, sessionAddress, handleSignIn]); // Add handleSignIn as a dependency

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        const blockExplorerAddressLink = account
          ? getBlockExplorerAddressLink(targetNetwork, account.address)
          : undefined;

        return (
          <>
            {(() => {
              if (!connected) {
                return (
                  <button
                    className={`btn btn-outline text-lg font-normal${fullWidth ? " w-full" : ""}`}
                    onClick={openConnectModal}
                    type="button"
                  >
                    Connect
                  </button>
                );
              }

              if (chain.unsupported || chain.id !== targetNetwork.id) {
                return <WrongNetworkDropdown />;
              }

              return (
                <>
                  <AddressInfoDropdown
                    address={account.address as Address}
                    displayName={account.displayName}
                    ensAvatar={account.ensAvatar}
                    blockExplorerAddressLink={blockExplorerAddressLink}
                  />
                  <AddressQRCodeModal address={account.address as Address} modalId="qrcode-modal" />
                </>
              );
            })()}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
};
