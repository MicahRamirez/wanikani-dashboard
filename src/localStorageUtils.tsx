import { DateTime } from "luxon";
import { WanikaniDB } from "./WanikaniDB";

const LOCALSTORAGE_ROOT = "root";

export interface WanikaniCollectionWrapper<T> {
  id: number;
  object: string;
  url: string;
  data_updated_at: string;
  data: T;
}

export interface DataStructure<T> {
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
    return JSON.parse(localStorageRoot) as LocalStorageRoot;
  } catch (error) {
    console.error("Unable to parse local storage values");
    return rootStructure;
  }
};

export const getDataFromStorage = async <T extends unknown>(
  localStorageDataKey: string
): Promise<DataStructure<T> | undefined> => {
  if (WanikaniDB.contains(localStorageDataKey)) {
    return await WanikaniDB.getTable(localStorageDataKey)
      ?.orderBy("id")
      .last();
  }

  const localStorageRoot = parseLocalStorageRoot() as LocalStorageRoot;
  const dataNode = localStorageRoot.root[localStorageDataKey];
  if (isLocalStorageDataStructure<T>(dataNode)) {
    return dataNode;
  }
};

export const setDataInStorage = async <T extends unknown>(
  data: WanikaniCollectionWrapper<T>[],
  localStorageDataKey: string
) => {
  const modifiedSince = DateTime.utc().toHTTP();
  if (WanikaniDB.contains(localStorageDataKey)) {
    await WanikaniDB.getTable(localStorageDataKey)?.add({
      data: data,
      modifiedSince
    });
  } else {
    setDataInLocalStorage(data, localStorageDataKey, modifiedSince);
  }
};

const setDataInLocalStorage = <T extends unknown>(
  data: WanikaniCollectionWrapper<T>[],
  localStorageDataKey: string,
  modifiedSince: string
) => {
  const localStorageRoot = parseLocalStorageRoot();

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
    localStorage.setItem(LOCALSTORAGE_ROOT, JSON.stringify(updatedRoot));
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
    localStorage.setItem(LOCALSTORAGE_ROOT, JSON.stringify(updatedRoot));
  }
};
