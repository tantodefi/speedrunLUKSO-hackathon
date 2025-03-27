"use client";

import { Space_Mono } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import { ThemeProvider } from "next-themes";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { UniversalProfileProvider } from "~~/contexts/UniversalProfileContext";
import { CrossDomainSessionProvider } from "~~/providers/CrossDomainSessionProvider";
import { UPProviderWrapper } from "~~/providers/UPProviderWrapper";
import "~~/styles/globals.css";

const spaceMono = Space_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className={spaceMono.variable}>
        <CrossDomainSessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ScaffoldEthAppWithProviders>
              <UPProviderWrapper>
                <UniversalProfileProvider>{children}</UniversalProfileProvider>
              </UPProviderWrapper>
            </ScaffoldEthAppWithProviders>
          </ThemeProvider>
        </CrossDomainSessionProvider>
      </body>
    </html>
  );
}
