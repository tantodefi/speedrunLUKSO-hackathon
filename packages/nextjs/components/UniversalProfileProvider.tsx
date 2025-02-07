"use client";

import { UniversalProfileProvider as Provider } from "~~/contexts/UniversalProfileContext";

interface Props {
  children: React.ReactNode;
}

export const UniversalProfileProvider = ({ children }: Props) => {
  return <Provider>{children}</Provider>;
};
