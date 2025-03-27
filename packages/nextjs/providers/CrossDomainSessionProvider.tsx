"use client";

import React, { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

export function CrossDomainSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      // Set a relatively short refetchInterval to ensure session stays fresh across subdomains
      refetchInterval={5 * 60} // 5 minutes in seconds
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  );
}
