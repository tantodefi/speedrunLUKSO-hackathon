export const fetcher = async <T = Record<any, any>>(...args: Parameters<typeof fetch>) => {
  const res = await fetch(...args);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Error fetching data");
  }
  return data as T;
};

export const makeMutationFetcher =
  <T = Record<any, any>>(method: "POST" | "PUT" | "PATCH" | "DELETE") =>
  async (url: string, { body }: { body: T }) => {
    const res = await fetch(url, {
      method: method,
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Error ${method.toLowerCase()}ing data`);
    }
    return data;
  };

/**
 * Generic POST mutation fetcher for react-query
 * @param url The URL to send the POST request to
 * @param body The body of the POST request
 * @returns The response data
 */
export const postMutationFetcher = async <TData, TVariables>(
  url: string,
  { body }: { body: TVariables },
): Promise<TData> => {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    console.log(`API response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API error details:", errorData);
      throw new Error(errorData.error || errorData.message || `API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

export const patchMutationFetcher = <T = Record<any, any>>(url: string, arg: { body: T }) =>
  makeMutationFetcher<T>("PATCH")(url, arg);

/**
 * Generic GET query fetcher for react-query
 * @param url The URL to send the GET request to
 * @returns The response data
 */
export const queryFetcher = async <TData>(url: string): Promise<TData> => {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "An error occurred" }));
    throw new Error(error.message || "An error occurred while making the request");
  }

  return response.json();
};
