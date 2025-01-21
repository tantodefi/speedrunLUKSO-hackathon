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
import * as chains from "viem/chains";
import scaffoldConfig from "~~/scaffold.config";
import { lukso } from "~~/utils/scaffold-eth/chains";

const { onlyLocalBurnerWallet, targetNetworks } = scaffoldConfig;

// Custom wallet groups
const upCompatibleWallets = [
  {
    groupName: "Universal Profile Compatible",
    wallets: [
      walletConnectWallet, // UP Browser Extension uses WalletConnect
    ],
  },
  {
    groupName: "Other Wallets",
    wallets: [
      metaMaskWallet,
      ledgerWallet,
      coinbaseWallet,
      rainbowWallet,
      safeWallet,
      ...(!targetNetworks.some(
        network => network.id !== (chains.hardhat as chains.Chain).id && network.id !== lukso.id,
      ) || !onlyLocalBurnerWallet
        ? [rainbowkitBurnerWallet]
        : []),
    ],
  },
];

/**
 * wagmi connectors for the wagmi context
 */
export const wagmiConnectors = connectorsForWallets(upCompatibleWallets, {
  appName: "LSP17 Stealth Extension",
  projectId: scaffoldConfig.walletConnectProjectId,
});
