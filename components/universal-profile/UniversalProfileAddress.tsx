"use client";

import React, { useState } from "react";
import type { FC } from "react";
import { CopyToClipboard } from "../scaffold-eth/CopyToClipboard";

interface UniversalProfileAddressProps {
  address: string;
}

export const UniversalProfileAddress: FC<UniversalProfileAddressProps> = ({ address }) => {
  const [addressCopied, setAddressCopied] = useState(false);

  return (
    <div className="relative">
      <CopyToClipboard 
        text={address} 
        onCopy={(_text: string, result: boolean) => {
          setAddressCopied(result);
          setTimeout(() => setAddressCopied(false), 800);
        }}
      >
        <pre className="my-2 p-2 bg-neutral-900 text-neutral-100 rounded-lg overflow-x-auto">
          <code>{address}</code>
          <div className="absolute top-2 right-2">
            {addressCopied ? "✅" : "📋"}
          </div>
        </pre>
      </CopyToClipboard>
    </div>
  );
}; 