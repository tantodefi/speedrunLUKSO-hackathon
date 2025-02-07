"use client";

import { useEffect } from "react";
import { displayTxResult } from "./utilsDisplay";
import { Abi, AbiFunction } from "abitype";
import { Address } from "viem";
import { useContractRead } from "wagmi";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useAnimationConfig } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

export interface DisplayVariableProps {
  contractAddress: Address;
  abiFunction: AbiFunction;
  refreshDisplayVariables: boolean;
  inheritedFrom?: string;
  abi: Abi;
  onChange?: () => void;
}

export const DisplayVariable = ({
  contractAddress,
  abiFunction,
  refreshDisplayVariables,
  abi,
  inheritedFrom,
  onChange,
}: DisplayVariableProps) => {
  const { targetNetwork } = useTargetNetwork();
  const {
    data: result,
    isFetching,
    refetch,
  } = useContractRead({
    address: contractAddress,
    abi: abi,
    functionName: abiFunction.name,
    chainId: targetNetwork.id,
    query: {
      enabled: true,
      refetchInterval: 10000,
    },
  });

  const { showAnimation } = useAnimationConfig(result);

  useEffect(() => {
    refetch();
    if (onChange) {
      onChange();
    }
  }, [refetch, refreshDisplayVariables, onChange]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <h3 className="font-medium my-0 break-words">
          {abiFunction.name}
          {inheritedFrom && <span className="text-gray-400 font-normal"> (Inherited from {inheritedFrom})</span>}
        </h3>
        <button
          className={`btn btn-ghost btn-xs ${isFetching ? "loading" : ""}`}
          onClick={async () => {
            await refetch();
          }}
        >
          {!isFetching && <ArrowPathIcon className="h-3 w-3" />}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className={`break-all block transition bg-transparent ${showAnimation ? "bg-warning" : ""}`}>
          {displayTxResult(result)}
        </div>
      </div>
    </div>
  );
};
