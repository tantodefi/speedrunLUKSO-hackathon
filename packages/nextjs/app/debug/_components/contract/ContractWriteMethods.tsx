import { Abi, AbiFunction } from "abitype";
import { WriteOnlyFunctionForm } from "~~/app/debug/_components/contract";
import { Contract, ContractName } from "~~/utils/scaffold-eth/contract";

type DisplayedContractFunction = {
  fn: AbiFunction;
  inheritedFrom?: string;
};

interface AbiItem {
  type?: string;
  stateMutability?: string;
}

export const ContractWriteMethods = ({
  deployedContractData,
  onChange,
}: {
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
      const isWriteFunction = fn.stateMutability !== "view" && fn.stateMutability !== "pure";
      return isWriteFunction;
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
      <span className="font-bold text-lg">Write Methods</span>
      {functionsToDisplay.map(({ fn, inheritedFrom }: DisplayedContractFunction) => (
        <WriteOnlyFunctionForm
          key={fn.name}
          abi={deployedContractData.abi as Abi}
          abiFunction={fn}
          contractAddress={deployedContractData.address}
          inheritedFrom={inheritedFrom}
          onChange={onChange}
        />
      ))}
    </div>
  );
};
