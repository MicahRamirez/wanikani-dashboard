import { DateTime } from "luxon";

const LOCALSTORAGE_ROOT = "root";

/**
 *
 * {
 *  apiDs0: {
 *     updatedAt: string
 *     data: any
 *   },
 *  apiDsN: {...},
 * }
 *  apiDs0 key should reflect the api call ?
 *
 *
 */
export interface WanikaniCollectionWrapper<T> {
  id: number;
  object: string;
  url: string;
  data_updated_at: string;
  data: T;
}

interface DataStructure<T> {
  updatedAtUTC: string;
  data: WanikaniCollectionWrapper<T>[];
}

interface LocalStorageData {
  [alias: string]: DataStructure<unknown>;
}

interface LocalStorageRoot {
  root: LocalStorageData;
}

const isLocalStorageDataStructure = <T extends unknown>(
  obj: any
): obj is DataStructure<T> => {
  return (
    obj && typeof obj.data === "object" && typeof obj.updatedAtUTC === "string"
  );
};

const isWanikaniCollectionWrapper = <T extends unknown>(
  obj: any
): obj is WanikaniCollectionWrapper<T>[] => {
  return (
    obj &&
    Array.isArray(obj) &&
    typeof obj[0].id === "number" &&
    typeof obj[0].object === "string" &&
    typeof obj[0].url === "string" &&
    typeof obj[0].url === "string" &&
    typeof obj[0].data === "object"
  );
};

const parseLocalStorageRoot = () => {
  if (!typeof Storage) {
    return;
  }
  const rootStructure = { root: {} };
  let localStorageRoot = localStorage.getItem(LOCALSTORAGE_ROOT);

  if (!localStorageRoot) {
    console.log("localstorage did not exit", localStorageRoot);
    localStorage.setItem(LOCALSTORAGE_ROOT, JSON.stringify(rootStructure));
    return rootStructure;
  }

  try {
    return JSON.parse(localStorageRoot) as LocalStorageRoot;
  } catch (error) {
    console.error("Unable to parse local storage values");
    return rootStructure;
  }
};

export const getDataFromLocalStorage = <T extends unknown>(
  localStorageDataKey: string
): DataStructure<T> | undefined => {
  const localStorageRoot = parseLocalStorageRoot() as LocalStorageRoot;
  const dataNode = localStorageRoot.root[localStorageDataKey];
  if (isLocalStorageDataStructure<T>(dataNode)) {
    return dataNode;
  }
};

export const setDataInLocalStorage = <T extends unknown>(
  data: WanikaniCollectionWrapper<T>[],
  localStorageDataKey: string
) => {
  const localStorageRoot = parseLocalStorageRoot() as LocalStorageRoot;
  const dataStructure = localStorageRoot.root[localStorageDataKey];
  const updatedAtUTC = DateTime.utc().toString();
  console.log(localStorageRoot);
  console.log(data);
  if (isLocalStorageDataStructure<T>(dataStructure)) {
    const localStoragePayload = { updatedAtUTC, data };
    // so in the root struct, overwrite only the key that we are setting in the function parameter localStorageDataKey
    const updatedRoot = {
      root: {
        ...localStorageRoot.root,
        ...{ [localStorageDataKey]: localStoragePayload }
      }
    };
    localStorage.setItem(localStorageDataKey, JSON.stringify(updatedRoot));
  } else if (isWanikaniCollectionWrapper<T>(data)) {
    const updatedRoot = {
      root: {
        [localStorageDataKey]: {
          updatedAtUTC,
          data
        }
      }
    };
    localStorage.setItem(LOCALSTORAGE_ROOT, JSON.stringify(updatedRoot));
  }
};
