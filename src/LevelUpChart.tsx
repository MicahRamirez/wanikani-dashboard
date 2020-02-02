import React from "react";
import CircularProgress from "@material-ui/core/CircularProgress";
// import { BarChart, CartesianGrid, XAxis, YAxis, Bar } from "recharts";
import { useWKApi } from "./useWKApi";

const LEVEL_PROGRESSIONS_API_URL =
  "https://api.wanikani.com/v2/level_progressions";

// abandoned_at	null or Date	Timestamp when the user abandons the level. This is primary used when the user initiates a reset.
// completed_at	null or Date	Timestamp when the user burns 100% of the assignments belonging to the associated subject's level.
// created_at	Date	Timestamp when the level progression is created
// level	Integer	The level of the progression, with possible values from 1 to 60.
// passed_at	null or Date	Timestamp when the user passes at least 90% of the assignments with a type of kanji belonging to the associated subject's level.
// started_at	null or Date	Timestamp when the user starts their first lesson of a subject belonging to the level.
// unlocked_at	null or Date	Timestamp when the user can access lessons and reviews for the level.

export interface LevelProgression {
  abandoned_at: null | string;
  completed_at: null | string;
  created_at: string;
  level: number;
  passed_at: null | string;
  started_at: null | string;
  unlocked_at: null | string;
}

export const LevelUpChart: React.FC<{ apiKey: string }> = ({ apiKey }) => {
  const [{ data, isLoading, isError, doFetch }] = useWKApi<LevelProgression>(
    LEVEL_PROGRESSIONS_API_URL,
    { axiosConfig: { method: "GET", responseType: "json" } },
    apiKey
  );
  console.log(isError, doFetch);
  return (
    <div>
      {isLoading && <CircularProgress />}
      <p>first chart</p>
      {JSON.stringify(data)}
    </div>
  );
};
