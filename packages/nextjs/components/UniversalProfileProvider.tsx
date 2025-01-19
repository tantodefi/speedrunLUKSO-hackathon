"use client";

import { type PropsWithChildren } from "react";
import { UniversalProfileProvider as Provider } from "~~/contexts/UniversalProfileContext";

export const UniversalProfileProvider = ({ children }: PropsWithChildren) => {
  return <Provider>{children}</Provider>;
};
