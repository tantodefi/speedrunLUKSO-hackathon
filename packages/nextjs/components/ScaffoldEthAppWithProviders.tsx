"use client";

import { useEffect, useState } from "react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { WagmiConfig } from "wagmi";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { ProgressBar } from "~~/components/scaffold-eth/ProgressBar";
import { UniversalProfileProvider } from "~~/contexts/universal-profile/UniversalProfileContext";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="relative flex flex-col flex-1">
          <UniversalProfileProvider>{children}</UniversalProfileProvider>
        </main>
        <Footer />
      </div>
      <Toaster />
    </>
  );
};

const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="relative flex flex-col flex-1">
          <div className="animate-pulse">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return <>{children}</>;
};

export const ScaffoldEthAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={wagmiConfig}>
        <ClientOnly>
          <RainbowKitProvider
            avatar={BlockieAvatar}
            theme={{
              lightMode: lightTheme(),
              darkMode: darkTheme(),
            }}
          >
            <ProgressBar />
            <ScaffoldEthApp>{children}</ScaffoldEthApp>
          </RainbowKitProvider>
        </ClientOnly>
      </WagmiConfig>
    </QueryClientProvider>
  );
};
