import { authOptions as baseAuthOptions } from "./auth";
import { createSiweProvider } from "./authProviders";
import type { CookiesOptions, NextAuthOptions } from "next-auth";

// Deep clone the base auth options
const authOptions: NextAuthOptions = JSON.parse(JSON.stringify(baseAuthOptions));

// Override the providers to ensure authorize handler is defined
authOptions.providers = [createSiweProvider()];

// Extract the root domain to allow cookie sharing across subdomains
let rootDomain = undefined;

if (process.env.VERCEL) {
  if (process.env.NEXTAUTH_URL) {
    try {
      const url = new URL(process.env.NEXTAUTH_URL);
      // Extract the root domain for cookie sharing (e.g., extract "speedrunlukso.com" from "www.speedrunlukso.com")
      const hostParts = url.hostname.split(".");
      if (hostParts.length > 1) {
        // Get the last two parts (e.g., "speedrunlukso.com")
        rootDomain = `.${hostParts.slice(-2).join(".")}`;
      } else {
        rootDomain = url.hostname;
      }
      console.log("Using root domain for cookies:", rootDomain);
    } catch (e) {
      console.error("Invalid NEXTAUTH_URL:", e);
    }
  } else {
    rootDomain = process.env.NEXT_PUBLIC_VERCEL_URL || ".vercel.app";
  }
}

// For debugging
console.log("Final domain configuration:", {
  rootDomain,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
});

// Update cookie settings for Vercel with root domain
if (rootDomain && authOptions.cookies) {
  console.log("Configuring cookies for root domain:", rootDomain);

  // Configure all cookie settings to work across subdomains
  Object.keys(authOptions.cookies).forEach(cookieKey => {
    const key = cookieKey as keyof CookiesOptions;

    if (key && authOptions.cookies && authOptions.cookies[key]) {
      authOptions.cookies[key] = {
        ...authOptions.cookies[key],
        options: {
          ...authOptions.cookies[key]?.options,
          secure: true,
          sameSite: "lax", // "none" for cross-origin, "lax" for same-site but across subdomains
          domain: rootDomain.startsWith(".") ? rootDomain : `.${rootDomain}`, // Make sure it has a leading dot
          path: "/", // Ensure cookies are available across all paths
        },
      };
    }
  });
}

// Add debug output for cookie configuration
authOptions.logger = {
  ...authOptions.logger,
  debug(code, metadata) {
    console.log("NextAuth debug:", { code, metadata, cookieConfig: authOptions.cookies });
  },
};

export { authOptions };
