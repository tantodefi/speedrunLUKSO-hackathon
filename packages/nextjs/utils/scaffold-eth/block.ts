import { Block, Transaction, TransactionReceipt } from "viem";

export type TransactionWithFunction = Transaction & {
  functionName?: string;
  functionArgs?: any[];
  functionArgNames?: string[];
  functionArgTypes?: string[];
};

export interface TransactionReceipts {
  [key: string]: TransactionReceipt;
}

export interface TransactionsTableProps {
  blocks: Block[];
  transactionReceipts: TransactionReceipts;
}

export type BlockExplorerTransaction = Transaction & {
  functionName?: string;
  functionArgs?: any[];
  functionArgNames?: string[];
  functionArgTypes?: string[];
  receipt?: TransactionReceipt;
  block?: Block;
};
