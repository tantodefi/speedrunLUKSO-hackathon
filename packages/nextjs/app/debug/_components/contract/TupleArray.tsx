import { useEffect, useState } from "react";
import { ContractInput } from "./ContractInput";
import { getFunctionInputKey } from "./utilsContract";
import { AbiParameter } from "abitype";
import { replacer } from "~~/utils/scaffold-eth/common";

interface TupleArrayProps {
  abiTupleArray: AbiParameter & { components?: AbiParameter[] };
  setParentForm: (value: Record<string, any>) => void;
  parentStateObjectKey: string;
  parentForm: Record<string, any> | undefined;
}

interface TupleComponent extends AbiParameter {
  name: string;
  type: string;
  baseType?: string;
  arrayOptions?: {
    length?: number;
    elementType: string;
  };
  components?: AbiParameter[];
}

export const TupleArray = ({ abiTupleArray, setParentForm, parentStateObjectKey, parentForm }: TupleArrayProps) => {
  const [form, setForm] = useState<Record<string, any>>({});
  const [arrayLength, setArrayLength] = useState<number>(1);

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
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 items-center">
        <div className="font-medium text-gray-500 w-14">{abiTupleArray.type}</div>
        <div className="font-medium text-gray-500">{abiTupleArray.name}</div>
        <input
          className="input input-ghost focus:outline-none focus:bg-transparent focus:text-gray-400 h-[2rem] min-h-[2rem] px-2 w-14"
          placeholder="array length"
          onChange={e => {
            const value = parseInt(e.target.value);
            setArrayLength(value || 0);
          }}
          value={arrayLength}
        />
      </div>
      {Array(arrayLength)
        .fill(0)
        .map((_, arrayIndex) => (
          <div key={arrayIndex} className="flex gap-2">
            <div className="font-medium text-gray-500 w-14">({arrayIndex})</div>
            <div className="flex flex-col gap-2 border-secondary/80 border-l-2 pl-4">
              {abiTupleArray.components?.map((param: AbiParameter, paramIndex: number) => (
                <div key={`${parentStateObjectKey}-${arrayIndex}-${paramIndex}`}>
                  {renderTupleInput(param as TupleComponent, paramIndex)}
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
};
