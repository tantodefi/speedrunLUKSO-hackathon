import { AbiFunction, AbiParameter } from "abitype";
import { AbiParameterTuple } from "~~/utils/scaffold-eth/contract";

interface InputComponent extends AbiParameter {
  name: string;
  type: string;
  components?: AbiParameter[];
}

/**
 * Generates a key based on function metadata
 */
const getFunctionInputKey = (functionName: string, input: InputComponent, inputIndex: number): string => {
  const name = input?.name || `input_${inputIndex}`;
  return `${functionName}_${name}`;
};

const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

const isBigInt = (str: string) => {
  if (str.trim().length === 0 || str.startsWith("0")) return false;
  try {
    BigInt(str);
    return true;
  } catch (e) {
    return false;
  }
};

// Recursive function to deeply parse JSON strings, correctly handling nested arrays and encoded JSON strings
const deepParseValues = (value: any): any => {
  if (typeof value === "string") {
    // first try with bigInt because we losse precision with JSON.parse
    if (isBigInt(value)) {
      return BigInt(value);
    }

    if (isJsonString(value)) {
      const parsed = JSON.parse(value);
      return deepParseValues(parsed);
    }

    // It's a string but not a JSON string, return as is
    return value;
  } else if (Array.isArray(value)) {
    // If it's an array, recursively parse each element
    return value.map(element => deepParseValues(element));
  } else if (typeof value === "object" && value !== null) {
    // If it's an object, recursively parse each value
    return Object.entries(value).reduce((acc: any, [key, val]) => {
      acc[key] = deepParseValues(val);
      return acc;
    }, {});
  }

  // Handle boolean values represented as strings
  if (value === "true" || value === "1" || value === "0x1" || value === "0x01" || value === "0x0001") {
    return true;
  } else if (value === "false" || value === "0" || value === "0x0" || value === "0x00" || value === "0x0000") {
    return false;
  }

  return value;
};

/**
 * parses form input with array support
 */
const getParsedContractFunctionArgs = (form: Record<string, any>) => {
  return Object.keys(form).map(key => {
    const valueOfArg = form[key];

    // Attempt to deeply parse JSON strings
    return deepParseValues(valueOfArg);
  });
};

const getInitialFormState = (abiFunction: AbiFunction): Record<string, any> => {
  const initialForm: Record<string, any> = {};
  if (!abiFunction.inputs) return initialForm;
  abiFunction.inputs.forEach((input: AbiParameter, inputIndex: number) => {
    const key = getFunctionInputKey(abiFunction.name, input as InputComponent, inputIndex);
    initialForm[key] = "";
  });
  return initialForm;
};

const getInitalTupleFormState = (abiTupleParameter: AbiParameterTuple) => {
  const initialForm: Record<string, any> = {};
  if (abiTupleParameter.components.length === 0) return initialForm;

  abiTupleParameter.components.forEach((component: AbiParameter, componentIndex: number) => {
    const key = getFunctionInputKey(abiTupleParameter.name || "tuple", component, componentIndex);
    initialForm[key] = "";
  });
  return initialForm;
};

const getInitalTupleArrayFormState = (abiTupleParameter: AbiParameterTuple) => {
  const initialForm: Record<string, any> = {};
  if (abiTupleParameter.components.length === 0) return initialForm;
  abiTupleParameter.components.forEach((component: AbiParameter, componentIndex: number) => {
    const key = getFunctionInputKey("0_" + abiTupleParameter.name || "tuple", component, componentIndex);
    initialForm[key] = "";
  });
  return initialForm;
};

const transformAbiFunction = (abiFunction: AbiFunction) => {
  const component = { ...abiFunction };
  return component;
};

export {
  getFunctionInputKey,
  getInitialFormState,
  getParsedContractFunctionArgs,
  getInitalTupleFormState,
  getInitalTupleArrayFormState,
  transformAbiFunction,
};
