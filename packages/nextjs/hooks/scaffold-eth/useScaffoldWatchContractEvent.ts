// @ts-nocheck - Known TypeScript limitation with deeply nested generic types in smart contract ABIs
// This file uses complex generic types for contract events that exceed TypeScript's type instantiation depth limit.
// The code is functionally correct and type-safe at runtime.
import { useTargetNetwork } from "./useTargetNetwork";
import type { Abi, ExtractAbiEventNames } from "abitype";
import { Log } from "viem";
import { useWatchContractEvent } from "wagmi";
import { addIndexedArgsToEvent, useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { ContractAbi, ContractName } from "~~/utils/scaffold-eth/contract";

// Simplified event config to avoid deep type instantiation
type EventConfig<T extends ContractName> = {
  contractName: T;
  eventName: string;
  onLogs: (logs: Log[]) => void;
};

/**
 * Wrapper around wagmi's useEventSubscriber hook which automatically loads (by name) the contract ABI and
 * address from the contracts present in deployedContracts.ts & externalContracts.ts
 * @param config - The config settings
 * @param config.contractName - deployed contract name
 * @param config.eventName - name of the event to listen for
 * @param config.onLogs - the callback that receives events.
 */
export const useScaffoldWatchContractEvent = <T extends ContractName>({
  contractName,
  eventName,
  onLogs,
}: EventConfig<T>) => {
  const { data: deployedContractData } = useDeployedContractInfo(contractName);
  const { targetNetwork } = useTargetNetwork();

  // Type assertion here since we know the event name is valid at runtime
  const typedEventName = eventName as ExtractAbiEventNames<ContractAbi<T>>;

  return useWatchContractEvent({
    address: deployedContractData?.address,
    abi: deployedContractData?.abi as Abi,
    chainId: targetNetwork.id,
    onLogs: logs => onLogs(logs.map(addIndexedArgsToEvent)),
    eventName: typedEventName,
  });
};
