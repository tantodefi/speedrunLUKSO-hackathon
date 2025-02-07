import { wagmiConnectors } from "./wagmiConnectors";
import { Chain, createClient, http } from "viem";
import { mainnet } from "viem/chains";
import { createConfig } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";

const { targetNetworks } = scaffoldConfig;

// We always want to have mainnet enabled (ENS resolution, ETH price, etc). But only once.
const enabledChains = targetNetworks.find((network: Chain) => network.id === mainnet.id)
  ? targetNetworks
  : ([...targetNetworks, mainnet] as const);

export const wagmiConfig = createConfig({
  chains: enabledChains,
  connectors: wagmiConnectors,
  ssr: true,
  client({ chain }) {
    // Use type assertion to treat chain.id as number
    const chainId = chain.id as number;
    const transport = http(chain.rpcUrls.default.http[0]);

    return createClient({
      chain,
      transport,
      ...(chainId !== 31337 // hardhat.id
        ? {
            batch: {
              multicall: {
                batchSize: 1024 * 200,
              },
            },
          }
        : {}),
    });
  },
});
