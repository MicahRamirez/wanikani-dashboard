import React from "react";
import CircularProgress from "@material-ui/core/CircularProgress";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
  Line,
  LineChart,
  CartesianGrid
} from "recharts";
import { useWKApi } from "./useWKApi";
import { DateTime } from "luxon";

import {
  analyzeLevelProgressions,
  analyzeResetData
} from "./levelUpProjectionUtils";
import { LevelProgression, Reset } from "./wanikaniTypes";

const LEVEL_PROGRESSIONS_API_URL =
  "https://api.wanikani.com/v2/level_progressions";
const LEVEL_PROGRESSION_LOCAL_STORAGE_KEY = "levelProgressions";
const RESETS_API_URL = "https://api.wanikani.com/v2/resets";
const RESETS_LOCAL_STORAGE_KEY = "resets";

export const LevelUpChart: React.FC<{ apiKey: string }> = ({ apiKey }) => {
  // *should* yield all level progressions, including those from past resets
  const [{ data, isLoading }] = useWKApi<LevelProgression>(
    LEVEL_PROGRESSIONS_API_URL,
    {
      axiosConfig: { method: "GET", responseType: "json" },
      localStorageDataKey: LEVEL_PROGRESSION_LOCAL_STORAGE_KEY
    },
    apiKey
  );

  const [{ data: resetData, isLoading: resetDataIsLoading }] = useWKApi<Reset>(
    RESETS_API_URL,
    {
      axiosConfig: { method: "GET", responseType: "json" },
      localStorageDataKey: RESETS_LOCAL_STORAGE_KEY
    },
    apiKey
  );
  if (
    isLoading ||
    resetDataIsLoading ||
    data === undefined ||
    resetData === undefined
  ) {
    return <CircularProgress />;
  }
  // ignore level progressions between targetLevel and originalLevel after the mostRecentReset timestamp (USED TO FILTER)
  const {
    mostRecentResetTimeStamp,
    targetLevel,
    originalLevel
  } = analyzeResetData(resetData);
  const { formattedDataWithProjections } = analyzeLevelProgressions(data, {
    mostRecentResetTimeStamp,
    targetLevel,
    originalLevel
  });
  return (
    <div>
      <ResponsiveContainer width={"95%"} height={500}>
        <LineChart data={formattedDataWithProjections}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            type="number"
            scale="time"
            dataKey={"time"}
            domain={["auto", "auto"]}
            tickFormatter={unixTime => {
              return DateTime.fromMillis(unixTime).toLocaleString(
                DateTime.DATETIME_FULL
              );
            }}
          />
          <YAxis
            type="number"
            domain={[5, "dataMax"]}
            dataKey={obj => {
              if (obj.averageLevel) {
                return obj.averageLevel;
              } else if (obj.medianLevel) {
                return obj.medianLevel;
              } else if (obj.type === "recorded") {
                return obj.level;
              }
            }}
          />
          <Tooltip />
          <Legend />
          <Line type="natural" dataKey={"averageLevel"} stroke="green" />
          <Line type="natural" dataKey="level" stroke="blue" />
          <Line type="natural" dataKey={"medianLevel"} stroke="orange" />
          <Line type="natural" dataKey="optimalLevel" stroke="red" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
