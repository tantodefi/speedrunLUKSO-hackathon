"use client";

import { useState } from "react";
import { InheritanceTooltip } from "./InheritanceTooltip";
import { Abi, AbiFunction, AbiParameter } from "abitype";
import { Address, TransactionReceipt } from "viem";
import { useAccount, useWalletClient } from "wagmi";
import {
  ContractInput,
  TxReceipt,
  getFunctionInputKey,
  getInitialFormState,
  transformAbiFunction,
} from "~~/app/debug/_components/contract";
import { IntegerInput } from "~~/components/scaffold-eth";
import { useTransactor } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { notification } from "~~/utils/scaffold-eth";
import { getParsedError } from "~~/utils/scaffold-eth/getParsedError";

interface WriteOnlyFunctionFormProps {
  abiFunction: AbiFunction;
  contractAddress: Address;
  inheritedFrom?: string;
  abi: Abi;
  onChange?: () => void;
}

interface InputComponent extends AbiParameter {
  name: string;
  type: string;
  components?: AbiParameter[];
}

export const WriteOnlyFunctionForm = ({
  abiFunction,
  contractAddress,
  inheritedFrom,
  abi,
  onChange,
}: WriteOnlyFunctionFormProps) => {
  const [form, setForm] = useState<Record<string, any>>(() => getInitialFormState(abiFunction));
  const [txValue, setTxValue] = useState<string | bigint>("");
  const [isMining, setIsMining] = useState(false);
  const { chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { targetNetwork } = useTargetNetwork();
  const writeDisabled = !chain || chain?.id !== targetNetwork.id;

  const [displayedTxResult, setDisplayedTxResult] = useState<TransactionReceipt>();

  const transactor = useTransactor(walletClient);

  const handleWrite = async () => {
    if (!walletClient) return;

    try {
      setIsMining(true);
      await transactor(
        async () => {
          const tx = await walletClient.writeContract({
            address: contractAddress,
            abi,
            functionName: abiFunction.name,
            args: Object.values(form),
            value: txValue ? BigInt(txValue) : undefined,
          });
          return tx;
        },
        {
          onBlockConfirmation: receipt => {
            setDisplayedTxResult(receipt);
            notification.success("Transaction completed successfully!");
            if (onChange) {
              onChange();
            }
          },
        },
      );
    } catch (e: any) {
      const message = getParsedError(e);
      notification.error(message);
    } finally {
      setIsMining(false);
    }
  };

  // TODO use `useMemo` to optimize also update in ReadOnlyFunctionForm
  const transformedFunction = transformAbiFunction(abiFunction);
  const inputs = transformedFunction.inputs.map((input: InputComponent, inputIndex: number) => {
    const key = getFunctionInputKey(abiFunction.name, input, inputIndex);
    return <ContractInput key={key} setForm={setForm} form={form} stateObjectKey={key} paramType={input} />;
  });
  const zeroInputs = inputs.length === 0 && abiFunction.stateMutability !== "payable";

  return (
    <div className="py-5 space-y-3 first:pt-0 last:pb-1">
      <div className={`flex gap-3 ${zeroInputs ? "flex-row justify-between items-center" : "flex-col"}`}>
        <p className="font-medium my-0 break-words">
          {abiFunction.name}
          <InheritanceTooltip inheritedFrom={inheritedFrom} />
        </p>
        {inputs}
        {abiFunction.stateMutability === "payable" ? (
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center ml-2">
              <span className="text-xs font-medium mr-2 leading-none">payable value</span>
              <span className="block text-xs font-extralight leading-none">wei</span>
            </div>
            <IntegerInput
              value={txValue}
              onChange={(value: string | bigint) => setTxValue(value)}
              placeholder="value (wei)"
            />
          </div>
        ) : null}
        <div className="flex justify-between gap-2">
          {!zeroInputs && (
            <div className="flex-grow basis-0">
              {displayedTxResult ? <TxReceipt txResult={displayedTxResult} /> : null}
            </div>
          )}
          <div
            className={`flex ${
              writeDisabled &&
              "tooltip before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
            }`}
            data-tip={`${writeDisabled && "Wallet not connected or in the wrong network"}`}
          >
            <button
              className={`btn btn-secondary btn-sm ${isMining ? "loading" : ""}`}
              onClick={handleWrite}
              disabled={isMining || writeDisabled || !walletClient}
            >
              {isMining && <span className="loading loading-spinner loading-xs"></span>}
              Send 💸
            </button>
          </div>
        </div>
      </div>
      {zeroInputs && displayedTxResult ? (
        <div className="flex-grow basis-0">
          <TxReceipt txResult={displayedTxResult} />
        </div>
      ) : null}
    </div>
  );
};
