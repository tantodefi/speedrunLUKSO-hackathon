import { Chain } from "viem/chains";

export const lukso = {
  id: 4201,
  name: "LUKSO Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "LYXt",
    symbol: "LYXt",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.lukso.network"],
      webSocket: ["wss://rpc.testnet.lukso.network/ws"],
    },
    public: {
      http: ["https://rpc.testnet.lukso.network"],
      webSocket: ["wss://rpc.testnet.lukso.network/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "LUKSO Testnet Explorer",
      url: "https://explorer.testnet.lukso.network",
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 42,
    },
  },
} as const satisfies Chain;
