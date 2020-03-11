import Dexie from "dexie";
import { SUBJECTS_LOCAL_STORAGE_KEY } from "./constants";
import { DataStructure } from "./localStorageUtils";

export const IN_DEXIE_DB: { [key: string]: boolean } = {
  [SUBJECTS_LOCAL_STORAGE_KEY]: true
};

class WanikaniDatabase extends Dexie {
  containsMap: { [key: string]: boolean };
  // should be explicit about what exists in this map
  tableMap: { [key: string]: Dexie.Table<any, any> };
  // TODO: figure out how to make the consuming interface play nice with these explicit types
  subjects: Dexie.Table<DataStructure<any>, number>;
  constructor() {
    super("WanikaniDB");
    this.version(1).stores({
      subjects: "++id, modifiedSince"
    });

    this.subjects = this.table("subjects");
    this.containsMap = IN_DEXIE_DB;
    this.tableMap = { SUBJECTS_LOCAL_STORAGE_KEY: this.subjects };
  }
  getTable(key: string) {
    if (key === SUBJECTS_LOCAL_STORAGE_KEY) {
      return this.subjects;
    }
  }
  contains(key: string) {
    return this.containsMap[key];
  }
}
export const WanikaniDB = new WanikaniDatabase();
