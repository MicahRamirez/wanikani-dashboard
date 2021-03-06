import { useState, useEffect, SetStateAction, Dispatch } from "react";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

import { getDataFromStorage, setDataInStorage } from "./localStorageUtils";

export interface apiOptions {
  initialData?: any;
  isPaginated?: boolean;
  axiosConfig: AxiosRequestConfig;
  localStorageDataKey: string;
  lastUpdated?: string;
  skip?: boolean;
  mungeFunction?: Function; // needs to be able to handle undef data, single element, or array...
}

interface WKHookPayload<T> {
  data: WanikaniCollectionWrapper<T>[];
  isLoading: boolean;
  isError: boolean;
  doFetch: Dispatch<SetStateAction<string>>;
  progress: { percentage: number };
}

export interface WanikaniApiResponse<T> {
  object: string; // denotes data type
  url: string; // denotes api call
  pages?: {
    per_page: number; // number of entries per page
    next_url: string | null; // ref to next page if it exists
    previous_url: string | null; // ref to prev page if it exists
  };
  total_count: number;
  data_updated_at: string; // 2020-01-20T11:07:04.987403Z
  data: T[];
}

export interface WanikaniCollectionWrapper<T> {
  id: number;
  object: string;
  url: string;
  data_updated_at: string;
  data: T;
}

export const unwrapCollectionWrapper = <T extends unknown>(
  wrappedData: WanikaniCollectionWrapper<T>[]
): T[] => {
  return wrappedData.map<T>(wrappedElement => wrappedElement.data);
};

export const useWKApi = <T extends unknown>(
  initialUrl: string,
  options: apiOptions,
  apiKey: string
): WKHookPayload<T>[] => {
  const [data, setData] = useState<WanikaniCollectionWrapper<T>[]>([]);
  const [url, setUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [progress, setProgress] = useState({
    percentage: 0
  });
  let axiosConfig = {
    ...{
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...options.axiosConfig.headers
      },
      timeout: 10000,
      ...options.axiosConfig
    }
  };
  useEffect(() => {
    const fetchData = async (modifiedSince: string = "unknown") => {
      setIsError(false);
      setIsLoading(true);
      try {
        const modifiedSinceHeader =
          modifiedSince === "unknown"
            ? {}
            : { "If-Modified-Since": modifiedSince };
        axiosConfig = {
          ...axiosConfig,
          ...{
            headers: {
              ...axiosConfig.headers,
              ...modifiedSinceHeader
            }
          }
        };
        let result: AxiosResponse<WanikaniApiResponse<T>> = await axios(
          url,
          axiosConfig
        );
        const accumulatedData = [result.data.data];
        if (options.isPaginated && result.data.pages) {
          let nextPage = result.data.pages.next_url;
          let itemsSoFar = 0;
          while (nextPage !== null) {
            itemsSoFar = itemsSoFar + result.data.data.length;
            setProgress({
              percentage: Math.floor(
                (itemsSoFar / result.data.total_count) * 100
              )
            });
            result = await axios(nextPage, axiosConfig);
            accumulatedData.push(result.data.data);
            if (!result.data.pages) {
              nextPage = null;
            } else {
              nextPage = result.data.pages.next_url;
            }
          }
        }
        // if data is nested due to pagination flatten
        const dataToSet = accumulatedData.reduce((acc, currentValue) => {
          return [...currentValue, ...acc];
        }, []);
        await setDataInStorage(
          dataToSet as WanikaniCollectionWrapper<T>[],
          options.localStorageDataKey
        );
        setData(dataToSet as WanikaniCollectionWrapper<T>[]);
      } catch (error) {
        // WK Api will return 304s when data has not been updated
        // catch here and set data that exists in local storage
        if (JSON.stringify(error.message).includes("304")) {
          setProgress({ percentage: 100 });
          const dataFromLocalStorage = await getDataFromStorage<T>(
            options.localStorageDataKey
          );
          if (dataFromLocalStorage) {
            setData(dataFromLocalStorage.data);
            setIsLoading(false);
            return;
          } else {
            console.error("Received 304 from WK API, but data DNE in LS");
            // TODO: rethrow error to be caught by global error handler
            // global error because our cache (LS) does not reflect what it should
          }
          console.error(
            "unknown error occurred, rethrowing to global error handler",
            error.message
          );
          throw new Error();
        }
        console.warn("there was an errror", error);
        setIsError(true);
      }
      setIsLoading(false);
    };

    // used for dependent api calls
    if (options.skip) {
      return;
    }
    // data is cached in LS
    else if (options.localStorageDataKey) {
      getDataFromStorage<T>(options.localStorageDataKey).then(
        dataFromStorage => {
          fetchData(dataFromStorage?.modifiedSince);
        }
      );
    } else {
      fetchData();
    }
  }, [url, options.skip]);
  return [
    {
      data: options.mungeFunction ? options.mungeFunction(data) : data,
      isLoading,
      isError,
      doFetch: setUrl,
      progress
    }
  ];
};
