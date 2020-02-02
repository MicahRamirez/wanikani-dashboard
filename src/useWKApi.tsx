import { useState, useEffect, SetStateAction, Dispatch } from "react";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export interface apiOptions {
  initialData?: any;
  isPaginated?: boolean;
  axiosConfig: AxiosRequestConfig;
  mungeFunction?: Function; // needs to be able to handle undef data, single element, or array...
}

interface WKHookPayload<T> {
  data: T | T[];
  isLoading: boolean;
  isError: boolean;
  doFetch: Dispatch<SetStateAction<string>>;
}

export interface WanikaniApiResponse<T> {
  object: string; // denotes data type
  url: string; // denotes api call
  pages?: {
    per_page: number; // number of entries per page
    next_url: string | null; // ref to next page if it exists
    previous_url: string | null; // ref to prev page if it exists
  };
  total_count?: number;
  data_updated_at: string; // 2020-01-20T11:07:04.987403Z
  data: T[];
}
export const useWKApi = <T extends unknown>(
  initialUrl: string,
  options: apiOptions,
  apiKey: string
): WKHookPayload<T>[] => {
  const [data, setData] = useState(options.initialData);
  const [url, setUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const axiosConfig = {
    ...{
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...options.axiosConfig.headers
      },
      timeout: 3000,
      ...options.axiosConfig
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      setIsError(false);
      setIsLoading(true);
      try {
        let result: AxiosResponse<WanikaniApiResponse<T>> = await axios(
          url,
          axiosConfig
        );
        const accumulatedData = [result.data.data];
        if (options.isPaginated && result.data.pages) {
          let nextPage = result.data.pages.next_url;
          while (nextPage !== null) {
            result = await axios(nextPage, options.axiosConfig);
            // push type T onto
            accumulatedData.push(result.data.data);
          }
        }
        setData(
          accumulatedData.length <= 1 ? accumulatedData.pop() : accumulatedData
        );
      } catch (error) {
        setIsError(true);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [url]);
  return [
    {
      data: options.mungeFunction ? options.mungeFunction(data) : data,
      isLoading,
      isError,
      doFetch: setUrl
    }
  ];
};
