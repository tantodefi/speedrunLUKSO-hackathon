import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, rainbowWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { rainbowkitBurnerWallet } from "burner-connector";
import { Chain } from "viem";
import scaffoldConfig from "~~/scaffold.config";

const { onlyLocalBurnerWallet, targetNetworks } = scaffoldConfig;

// We want to show the recommended wallets for LUKSO networks and non-testnet networks
const shouldShowRecommendedWallets = targetNetworks.some((network: Chain) => {
  const chainId = network.id as number;
  return (
    chainId === 42 || // luksoMainnet
    chainId === 4201 || // luksoTestnet
    chainId !== 31337
  ); // not hardhat
});

// Check if we should show the burner wallet
const shouldShowBurnerWallet = !shouldShowRecommendedWallets || !onlyLocalBurnerWallet;

// Custom wallet groups
const walletGroups = [
  {
    groupName: "Recommended",
    wallets: [
      () => metaMaskWallet({ projectId: scaffoldConfig.walletConnectProjectId }),
      () => rainbowWallet({ projectId: scaffoldConfig.walletConnectProjectId }),
      () => walletConnectWallet({ projectId: scaffoldConfig.walletConnectProjectId }),
    ],
  },
  // Only include Development group if burner wallet should be shown
  ...(shouldShowBurnerWallet
    ? [
        {
          groupName: "Development",
          wallets: [() => rainbowkitBurnerWallet()],
        },
      ]
    : []),
];

/**
 * wagmi connectors for the wagmi context
 */
export const wagmiConnectors = connectorsForWallets(walletGroups, {
  appName: "LSP17 Stealth Extension",
  projectId: scaffoldConfig.walletConnectProjectId,
});
