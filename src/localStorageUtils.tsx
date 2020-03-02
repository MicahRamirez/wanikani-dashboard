import { DateTime } from "luxon";
import LZString from "lz-string";

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
  modifiedSince: string;
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
    obj && typeof obj.data === "object" && typeof obj.modifiedSince === "string"
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
    return JSON.parse(
      LZString.decompressFromUTF16(localStorageRoot)
    ) as LocalStorageRoot;
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
  const localStorageRoot = parseLocalStorageRoot();
  const modifiedSince = DateTime.utc().toHTTP();

  // creating the LS data structure for the first time
  if (!localStorageRoot) {
    const updatedRoot = {
      root: {
        [localStorageDataKey]: {
          modifiedSince,
          data
        }
      }
    };
    const compressedRoot = LZString.compressToUTF16(
      JSON.stringify(updatedRoot)
    );
    localStorage.setItem(LOCALSTORAGE_ROOT, compressedRoot);
    // updating the LS data struture for the specific key
  } else {
    const localStoragePayload = { modifiedSince, data };
    // so in the root struct, overwrite only the key that we are setting in the function parameter localStorageDataKey
    const updatedRoot = {
      root: {
        ...localStorageRoot.root,
        ...{ [localStorageDataKey]: localStoragePayload }
      }
    };
    const compressedRoot = LZString.compressToUTF16(
      JSON.stringify(updatedRoot)
    );
    localStorage.setItem(LOCALSTORAGE_ROOT, compressedRoot);
  }
};
