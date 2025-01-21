"use client";

import { useState } from "react";
import Link from "next/link";
import { CopyToClipboard as RawCopyToClipboard } from "react-copy-to-clipboard";
import { CheckCircleIcon, DocumentDuplicateIcon } from "@heroicons/react/24/outline";

type CopyToClipboardProps = {
  text: string;
  onCopy: (text: string, result: boolean) => void;
  children: React.ReactNode;
};

const CopyToClipboard =
  RawCopyToClipboard as unknown as React.FC<CopyToClipboardProps> as React.ComponentType<CopyToClipboardProps>;

export const TransactionHash = ({ hash }: { hash: string }) => {
  const [addressCopied, setAddressCopied] = useState(false);

  return (
    <div className="flex items-center">
      <Link href={`/blockexplorer/transaction/${hash}`}>
        {hash?.substring(0, 6)}...{hash?.substring(hash.length - 4)}
      </Link>
      {addressCopied ? (
        <CheckCircleIcon
          className="ml-1.5 text-xl font-normal text-sky-600 h-5 w-5 cursor-pointer"
          aria-hidden="true"
        />
      ) : (
        <CopyToClipboard
          text={hash as string}
          onCopy={(_text, result) => {
            setAddressCopied(result);
          }}
        >
          <DocumentDuplicateIcon
            className="ml-1.5 text-xl font-normal text-sky-600 h-5 w-5 cursor-pointer"
            aria-hidden="true"
          />
        </CopyToClipboard>
      )}
    </div>
  );
};
