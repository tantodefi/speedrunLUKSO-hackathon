"use client";

import { useEffect, useState } from "react";
import { PaginationButton } from "./_components/PaginationButton";
import { SearchBar } from "./_components/SearchBar";
import { TransactionsTable } from "./_components/TransactionsTable";
import type { NextPage } from "next";
import { useFetchBlocks } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { notification } from "~~/utils/scaffold-eth";

const BlockExplorer: NextPage = () => {
  const { targetNetwork } = useTargetNetwork();
  const [currentPage, setCurrentPage] = useState(1);
  const [hasError, setHasError] = useState(false);
  const isLocalNetwork = targetNetwork.id === 31337;
  const { blocks, transactionReceipts, totalBlocks } = useFetchBlocks();

  useEffect(() => {
    if (!isLocalNetwork) {
      notification.error("Target network must be localhost. Please switch to localhost to use the block explorer.");
      setHasError(true);
    }
  }, [isLocalNetwork]);

  if (hasError) {
    return (
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-4xl font-bold">Block Explorer</span>
          </h1>
          <div className="text-center text-lg">Please switch to localhost to use the block explorer</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto my-10">
      <SearchBar />
      <TransactionsTable blocks={blocks} transactionReceipts={transactionReceipts} />
      <PaginationButton currentPage={currentPage} totalItems={Number(totalBlocks)} setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default BlockExplorer;
