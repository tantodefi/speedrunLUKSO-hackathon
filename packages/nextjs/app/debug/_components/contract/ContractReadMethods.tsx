import { Abi, AbiFunction } from "abitype";
import { ReadOnlyFunctionForm } from "~~/app/debug/_components/contract";
import { Contract, ContractName } from "~~/utils/scaffold-eth/contract";

type DisplayedContractFunction = {
  fn: AbiFunction;
  inheritedFrom?: string;
};

export const ContractReadMethods = ({ deployedContractData }: { deployedContractData: Contract<ContractName> }) => {
  if (!deployedContractData) {
    return null;
  }

  const functionsToDisplay = ((deployedContractData.abi || []) as Abi)
    .filter((part: unknown): part is AbiFunction => {
      return typeof part === "object" && part !== null && (part as { type?: string }).type === "function";
    })
    .filter((fn: AbiFunction) => {
      const isQueryableWithParams =
        (fn.stateMutability === "view" || fn.stateMutability === "pure") && fn.inputs.length > 0;
      return isQueryableWithParams;
    })
    .map((fn: AbiFunction): DisplayedContractFunction => {
      const inheritedFrom = deployedContractData.inheritedFunctions?.[fn.name];
      return {
        fn,
        inheritedFrom,
      };
    });

  if (!functionsToDisplay.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="font-bold text-lg">Read Methods</span>
      {functionsToDisplay.map(({ fn, inheritedFrom }: DisplayedContractFunction) => (
        <ReadOnlyFunctionForm
          key={fn.name}
          abi={deployedContractData.abi as Abi}
          abiFunction={fn}
          contractAddress={deployedContractData.address}
          inheritedFrom={inheritedFrom}
        />
      ))}
    </div>
  );
};
