import { getTargetNetworks } from "./networks";
import { Hash } from "viem";

/**
 * Get transaction URL for block explorer
 */
export const getBlockExplorerTxLink = (chainId: number, txnHash: Hash) => {
  const networks = getTargetNetworks();
  const network = networks.find(n => n.id === chainId);
  if (network?.blockExplorers?.default.url && txnHash) {
    return `${network.blockExplorers.default.url}/tx/${txnHash}`;
  }
  return "";
};
