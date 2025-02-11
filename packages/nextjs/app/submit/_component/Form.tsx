"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SubmitButton from "./SubmitButton";
import { useMutation } from "@tanstack/react-query";
import { signIn, useSession } from "next-auth/react";
import { SiweMessage } from "siwe";
import { useAccount } from "wagmi";
import { useUniversalProfile } from "~~/contexts/UniversalProfileContext";
import { CreateNewSubmissionBody } from "~~/services/database/repositories/submissions";
import { postMutationFetcher } from "~~/utils/react-query";
import { notification } from "~~/utils/scaffold-eth";

const MAX_DESCRIPTION_LENGTH = 750;
const MAX_FEEDBACK_LENGTH = 750;

const Form = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const { data: session } = useSession();
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [feedbackLength, setFeedbackLength] = useState(0);
  const [verifiedUPAddress, setVerifiedUPAddress] = useState<string | null>(null);
  const [canSignWithUP, setCanSignWithUP] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useRouter();
  const { provider } = useUniversalProfile();

  const { mutateAsync: postNewSubmission } = useMutation({
    mutationFn: (newSubmission: CreateNewSubmissionBody) =>
      postMutationFetcher("/api/submissions", { body: newSubmission }),
  });

  const handleSignIn = async () => {
    if (!connectedAddress) {
      console.log("No wallet address available for sign in");
      return false;
    }

    if (isSigningIn) {
      console.log("Already signing in, skipping...");
      return false;
    }

    try {
      setIsSigningIn(true);
      console.log("Starting sign in process...");

      // Get the provider (either UP provider or LUKSO extension)
      const activeProvider = (window as any).lukso || (window as any).ethereum;
      if (!activeProvider?.request) {
        throw new Error("No Web3 Provider found");
      }

      // First, request accounts to ensure we have permission
      const accounts = await activeProvider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found after requesting permissions");
      }

      // Get CSRF token first with credentials
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
      console.log("Got CSRF token:", csrfToken);

      // Generate a proper nonce from the CSRF token
      const nonce = Buffer.from(csrfToken.split("|")[0], "hex")
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 16); // Take first 16 alphanumeric characters

      console.log("Generated nonce:", nonce);

      // Create SIWE message according to LUKSO spec
      const message = new SiweMessage({
        domain: window.location.host,
        address: connectedAddress,
        statement: "Sign in with your Universal Profile to submit your project.",
        uri: window.location.origin,
        version: "1",
        chainId: 42, // LUKSO mainnet
        nonce: nonce,
        issuedAt: new Date().toISOString(),
        resources: ["https://docs.lukso.tech/"],
      });

      const messageToSign = message.prepareMessage();
      console.log("Debug - SIWE message:", messageToSign);

      // For LUKSO UP, we need to use eth_sign
      let signature;
      try {
        // First try with eth_sign (UP method)
        const messageHex = "0x" + Buffer.from(messageToSign).toString("hex");
        signature = await activeProvider.request({
          method: "eth_sign",
          params: [connectedAddress, messageHex],
        });
        console.log("Debug - UP signature successful");
      } catch (error) {
        console.error("eth_sign failed, trying personal_sign:", error);
        // Fallback to personal_sign for other wallets
        signature = await activeProvider.request({
          method: "personal_sign",
          params: [messageToSign, connectedAddress],
        });
      }

      console.log("Debug - SIWE signature:", signature);

      // Sign in with NextAuth
      const response = await signIn("siwe", {
        message: JSON.stringify(message),
        signature,
        redirect: false,
        callbackUrl: window.location.origin + "/submit",
      });

      console.log("SIWE response:", response);

      if (response?.error) {
        console.error("SIWE response error:", response.error);
        throw new Error(response.error);
      }

      if (!response?.ok) {
        console.error("SIWE response not ok:", response);
        throw new Error("Failed to sign in");
      }

      // Wait for session to be established
      let attempts = 0;
      let sessionData = null;
      while (attempts < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verify session is established with credentials
        const sessionResponse = await fetch("/api/auth/session", {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });

        if (!sessionResponse.ok) {
          console.error("Session response not ok:", sessionResponse.status);
          attempts++;
          continue;
        }

        try {
          sessionData = await sessionResponse.json();
          console.log("Session data after sign in (attempt " + (attempts + 1) + "):", sessionData);

          if (sessionData?.user) {
            break;
          }
        } catch (e) {
          console.error("Error parsing session response:", e);
        }
        attempts++;
      }

      if (!sessionData?.user) {
        throw new Error("Session not established after sign in");
      }

      notification.success("Successfully signed in!");
      return true;
    } catch (error: any) {
      console.error("Error signing in:", error);
      notification.error(error.message || "Failed to sign in");
      return false;
    } finally {
      setIsSigningIn(false);
    }
  };

  useEffect(() => {
    // Check if we have either UP provider or LUKSO extension
    setCanSignWithUP(!!(provider?.request || (window as any).lukso?.request));
  }, [provider]);

  // Handle wallet connection and session initialization
  useEffect(() => {
    const initializeSession = async () => {
      if (isConnected && connectedAddress && !session && !isSigningIn) {
        console.log("Wallet connected, attempting to initialize session...");
        setIsSigningIn(true);
        try {
          const success = await handleSignIn();
          if (success) {
            // After successful sign-in, automatically verify UP
            await handleSignWithUP();
          }
        } finally {
          setIsSigningIn(false);
        }
      }
    };

    initializeSession();
  }, [isConnected, connectedAddress, session, isSigningIn, handleSignIn]);

  const handleSignWithUP = async () => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet first");
      return;
    }

    try {
      // Get the provider (either UP provider or LUKSO extension)
      const activeProvider = provider || (window as any).lukso;
      if (!activeProvider?.request) {
        notification.error("No UP provider or LUKSO extension found");
        return;
      }

      // Create a message to sign that proves UP ownership
      const messageContent = `I confirm this is my Universal Profile address: ${connectedAddress}`;
      const messageHex = "0x" + Buffer.from(messageContent).toString("hex");

      // Request signature using UP interface
      const signature = await activeProvider.request({
        method: "eth_sign",
        params: [connectedAddress, messageHex],
      });

      if (signature) {
        setVerifiedUPAddress(connectedAddress);
        notification.success("Universal Profile verified successfully!");
      }
    } catch (error: any) {
      console.error("Error verifying UP:", error);
      notification.error(error.message || "Failed to verify Universal Profile");
    }
  };

  const clientFormAction = async (formData: FormData) => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet");
      return;
    }

    if (!verifiedUPAddress) {
      notification.error("Please verify your Universal Profile first");
      return;
    }

    if (!session?.user) {
      notification.error("Please sign in with your Universal Profile first");
      return;
    }

    try {
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const linkToRepository = formData.get("linkToRepository") as string;
      const linkToVideo = formData.get("linkToVideo") as string;
      const telegram = formData.get("telegram") as string;

      if (!title || !description || !linkToRepository || !linkToVideo) {
        notification.error("Please fill all the required fields");
        return;
      }

      const feedback = formData.get("feedback") as string;

      const messageContent = `I hereby confirm the following submission:

Title: ${title}
Description: ${description}
Repository: ${linkToRepository}
Video: ${linkToVideo}
UP Address: ${verifiedUPAddress}
Builder: ${connectedAddress}
${telegram ? `Telegram: ${telegram}` : ""}
${feedback ? `Feedback: ${feedback}` : ""}`;

      console.log("Debug - Message to sign:", messageContent);

      // Get the provider
      const provider = (window as any).lukso || (window as any).ethereum;
      if (!provider?.request) {
        throw new Error("No Web3 Provider found");
      }

      // Detect if it's a LUKSO wallet by checking for specific methods
      const isLuksoWallet = !!(window as any).lukso;

      let signature: `0x${string}`;

      if (isLuksoWallet) {
        // For LUKSO Universal Profile
        const messageHex = "0x" + Buffer.from(messageContent).toString("hex");
        signature = (await provider.request({
          method: "eth_sign",
          params: [connectedAddress, messageHex],
        })) as `0x${string}`;
      } else {
        // For traditional EOA wallets (MetaMask etc)
        signature = (await provider.request({
          method: "personal_sign",
          params: [messageContent, connectedAddress],
        })) as `0x${string}`;
      }

      console.log("Debug - Generated signature:", signature);
      console.log("Debug - Wallet type:", isLuksoWallet ? "LUKSO UP" : "EOA");
      console.log("Debug - Signer address:", connectedAddress);

      await postNewSubmission({
        title,
        description,
        telegram,
        upAddress: verifiedUPAddress,
        linkToRepository,
        linkToVideo,
        feedback,
        signature,
        builder: connectedAddress,
      });

      notification.success("Extension submitted successfully!");
      router.push("/");
    } catch (error: any) {
      if (error instanceof Error) {
        notification.error(error.message);
        return;
      }
      notification.error("Something went wrong");
    }
  };

  return (
    <div className="card w-[95%]">
      <form action={clientFormAction} className="card-body space-y-2 p-0 md:p-2">
        <div className="space-y-1">
          <p className="m-0 text-lg">Title *</p>
          <div className="flex border-2 border-base-300 bg-base-200 text-accent">
            <input
              className="input input-ghost focus-within:border-transparent focus:outline-none focus:bg-transparent focus:text-gray-700 h-[2.2rem] min-h-[2.2rem] px-4 border w-full font-medium placeholder:text-gray-300 text-gray-700"
              placeholder="Project title"
              name="title"
              autoComplete="off"
              type="text"
              maxLength={75}
            />
          </div>
        </div>
        <div className="space-y-1">
          <p className="m-0 text-lg">Description *</p>
          <div className="flex flex-col border-2 border-base-300 bg-base-200 text-accent">
            <textarea
              className="input input-ghost focus-within:border-transparent focus:outline-none focus:bg-transparent focus:text-gray-700 px-4 pt-2 border w-full font-medium placeholder:text-gray-300 text-gray-700 h-28 md:h-52 rounded-none"
              placeholder="Project description"
              name="description"
              autoComplete="off"
              maxLength={MAX_DESCRIPTION_LENGTH}
              onChange={e => setDescriptionLength(e.target.value.length)}
            />
            <p className="my-1">
              {descriptionLength} / {MAX_DESCRIPTION_LENGTH}
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="m-0 text-lg">Universal Profile *</p>
          <div className="flex items-center justify-between border-2 border-base-300 bg-base-200 text-accent p-4">
            {verifiedUPAddress ? (
              <div className="flex items-center gap-2">
                <span className="text-success">✓ Verified UP:</span>
                <span className="font-mono">{verifiedUPAddress}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignWithUP}
                className="btn bg-[#AFE1AF] hover:bg-[#9FD19F] text-black border-black"
                disabled={!canSignWithUP}
              >
                {canSignWithUP ? "Sign with UP" : "Please connect UP wallet"}
              </button>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <p className="m-0 text-lg">Your Telegram handle</p>
          <div className="flex border-2 border-base-300 bg-base-200 text-accent">
            <input
              className="input input-ghost focus-within:border-transparent focus:outline-none focus:bg-transparent focus:text-gray-700 h-[2.2rem] min-h-[2.2rem] px-4 border w-full font-medium placeholder:text-gray-300 text-gray-700"
              placeholder="@username"
              name="telegram"
              autoComplete="off"
              type="text"
              maxLength={75}
            />
          </div>
        </div>
        <div className="space-y-1">
          <p className="m-0 text-lg">Repository URL *</p>
          <div className="flex border-2 border-base-300 bg-base-200 text-accent">
            <input
              className="input input-ghost focus-within:border-transparent focus:outline-none focus:bg-transparent focus:text-gray-700 h-[2.2rem] min-h-[2.2rem] px-4 border w-full font-medium placeholder:text-gray-300 text-gray-700"
              placeholder="https://"
              name="linkToRepository"
              autoComplete="off"
              type="text"
              maxLength={75}
            />
          </div>
        </div>
        <div className="space-y-1">
          <p className="m-0 text-lg">Project video link *</p>
          <div className="flex border-2 border-base-300 bg-base-200 text-accent">
            <input
              className="input input-ghost focus-within:border-transparent focus:outline-none focus:bg-transparent focus:text-gray-700 h-[2.2rem] min-h-[2.2rem] px-4 border w-full font-medium placeholder:text-gray-300 text-gray-700"
              placeholder="https://"
              name="linkToVideo"
              autoComplete="off"
              type="text"
              maxLength={75}
            />
          </div>
        </div>
        <div className="space-y-1">
          <p className="m-0 text-lg">What would you improve about the speedrunLUKSO curriculum?</p>
          <div className="flex flex-col border-2 border-base-300 bg-base-200 text-accent">
            <textarea
              className="input input-ghost focus-within:border-transparent focus:outline-none focus:bg-transparent focus:text-gray-700 px-4 pt-2 border w-full font-medium placeholder:text-gray-300 text-gray-700 h-28 md:h-52 rounded-none"
              name="feedback"
              autoComplete="off"
              maxLength={MAX_FEEDBACK_LENGTH}
              onChange={e => setFeedbackLength(e.target.value.length)}
            />
            <p className="my-1">
              {feedbackLength} / {MAX_FEEDBACK_LENGTH}
            </p>
          </div>
        </div>
        <SubmitButton />
      </form>
    </div>
  );
};

export default Form;
