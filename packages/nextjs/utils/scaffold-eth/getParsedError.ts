import { BaseError as BaseViemError, ContractFunctionRevertedError } from "viem";

/**
 * Parses an viem/wagmi error to get a displayable string
 * @param e - error object
 * @returns parsed error string
 */
export const getParsedError = (error: any): string => {
  const parsedError = error?.walk ? error.walk() : error;

  if (parsedError instanceof BaseViemError) {
    if (parsedError.details) {
      return parsedError.details;
    }

    if (parsedError.shortMessage) {
      if (
        parsedError instanceof ContractFunctionRevertedError &&
        parsedError.data &&
        parsedError.data.errorName !== "Error"
      ) {
        const customErrorArgs = parsedError.data.args?.toString() ?? "";
        return `${parsedError.shortMessage.replace(/reverted\.$/, "reverted with the following reason:")}\n${
          parsedError.data.errorName
        }(${customErrorArgs})`;
      }

      return parsedError.shortMessage;
    }

    return parsedError.message ?? parsedError.name ?? "An unknown error occurred";
  }

  return parsedError?.message ?? "An unknown error occurred";
};

/**
 * Parses error message from ethers error or string.
 */
export const getParsedErrorFromEthers = (error: any): string => {
  let parsedError = error;

  // Extract message from EthersError
  if (error?.data?.message) {
    parsedError = error.data.message;
  } else if (error?.message) {
    parsedError = error.message;
  } else if (error?.reason) {
    parsedError = error.reason;
  } else if (typeof error === "string") {
    parsedError = error;
  }

  // Handle specific error messages
  if (parsedError.includes("user rejected transaction")) {
    parsedError = "User rejected transaction";
  } else if (parsedError.includes("gas required exceeds")) {
    parsedError = "Gas required exceeds allowance or not enough balance";
  }

  return parsedError;
};
