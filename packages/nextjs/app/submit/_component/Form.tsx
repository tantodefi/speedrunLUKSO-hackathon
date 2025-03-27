"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SubmitButton from "./SubmitButton";
import { useMutation } from "@tanstack/react-query";
import { signIn, useSession } from "next-auth/react";
import { SiweMessage } from "siwe";
import { useAccount } from "wagmi";
import { useUniversalProfile } from "~~/contexts/UniversalProfileContext";
import { CreateNewSubmissionBody } from "~~/services/database/repositories/submissions";
import authLock from "~~/utils/authManager";
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
  const [initAttempted, setInitAttempted] = useState(false);
  const [initDone, setInitDone] = useState(false);
  const router = useRouter();
  const { provider } = useUniversalProfile();
  const [connectionInitiated, setConnectionInitiated] = useState(false);
  const [upErrorSuppressed, setUpErrorSuppressed] = useState(false);

  const { mutateAsync: postNewSubmission } = useMutation({
    mutationFn: (newSubmission: CreateNewSubmissionBody) =>
      postMutationFetcher("/api/submissions", { body: newSubmission }),
  });

  useEffect(() => {
    if (connectedAddress) {
      console.log("Address changed, resetting initialization states");
      setInitAttempted(false);
      setInitDone(false);
    }
  }, [connectedAddress]);

  const handleSignIn = useCallback(async () => {
    if (!connectedAddress) {
      console.log("No wallet address available for sign in");
      return false;
    }

    if (!authLock.acquire()) {
      console.log("Auth in progress or rate limited, skipping sign-in attempt");
      return false;
    }

    try {
      setIsSigningIn(true);
      console.log("Starting sign in process for", connectedAddress);

      const activeProvider = (window as any).lukso || (window as any).ethereum;
      if (!activeProvider?.request) {
        throw new Error("No Web3 Provider found");
      }

      console.log("Requesting accounts from provider...");
      const accounts = await activeProvider.request({ method: "eth_requestAccounts" });
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found after requesting permissions");
      }
      console.log("Got accounts:", accounts);

      console.log("Clearing any existing sessions...");
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      console.log("Requesting fresh CSRF token...");
      const csrfResponse = await fetch("/api/auth/csrf", {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });

      if (!csrfResponse.ok) {
        throw new Error(`CSRF request failed with status ${csrfResponse.status}`);
      }

      const csrfData = await csrfResponse.json();
      console.log("CSRF response:", csrfData);

      if (!csrfData.csrfToken) {
        throw new Error("No CSRF token in response");
      }

      const csrfToken = csrfData.csrfToken;
      console.log("Got CSRF token:", csrfToken);

      const nonce = Buffer.from(csrfToken.split("|")[0] || csrfToken, "hex")
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 16);

      console.log("Generated nonce:", nonce);

      const message = new SiweMessage({
        domain: window.location.host,
        address: connectedAddress,
        statement: "Sign in with your Universal Profile to submit your project.",
        uri: window.location.origin,
        version: "1",
        chainId: 42,
        nonce: nonce,
        issuedAt: new Date().toISOString(),
        resources: ["https://docs.lukso.tech/"],
      });

      console.log("SIWE message configuration:", {
        domain: window.location.host,
        origin: window.location.origin,
        fullUrl: window.location.href,
      });

      const messageToSign = message.prepareMessage();
      console.log("SIWE message prepared:", messageToSign);

      let signature;
      try {
        const messageHex = "0x" + Buffer.from(messageToSign).toString("hex");
        signature = await activeProvider.request({
          method: "eth_sign",
          params: [connectedAddress, messageHex],
        });
        console.log("UP signature successful with eth_sign");
      } catch (error) {
        console.error("eth_sign failed, this might not be a valid UP:", error);
        throw new Error("Failed to sign with UP. This might not be a Universal Profile.");
      }

      console.log("SIWE signature:", signature);

      console.log("Sending SIWE data to NextAuth...");
      const response = await signIn("siwe", {
        message: JSON.stringify(message),
        signature,
        redirect: false,
        callbackUrl: window.location.origin + "/submit",
      });

      console.log("SIWE auth response:", response);

      if (response?.error) {
        console.error("SIWE response error:", response.error);
        throw new Error(response.error);
      }

      if (!response?.ok) {
        console.error("SIWE response not ok:", response);
        throw new Error("Failed to sign in");
      }

      console.log("Verifying session creation...");
      let sessionEstablished = false;

      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
          const sessionResponse = await fetch("/api/auth/session", {
            credentials: "include",
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          });

          if (!sessionResponse.ok) {
            console.error(`Session check failed with status ${sessionResponse.status}`);
            continue;
          }

          const sessionData = await sessionResponse.json();
          console.log(`Session check (attempt ${attempt + 1}):`, sessionData);

          if (sessionData && sessionData.user && sessionData.user.address) {
            console.log("Session successfully established!");
            setVerifiedUPAddress(sessionData.user.address);
            setInitDone(true);
            sessionEstablished = true;
            break;
          }
        } catch (error) {
          console.error(`Error checking session (attempt ${attempt + 1}):`, error);
        }
      }

      if (!sessionEstablished) {
        console.error("Failed to establish session after multiple attempts");

        if (typeof window !== "undefined") {
          notification.info("Refreshing page to complete authentication...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          window.location.reload();
          return true;
        }

        throw new Error("Session not established after sign in");
      }
    } catch (error: any) {
      console.error("Error signing in:", error.message || error);
      notification.error(error.message || "Failed to sign in with Universal Profile");
      return false;
    } finally {
      setIsSigningIn(false);
      authLock.release();
    }
  }, [connectedAddress]);

  useEffect(() => {
    const checkProvider = async () => {
      const hasUPProvider = !!(provider?.request || (window as any).lukso?.request);
      console.log("UP Provider available:", hasUPProvider);
      setCanSignWithUP(hasUPProvider);
    };

    checkProvider();
  }, [provider]);

  useEffect(() => {
    const initializeSession = async () => {
      if (isConnected && connectedAddress && !session && !isSigningIn && !initAttempted && !initDone) {
        console.log("Wallet connected, attempting to initialize session...");
        setInitAttempted(true);

        try {
          await handleSignIn();
        } catch (error) {
          console.error("Session initialization failed:", error);
        }
      }
    };

    const timer = setTimeout(() => {
      initializeSession();
    }, 500);

    return () => clearTimeout(timer);
  }, [isConnected, connectedAddress, session, isSigningIn, handleSignIn, initAttempted, initDone]);

  useEffect(() => {
    if (isConnected && connectedAddress && !connectionInitiated && !session?.user) {
      console.log("UP CONNECTED EVENT DETECTED in Form.tsx - checking if RainbowKit has already handled auth...");

      const checkSession = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 3000));

          if (!authLock.acquire()) {
            console.log("Auth in progress or rate limited, skipping auto-sign-in");
            return;
          }

          try {
            const sessionResponse = await fetch("/api/auth/session", {
              credentials: "include",
            });
            const sessionData = await sessionResponse.json();

            if (!sessionData?.user) {
              console.log("No session established by other components, triggering Form sign-in flow");
              setConnectionInitiated(true);

              try {
                await handleSignIn();
              } catch (err) {
                console.error("Failed to auto-trigger Form SIWE after connection:", err);
                notification.error("Failed to automatically sign in. Please try signing in manually.");
              }
            } else {
              console.log("Session already established, skipping duplicate sign-in");
              setConnectionInitiated(true);
            }
          } catch (err) {
            console.error("Error checking session:", err);
          } finally {
            authLock.release();
          }
        } catch (err) {
          console.error("Error in checkSession:", err);
          authLock.release();
        }
      };

      checkSession();
    }
  }, [isConnected, connectedAddress, connectionInitiated, session, handleSignIn]);

  useEffect(() => {
    if (!isConnected || !connectedAddress) {
      setConnectionInitiated(false);
    }
  }, [isConnected, connectedAddress]);

  const handleSignWithUP = async () => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet first");
      return;
    }

    try {
      const activeProvider = provider || (window as any).lukso;
      if (!activeProvider?.request) {
        notification.error("No UP provider or LUKSO extension found");
        return;
      }

      const messageContent = `I confirm this is my Universal Profile address: ${connectedAddress}`;
      const messageHex = "0x" + Buffer.from(messageContent).toString("hex");

      try {
        console.log("Requesting UP verification signature...");
        const signature = await activeProvider.request({
          method: "eth_sign",
          params: [connectedAddress, messageHex],
        });

        if (signature) {
          console.log("UP verification signature:", signature);
          setVerifiedUPAddress(connectedAddress);
          notification.success("Universal Profile verified successfully!");
        }
      } catch (error) {
        console.error("Error during UP verification:", error);
        notification.error("Failed to verify UP. Make sure you're using a Universal Profile, not an EOA wallet.");
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

    // Only verify UP if not already verified
    if (!verifiedUPAddress) {
      notification.info("Verifying your Universal Profile...");
      await handleSignWithUP();
      if (!verifiedUPAddress) {
        return;
      }
    }

    try {
      console.log("Processing form submission...");

      // Skip session check entirely and proceed directly with form submission
      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const linkToRepository = formData.get("linkToRepository") as string;
      const linkToVideo = formData.get("linkToVideo") as string;
      const telegram = formData.get("telegram") as string;
      const feedback = formData.get("feedback") as string;

      if (!title || !description || !linkToRepository || !linkToVideo) {
        const missingFields = [];
        if (!title) missingFields.push("title");
        if (!description) missingFields.push("description");
        if (!linkToRepository) missingFields.push("repository link");
        if (!linkToVideo) missingFields.push("video link");

        notification.error(`Please fill in all required fields: ${missingFields.join(", ")}`);
        return;
      }

      // Log all fields for debugging
      console.log("Form data to be submitted:", {
        title,
        description: description.substring(0, 50) + "...",
        linkToRepository,
        linkToVideo,
        telegram,
        feedback: feedback?.substring(0, 50) + "...",
        upAddress: connectedAddress,
      });

      const messageContent = `I hereby confirm the following submission:

Title: ${title}
Description: ${description}
Repository: ${linkToRepository}
Video: ${linkToVideo}
UP Address: ${connectedAddress}
${telegram ? `Telegram: ${telegram}` : ""}
${feedback ? `Feedback: ${feedback}` : ""}
Timestamp: ${new Date().toISOString()}`;

      console.log("Signing form submission data with message:", messageContent);

      const activeProvider = provider || (window as any).lukso || (window as any).ethereum;
      if (!activeProvider?.request) {
        throw new Error("No Web3 Provider found");
      }

      console.log("Requesting eth_sign for form submission...");
      const messageHex = "0x" + Buffer.from(messageContent).toString("hex");
      const signature = await activeProvider.request({
        method: "eth_sign",
        params: [connectedAddress, messageHex],
      });

      console.log("Form submission signature successful");

      await postNewSubmission({
        title,
        description,
        telegram,
        upAddress: connectedAddress,
        linkToRepository,
        linkToVideo,
        feedback,
        signature,
        builder: connectedAddress,
      });

      notification.success("Extension submitted successfully!");
      router.push("/");
    } catch (error) {
      console.error("Submission error:", error);
      if (error instanceof Error) {
        notification.error(error.message);
      } else {
        notification.error("Something went wrong");
      }
    }
  };

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error && event.error.message === "No UP found") {
        event.preventDefault();

        if (!upErrorSuppressed) {
          console.log("Suppressing 'No UP found' error - this is expected for some wallets");
          setUpErrorSuppressed(true);
        }
      }
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, [upErrorSuppressed]);

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
