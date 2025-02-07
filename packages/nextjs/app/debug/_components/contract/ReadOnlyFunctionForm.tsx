"use client";

import { useEffect } from "react";
import { Abi, AbiFunction } from "abitype";
import { Address } from "viem";
import { useContractRead } from "wagmi";
import { ContractInput } from "~~/app/debug/_components/contract/ContractInput";
import {
  getFunctionInputKey,
  getInitialFormState,
  transformAbiFunction,
} from "~~/app/debug/_components/contract/utilsContract";
import { notification } from "~~/utils/scaffold-eth";
import { getParsedError } from "~~/utils/scaffold-eth/getParsedError";

interface ReadOnlyFunctionFormProps {
  contractAddress: Address;
  abiFunction: AbiFunction;
  inheritedFrom?: string;
  abi: Abi;
}

interface TransformedInput {
  name: string;
  type: string;
  baseType: string;
  arrayOptions?: {
    length?: number;
    elementType: string;
  };
}

export const ReadOnlyFunctionForm = ({
  contractAddress,
  abiFunction,
  inheritedFrom,
  abi,
}: ReadOnlyFunctionFormProps) => {
  const initialForm = getInitialFormState(abiFunction);

  const {
    data: result,
    isFetching,
    refetch,
    error,
  } = useContractRead({
    address: contractAddress,
    abi: abi,
    functionName: abiFunction.name,
    args: Object.values(initialForm),
    query: {
      enabled: false,
      retry: false,
    },
  });

  useEffect(() => {
    if (error) {
      const parsedError = getParsedError(error);
      notification.error(parsedError);
    }
  }, [error]);

  const transformedFunction = transformAbiFunction(abiFunction);
  const inputElements = transformedFunction.inputs.map((input: TransformedInput, inputIndex: number) => {
    const key = getFunctionInputKey(abiFunction.name, input, inputIndex);
    return (
      <ContractInput
        key={key}
        setForm={() => undefined} // Read-only form doesn't need form state
        form={initialForm}
        stateObjectKey={key}
        paramType={input}
      />
    );
  });

  return (
    <div className="flex flex-col gap-3 py-5 first:pt-0 last:pb-0">
      <p className="font-medium my-0 break-words">
        {abiFunction.name}
        {inheritedFrom && <span className="text-gray-400 font-normal"> (Inherited from {inheritedFrom})</span>}
      </p>
      {inputElements}
      <div className="flex justify-between gap-2">
        <div className="flex-grow">
          {result !== undefined && (
            <div className="bg-secondary rounded-3xl text-sm px-4 py-2">
              <div>Return value: {result as string}</div>
            </div>
          )}
        </div>
        <button
          className={`btn btn-secondary btn-sm ${isFetching ? "loading" : ""}`}
          onClick={async () => {
            await refetch();
          }}
        >
          Read 📡
        </button>
      </div>
    </div>
  );
};
