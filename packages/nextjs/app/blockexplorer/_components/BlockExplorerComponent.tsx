import { useState } from "react";
import { PaginationButton } from "./PaginationButton";
import { SearchBar } from "./SearchBar";
import { TransactionsTable } from "./TransactionsTable";
import { useFetchBlocks } from "~~/hooks/scaffold-eth";

export const BlockExplorerComponent = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const { blocks, transactionReceipts, totalBlocks } = useFetchBlocks();

  return (
    <div className="container mx-auto my-10">
      <SearchBar />
      <TransactionsTable blocks={blocks} transactionReceipts={transactionReceipts} />
      <PaginationButton currentPage={currentPage} totalItems={Number(totalBlocks)} setCurrentPage={setCurrentPage} />
    </div>
  );
};
