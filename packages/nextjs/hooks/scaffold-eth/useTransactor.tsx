import { getPublicClient } from "@wagmi/core";
import { Hash, SendTransactionParameters, WalletClient } from "viem";
import { Config, useWalletClient } from "wagmi";
import { SendTransactionMutate } from "wagmi/query";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import { TransactorFuncOptions } from "~~/utils/scaffold-eth/contract";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth/getBlockExplorerTxLink";
import { getParsedError } from "~~/utils/scaffold-eth/getParsedError";
import { notification } from "~~/utils/scaffold-eth/notification";

type TransactionFunc = (
  tx: (() => Promise<Hash>) | Parameters<SendTransactionMutate<Config, undefined>>[0],
  options?: TransactorFuncOptions,
) => Promise<Hash | undefined>;

/**
 * Runs Transaction passed in to returned function showing UI feedback.
 * @param _walletClient - Optional wallet client to use. If not provided, will use the one from useWalletClient.
 * @returns function that takes in transaction function as callback, shows UI feedback for transaction and returns a promise of the transaction hash
 */
export const useTransactor = (_walletClient?: WalletClient): TransactionFunc => {
  let walletClient = _walletClient;
  const { data } = useWalletClient();
  if (walletClient === undefined && data) {
    walletClient = data;
  }

  const result: TransactionFunc = async (tx, options) => {
    if (!walletClient) {
      notification.error("Cannot access account");
      console.error("⚡️ ~ file: useTransactor.tsx ~ error");
      return;
    }

    let transactionHash: Hash | undefined = undefined;
    try {
      const network = await walletClient.getChainId();
      // Get full transaction from public client
      const publicClient = getPublicClient(wagmiConfig);

      notification.info("Awaiting for user confirmation");
      if (typeof tx === "function") {
        // Tx is already prepared by the caller
        const result = await tx();
        transactionHash = result;
      } else if (tx != null) {
        transactionHash = await walletClient.sendTransaction(tx as SendTransactionParameters);
      } else {
        throw new Error("Incorrect transaction passed to transactor");
      }

      const blockExplorerTxURL = network ? getBlockExplorerTxLink(network, transactionHash) : "";

      notification.info("Waiting for transaction to complete.", {
        description: blockExplorerTxURL ? (
          <a href={blockExplorerTxURL} target="_blank" rel="noreferrer" className="block link text-md">
            check out transaction
          </a>
        ) : undefined,
      });

      const transactionReceipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
        confirmations: options?.blockConfirmations,
      });

      notification.success("Transaction completed successfully!", {
        description: blockExplorerTxURL ? (
          <a href={blockExplorerTxURL} target="_blank" rel="noreferrer" className="block link text-md">
            check out transaction
          </a>
        ) : undefined,
      });

      if (options?.onBlockConfirmation) options.onBlockConfirmation(transactionReceipt);
    } catch (error: any) {
      console.error("⚡️ ~ file: useTransactor.ts ~ error", error);
      const message = getParsedError(error);
      notification.error(message);
      throw error;
    }

    return transactionHash;
  };

  return result;
};
