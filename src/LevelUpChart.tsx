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
import { DateTime } from "luxon";

import {
  analyzeLevelProgressions,
  analyzeResetData
} from "./levelUpProjectionUtils";
import { useWKApi } from "./useWKApi";
import { LevelProgression, Reset, Subject, Assignment } from "./wanikaniTypes";

const LEVEL_PROGRESSIONS_API_URL =
  "https://api.wanikani.com/v2/level_progressions";
const LEVEL_PROGRESSION_LOCAL_STORAGE_KEY = "levelProgressions";
const RESETS_API_URL = "https://api.wanikani.com/v2/resets";
const SUBJECTS_URL = "https://api.wanikani.com/v2/subjects";
const ASSIGNMENTS_URL = "https://api.wanikani.com/v2/assignments";
const SUBJECTS_LOCAL_STORAGE_KEY = "subjects";
const ASSIGNMENTS_LOCAL_STORAGE_KEY = "assignments";
const RESETS_LOCAL_STORAGE_KEY = "resets";

/**
 *  This chart now has a lot of state, lots of API calls, etc... After it's complete it would be nice to pull up all API calls
 *
 */
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
  // ignore level progressions between targetLevel and originalLevel after the mostRecentReset timestamp (USED TO FILTER)
  const { mostRecentResetTimeStamp, targetLevel } = analyzeResetData(resetData);
  const {
    formattedDataWithProjections,
    currentLevel
  } = analyzeLevelProgressions(data, {
    mostRecentResetTimeStamp,
    targetLevel
  });
  // if we know the current level then also fetch data to project current performance
  const [
    { data: currentKanjiSubjects, isLoading: subjectDataIsLoading }
  ] = useWKApi<Subject>(
    SUBJECTS_URL,
    {
      skip: currentLevel === undefined,
      axiosConfig: {
        method: "GET",
        responseType: "json",
        params: {
          types: "kanji",
          levels: `${currentLevel}`
        }
      },
      localStorageDataKey: SUBJECTS_LOCAL_STORAGE_KEY
    },
    apiKey
  );
  const [
    { data: currentKanjiAssignments, isLoading: assignmentDataIsLoading }
  ] = useWKApi<Assignment>(
    ASSIGNMENTS_URL,
    {
      skip: currentLevel === undefined,
      axiosConfig: {
        method: "GET",
        responseType: "json",
        params: {
          types: "kanji",
          levels: `${currentLevel}`
        }
      },
      localStorageDataKey: ASSIGNMENTS_LOCAL_STORAGE_KEY
    },
    apiKey
  );
  console.log(
    currentKanjiAssignments,
    assignmentDataIsLoading,
    currentKanjiSubjects,
    subjectDataIsLoading
  );
  if (
    isLoading ||
    resetDataIsLoading ||
    assignmentDataIsLoading ||
    subjectDataIsLoading ||
    !data ||
    !resetData ||
    !currentKanjiAssignments ||
    !currentKanjiSubjects
  ) {
    return <CircularProgress />;
  }
  // Mean: What is the average level up time
  // Median: What is the time of the average level up
  // Optimal: Given your current pace on the current level
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
          <Line type="natural" dataKey="averageLevel" stroke="green" />
          <Line type="natural" dataKey="level" stroke="blue" />
          <Line type="natural" dataKey="medianLevel" stroke="orange" />
          <Line type="natural" dataKey="optimalLevel" stroke="red" />
        </LineChart>
      </ResponsiveContainer>
      <p>
        <span>CURRENT KANJI SUBJECT</span>
        {/* {JSON.stringify(currentKanjiSubjects)} */}

        <span>CURRENT KANJI ASSIGNMENT</span>
        {/* {JSON.stringify(currentKanjiAssignments)} */}
      </p>
    </div>
  );
};
