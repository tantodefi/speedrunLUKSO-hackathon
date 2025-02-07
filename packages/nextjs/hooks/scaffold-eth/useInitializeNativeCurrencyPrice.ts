import { useCallback, useEffect } from "react";
import { useInterval } from "usehooks-ts";
import scaffoldConfig from "~~/scaffold.config";
import { useGlobalState } from "~~/services/store/store";

const enablePolling = false;

/**
 * For LUKSO we don't need Uniswap price fetching, so we return a fixed value
 */
export const useInitializeNativeCurrencyPrice = () => {
  const setNativeCurrencyPrice = useGlobalState(state => state.setNativeCurrencyPrice);
  const setIsNativeCurrencyFetching = useGlobalState(state => state.setIsNativeCurrencyFetching);

  const fetchPrice = useCallback(async () => {
    setIsNativeCurrencyFetching(true);
    // Set a fixed value since we don't need Uniswap price for LUKSO
    setNativeCurrencyPrice(1);
    setIsNativeCurrencyFetching(false);
  }, [setIsNativeCurrencyFetching, setNativeCurrencyPrice]);

  // Initialize price on mount
  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  // Update price at polling interval if enabled
  useInterval(fetchPrice, enablePolling ? scaffoldConfig.pollingInterval : null);
};
