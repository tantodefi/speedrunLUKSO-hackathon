import { useEffect, useState } from "react";
import { ContractInput } from "./ContractInput";
import { getFunctionInputKey } from "./utilsContract";
import { AbiParameter } from "abitype";
import { replacer } from "~~/utils/scaffold-eth/common";
import { AbiParameterTuple } from "~~/utils/scaffold-eth/contract";

type TupleProps = {
  abiTupleParameter: AbiParameterTuple;
  setParentForm: (value: Record<string, any>) => void;
  parentStateObjectKey: string;
  parentForm: Record<string, any> | undefined;
};

interface TupleComponent extends AbiParameter {
  name: string;
  type: string;
  components?: AbiParameter[];
}

export const Tuple = ({ abiTupleParameter, setParentForm, parentStateObjectKey, parentForm }: TupleProps) => {
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (parentForm && parentForm[parentStateObjectKey] !== form) {
      setParentForm({ ...parentForm, [parentStateObjectKey]: form });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(form, replacer)]);

  const renderTupleInput = (component: TupleComponent, componentIndex: number): JSX.Element => {
    const key = getFunctionInputKey(parentStateObjectKey, component, componentIndex);
    return <ContractInput key={key} setForm={setForm} form={form} stateObjectKey={key} paramType={component} />;
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 items-center">
        <div className="font-medium text-gray-500 w-14">{abiTupleParameter.type}</div>
        <div className="font-medium text-gray-500">{abiTupleParameter.name}</div>
      </div>
      <div className="ml-3 flex-col space-y-4 border-secondary/80 border-l-2 pl-4 collapse-content">
        {abiTupleParameter?.components?.map((param: AbiParameter, index: number) => (
          <div key={`${parentStateObjectKey}-${index}`} className="flex gap-2">
            {renderTupleInput(param as TupleComponent, index)}
          </div>
        ))}
      </div>
    </div>
  );
};
