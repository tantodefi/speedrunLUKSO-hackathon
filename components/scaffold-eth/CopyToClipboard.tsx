"use client";

import type { ComponentClass, ReactNode } from "react";
import { CopyToClipboard as RawCopyToClipboard } from "react-copy-to-clipboard";

interface CopyToClipboardProps {
  text: string;
  onCopy?: (text: string, result: boolean) => void;
  children: ReactNode;
  options?: {
    debug?: boolean;
    message?: string;
  };
}

const CopyToClipboard: ComponentClass<CopyToClipboardProps> = RawCopyToClipboard;

export { CopyToClipboard };
export type { CopyToClipboardProps }; 