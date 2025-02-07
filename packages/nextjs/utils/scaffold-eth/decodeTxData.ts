import { TransactionWithFunction } from "./block";
import { GenericContractsDeclaration } from "./contract";
import { Abi, AbiFunction, AbiParameter, decodeFunctionData, getAbiItem } from "viem";
import { hardhat } from "viem/chains";
import contractData from "~~/contracts/deployedContracts";

type ContractsInterfaces = Record<string, Abi>;
type TransactionType = TransactionWithFunction | null;

const deployedContracts = contractData as GenericContractsDeclaration | null;
const chainMetaData = deployedContracts?.[hardhat.id];
const interfaces = chainMetaData
  ? Object.entries(chainMetaData).reduce((finalInterfacesObj, [contractName, contract]) => {
      finalInterfacesObj[contractName] = contract.abi;
      return finalInterfacesObj;
    }, {} as ContractsInterfaces)
  : {};

export const decodeTransactionData = (tx: TransactionWithFunction): TransactionWithFunction => {
  // Skip if transaction is a contract creation or has no input data
  if (!tx.input || tx.input.length < 10 || tx.input.startsWith("0x60e06040")) {
    return tx;
  }

  // Try to decode the transaction data using all known contract interfaces
  for (const [, contractAbi] of Object.entries(interfaces)) {
    try {
      const { functionName, args } = decodeFunctionData({
        abi: contractAbi,
        data: tx.input,
      });

      const abiItem = getAbiItem<AbiFunction[], string>({
        abi: contractAbi as AbiFunction[],
        name: functionName,
      });

      return {
        ...tx,
        functionName,
        functionArgs: args as any[],
        functionArgNames: abiItem?.inputs?.map((input: AbiParameter) => input.name ?? "") ?? [],
        functionArgTypes: abiItem?.inputs?.map((input: AbiParameter) => input.type) ?? [],
      };
    } catch (e) {
      // Continue trying with next ABI if decoding fails
      continue;
    }
  }

  // Return original transaction if decoding fails with all ABIs
  return tx;
};

export const getFunctionDetails = (transaction: TransactionType): string => {
  if (
    !transaction?.functionName ||
    !transaction?.functionArgNames ||
    !transaction?.functionArgTypes ||
    !transaction?.functionArgs
  ) {
    return "";
  }

  const details = transaction.functionArgNames.map(
    (name, i) => `${transaction.functionArgTypes?.[i] || ""} ${name} = ${transaction.functionArgs?.[i] ?? ""}`,
  );

  return `${transaction.functionName}(${details.join(", ")})`;
};
