"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { ArrowLeftOnRectangleIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useUniversalProfile } from "~~/contexts/universal-profile/UniversalProfileContext";

interface Props {
  className?: string;
}

export const UPRainbowKitCustomConnectButton = ({ className = "" }: Props) => {
  const { disconnect } = useDisconnect();
  const { profile } = useUniversalProfile();

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;

        return (
          <>
            {(() => {
              if (!connected) {
                return (
                  <button className={`btn btn-primary btn-sm ${className}`} onClick={openConnectModal} type="button">
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button className="btn btn-error btn-sm" onClick={openChainModal} type="button">
                    Wrong network
                  </button>
                );
              }

              return (
                <div className="flex justify-end items-center">
                  <button
                    onClick={openChainModal}
                    className="btn btn-secondary btn-sm mr-2"
                    type="button"
                    title="Chain Selector"
                  >
                    {chain.hasIcon && (
                      <div className="mt-1">
                        {chain.iconUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={chain.name ?? "Chain icon"} src={chain.iconUrl} className="w-4 h-4" />
                        )}
                      </div>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="btn btn-secondary btn-sm pl-0 pr-2 shadow-md"
                    >
                      <div className="flex items-center">
                        <div className="ml-2 mr-1">
                          {profile?.name || `${account.address?.slice(0, 6)}...${account.address?.slice(-4)}`}
                        </div>
                        <ChevronDownIcon className="h-6 w-4" />
                      </div>
                    </button>

                    <button className="btn btn-secondary btn-sm" onClick={() => disconnect()} title="Disconnect">
                      <ArrowLeftOnRectangleIcon className="h-6 w-4" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
};
