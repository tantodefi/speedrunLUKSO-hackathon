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
  const { address: connectedAddress } = useAccount();
  const { data: session } = useSession();
  const [descriptionLength, setDescriptionLength] = useState(0);
  const [feedbackLength, setFeedbackLength] = useState(0);
  const [verifiedUPAddress, setVerifiedUPAddress] = useState<string | null>(null);
  const [canSignWithUP, setCanSignWithUP] = useState(false);
  const router = useRouter();
  const { provider } = useUniversalProfile();

  const { mutateAsync: postNewSubmission } = useMutation({
    mutationFn: (newSubmission: CreateNewSubmissionBody) =>
      postMutationFetcher("/api/submissions", { body: newSubmission }),
  });

  useEffect(() => {
    // Check if we have either UP provider or LUKSO extension
    setCanSignWithUP(!!(provider?.request || (window as any).lukso?.request));
  }, [provider]);

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

  const handleSignIn = async () => {
    try {
      const provider = (window as any).lukso || (window as any).ethereum;
      if (!provider?.request) {
        throw new Error("No Web3 Provider found");
      }

      // Get CSRF token first
      const csrfResponse = await fetch("/api/auth/csrf");
      const csrfToken = await csrfResponse.text();

      // Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address: connectedAddress,
        statement: "Sign in with your wallet to submit your project.",
        uri: window.location.origin,
        version: "1",
        chainId: 42, // LUKSO mainnet
        nonce: csrfToken,
      });

      const messageToSign = message.prepareMessage();
      console.log("Debug - SIWE message:", messageToSign);

      // For LUKSO UP, we need to use eth_sign
      let signature;
      if ((window as any).lukso) {
        const messageHex = "0x" + Buffer.from(messageToSign).toString("hex");
        signature = await provider.request({
          method: "eth_sign",
          params: [connectedAddress, messageHex],
        });
      } else {
        // For other wallets, use personal_sign
        signature = await provider.request({
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

      if (response?.error) {
        console.error("SIWE response error:", response.error);
        throw new Error(response.error);
      }

      if (!response?.ok) {
        console.error("SIWE response not ok:", response);
        throw new Error("Failed to sign in");
      }

      notification.success("Successfully signed in!");
    } catch (error: any) {
      console.error("Error signing in:", error);
      notification.error(error.message || "Failed to sign in");
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

    if (!session) {
      notification.error("Please sign in first");
      await handleSignIn();
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
        <div className="space-y-1">
          <p className="m-0 text-lg">Authentication Status</p>
          <div className="flex items-center justify-between border-2 border-base-300 bg-base-200 text-accent p-4">
            {session ? (
              <div className="flex items-center gap-2">
                <span className="text-success">✓ Signed In</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                className="btn bg-[#AFE1AF] hover:bg-[#9FD19F] text-black border-black"
                disabled={!connectedAddress}
              >
                {connectedAddress ? "Sign In" : "Please connect wallet"}
              </button>
            )}
          </div>
        </div>
        <SubmitButton />
      </form>
    </div>
  );
};

export default Form;
