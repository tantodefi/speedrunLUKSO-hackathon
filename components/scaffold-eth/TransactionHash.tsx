"use client";

import React, { useState } from "react";
import CopyToClipboard from "./CopyToClipboard";

interface TransactionHashProps {
  hash: string;
}

export const TransactionHash: React.FC<TransactionHashProps> = ({ hash }) => {
  const [addressCopied, setAddressCopied] = useState(false);

  return (
    <div className="relative">
      <CopyToClipboard 
        text={hash} 
        onCopy={(_text: string, result: boolean) => {
          setAddressCopied(result);
          setTimeout(() => setAddressCopied(false), 800);
        }}
      >
        <pre className="my-2 p-2 bg-neutral-900 text-neutral-100 rounded-lg overflow-x-auto">
          <code>{hash}</code>
          <div className="absolute top-2 right-2">
            {addressCopied ? "✅" : "📋"}
          </div>
        </pre>
      </CopyToClipboard>
    </div>
  );
}; 