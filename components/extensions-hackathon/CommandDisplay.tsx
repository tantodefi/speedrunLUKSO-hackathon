"use client";

import React, { useState } from "react";
import type { FC } from "react";
import { CopyToClipboard } from "../scaffold-eth/CopyToClipboard";

interface CommandDisplayProps {
  command: string;
}

export const CommandDisplay: FC<CommandDisplayProps> = ({ command }) => {
  const [commandCopied, setCommandCopied] = useState(false);

  return (
    <div className="relative">
      <CopyToClipboard 
        text={command} 
        onCopy={(_text: string, result: boolean) => {
          setCommandCopied(result);
          setTimeout(() => setCommandCopied(false), 800);
        }}
      >
        <pre className="my-2 p-2 bg-neutral-900 text-neutral-100 rounded-lg overflow-x-auto">
          <code>{command}</code>
          <div className="absolute top-2 right-2">
            {commandCopied ? "✅" : "📋"}
          </div>
        </pre>
      </CopyToClipboard>
    </div>
  );
}; 