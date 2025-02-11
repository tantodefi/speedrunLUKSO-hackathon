"use client";

// @refresh reset
import { useEffect } from "react";
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

  // Add new effect to handle SIWE after connection
  useEffect(() => {
    const handleSignIn = async () => {
      if (!address || !isConnected) return;

      try {
        // Get the provider
        const activeProvider = (window as any).lukso || (window as any).ethereum;
        if (!activeProvider?.request) {
          throw new Error("No Web3 Provider found");
        }

        // Get CSRF token
        const csrfResponse = await fetch("/api/auth/csrf", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const csrfData = await csrfResponse.json();

        // Extract CSRF token from cookie if not in response
        if (!csrfData.csrfToken) {
          const cookies = document.cookie.split(";");
          const csrfCookie = cookies.find(c => c.trim().startsWith("next-auth.csrf-token="));
          if (csrfCookie) {
            const csrfValue = csrfCookie.split("=")[1];
            csrfData.csrfToken = csrfValue.split("|")[0];
          }
        }

        const csrfToken = csrfData.csrfToken;
        if (!csrfToken) {
          throw new Error("Failed to get CSRF token");
        }

        // Generate a proper nonce from the CSRF token
        const nonce = Buffer.from(csrfToken.split("|")[0], "hex")
          .toString("base64")
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(0, 16);

        // Create SIWE message
        const message = new SiweMessage({
          domain: window.location.host,
          address: address,
          statement: "Sign in with your Universal Profile to submit your project.",
          uri: window.location.origin,
          version: "1",
          chainId: 42, // LUKSO mainnet
          nonce: nonce,
          issuedAt: new Date().toISOString(),
          resources: ["https://docs.lukso.tech/"],
        });

        const messageToSign = message.prepareMessage();

        // For LUKSO UP, we need to use eth_sign
        let signature;
        try {
          // First try with eth_sign (UP method)
          const messageHex = "0x" + Buffer.from(messageToSign).toString("hex");
          signature = await activeProvider.request({
            method: "eth_sign",
            params: [address, messageHex],
          });
        } catch (error) {
          console.error("eth_sign failed, trying personal_sign:", error);
          // Fallback to personal_sign for other wallets
          signature = await activeProvider.request({
            method: "personal_sign",
            params: [messageToSign, address],
          });
        }

        // Sign in with NextAuth
        const response = await signIn("siwe", {
          message: JSON.stringify(message),
          signature,
          redirect: false,
          callbackUrl: window.location.origin,
        });

        if (response?.error) {
          throw new Error(response.error);
        }

        if (!response?.ok) {
          throw new Error("Failed to sign in");
        }

        notification.success("Successfully signed in!");
      } catch (error: any) {
        console.error("Error signing in:", error);
        notification.error(error.message || "Failed to sign in");
      }
    };

    if (isConnected && address && !sessionAddress) {
      handleSignIn();
    }
  }, [isConnected, address, sessionAddress]);

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
