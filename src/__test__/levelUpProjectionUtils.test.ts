import { Duration, DateTime } from "luxon";

import { getMedianLevelUpInDays } from "../levelUpProjectionUtils";

export interface ChartData {
  level?: number;
  timeToLeveUp?: Duration;
  completedAt: DateTime;
  startedAt: DateTime;
  time: number; // ms since epoch
  average?: number;
  median?: number;
  optimal?: number;
  type: "average" | "recorded" | "median" | "optimal" | "userpace";
}

const makeTestChartData = (): ChartData[] => {
  return [];
};
describe("test", () => {
  it("should not fail", () => {
    // todo test
    getMedianLevelUpInDays([]);
  });
});
