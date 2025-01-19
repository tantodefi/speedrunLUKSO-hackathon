"use client";

import { type PropsWithChildren } from "react";
import { UniversalProfileProvider as Provider } from "~~/contexts/UniversalProfileContext";

interface Props extends PropsWithChildren {
  address?: string;
}

export const UniversalProfileProvider = ({ children, address }: Props) => {
  console.log("UniversalProfileProvider rendering with address:", address);
  return <Provider address={address}>{children}</Provider>;
};
