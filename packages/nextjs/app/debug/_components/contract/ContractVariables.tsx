import { DisplayVariable } from "./DisplayVariable";
import { Abi, AbiFunction } from "abitype";
import { Contract, ContractName } from "~~/utils/scaffold-eth/contract";

type DisplayedContractFunction = {
  fn: AbiFunction;
  inheritedFrom?: string;
};

interface AbiItem {
  type?: string;
}

export const ContractVariables = ({
  refreshDisplayVariables,
  deployedContractData,
  onChange,
}: {
  refreshDisplayVariables: boolean;
  deployedContractData: Contract<ContractName>;
  onChange?: () => void;
}) => {
  if (!deployedContractData) {
    return null;
  }

  const functionsToDisplay = (deployedContractData.abi as Abi)
    .filter((part: AbiItem): part is AbiFunction => {
      return typeof part === "object" && part !== null && part.type === "function";
    })
    .filter((fn: AbiFunction) => {
      const isQueryableWithNoParams =
        (fn.stateMutability === "view" || fn.stateMutability === "pure") && fn.inputs.length === 0;
      return isQueryableWithNoParams;
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
      <span className="font-bold text-lg">Contract Variables</span>
      {functionsToDisplay.map(({ fn, inheritedFrom }: DisplayedContractFunction) => (
        <DisplayVariable
          key={fn.name}
          abiFunction={fn}
          abi={deployedContractData.abi as Abi}
          contractAddress={deployedContractData.address}
          refreshDisplayVariables={refreshDisplayVariables}
          inheritedFrom={inheritedFrom}
          onChange={onChange}
        />
      ))}
    </div>
  );
};
