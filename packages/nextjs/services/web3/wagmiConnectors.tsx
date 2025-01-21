import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  ledgerWallet,
  metaMaskWallet,
  rainbowWallet,
  safeWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { rainbowkitBurnerWallet } from "burner-connector";
import type { Chain } from "viem";
import * as chains from "viem/chains";
import scaffoldConfig from "~~/scaffold.config";
import { luksoTestnet } from "~~/utils/scaffold-eth/chains";

const { onlyLocalBurnerWallet, targetNetworks } = scaffoldConfig;

// Custom wallet groups
const walletGroups = [
  {
    groupName: "Universal Profile Compatible",
    wallets: [
      () => walletConnectWallet({ projectId: scaffoldConfig.walletConnectProjectId }), // UP Browser Extension uses WalletConnect
    ],
  },
  {
    groupName: "Other Wallets",
    wallets: [
      () => metaMaskWallet({ projectId: scaffoldConfig.walletConnectProjectId }),
      () => ledgerWallet({ projectId: scaffoldConfig.walletConnectProjectId }),
      () => coinbaseWallet({ appName: "LSP17 Stealth Extension" }),
      () => rainbowWallet({ projectId: scaffoldConfig.walletConnectProjectId }),
      () => safeWallet(),
      // Only show burner wallet if we're on hardhat or if onlyLocalBurnerWallet is false
      ...(!targetNetworks.some(
        network => network.id !== (chains.hardhat as Chain).id && network.id !== luksoTestnet.id,
      ) || !onlyLocalBurnerWallet
        ? [() => rainbowkitBurnerWallet()]
        : []),
    ],
  },
];

/**
 * wagmi connectors for the wagmi context
 */
export const wagmiConnectors = connectorsForWallets(walletGroups, {
  appName: "LSP17 Stealth Extension",
  projectId: scaffoldConfig.walletConnectProjectId,
});
