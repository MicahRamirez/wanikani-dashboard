import { useState, useEffect, SetStateAction, Dispatch } from "react";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { DateTime } from "luxon";

export interface apiOptions {
  initialData?: any;
  isPaginated?: boolean;
  axiosConfig: AxiosRequestConfig;
  localStorageDataKey?: string;
  lastUpdated?: string;
  mungeFunction?: Function; // needs to be able to handle undef data, single element, or array...
}

interface WKHookPayload<T> {
  data: WanikaniCollectionWrapper<T>[];
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

interface LocalStoragePayload<T> {
  utcTimestamp: string;
  data: WanikaniCollectionWrapper<T>[];
}
export interface WanikaniCollectionWrapper<T> {
  id: number;
  object: string;
  url: string;
  data_updated_at: string;
  data: T;
}

const isLocalStoragePayload = <T extends unknown>(
  obj: any
): obj is LocalStoragePayload<T> => {
  return typeof obj.data === "object" && typeof obj.utcTimestamp === "string";
};

// parse LS, determine lastUpdated minimum compared to UTC timestamp in LS for localStorageDataKey
const dataIsFresh = (
  localStorageDataKey: string,
  lastUpdated: string = "24h"
) => {
  const localStorageData = getDataFromLocalStorage(localStorageDataKey);
  console.log("lastUpdated", lastUpdated);
  return localStorageData;
};

const getDataFromLocalStorage = <T extends unknown>(
  localStorageDataKey: string
): LocalStoragePayload<T> | undefined => {
  // when Storage is undef we are on serverside, exit early
  if (!typeof Storage) {
    return;
  }
  let localStorageData = localStorage.getItem(localStorageDataKey);
  if (localStorageData === null) {
    return;
  }
  try {
    localStorageData = JSON.parse(localStorageData);
  } catch (error) {
    console.error("Unable to parse local storage values");
    return;
  }
  if (isLocalStoragePayload<T>(localStorageData)) {
    return localStorageData;
  }
};

const setDataInLocalStorage = <T extends unknown>(
  data: T[] | T[][] | undefined,
  localStorageDataKey: string
) => {
  // when Storage is undef we are on serverside, exit early
  if (!typeof Storage) {
    return;
  }
  const utcTimestamp = DateTime.utc();
  const localStoragePayload = { utcTimestamp: utcTimestamp, data };
  localStorage.setItem(
    localStorageDataKey,
    JSON.stringify(localStoragePayload)
  );
};

export const useWKApi = <T extends unknown>(
  initialUrl: string,
  options: apiOptions,
  apiKey: string
): WKHookPayload<T>[] => {
  const [data, setData] = useState<WanikaniCollectionWrapper<T>[]>(
    options.initialData
  );
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
        // **** TODO  just need to flatten the data structure in different cases and use the wrapper type*****
        // if data is nested due to pagination flatten
        const dataToSet = accumulatedData.reduce((acc, currentValue) => {
          return [...currentValue, ...acc];
        }, []);
        if (options.localStorageDataKey) {
          setDataInLocalStorage(dataToSet, options.localStorageDataKey);
        }
        setData(dataToSet as WanikaniCollectionWrapper<T>[]);
      } catch (error) {
        setIsError(true);
      }
      setIsLoading(false);
    };
    // we want to utilize already requested data from LS if it is fresh enough for the specific API
    if (
      options.localStorageDataKey &&
      dataIsFresh(options.localStorageDataKey, options.lastUpdated)
    ) {
      const dataFromLocalStorage = getDataFromLocalStorage<T>(
        options.localStorageDataKey
      );
      if (dataFromLocalStorage === undefined) {
        fetchData();
      } else {
        setData(dataFromLocalStorage.data);
      }
    } else {
      fetchData();
    }
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
