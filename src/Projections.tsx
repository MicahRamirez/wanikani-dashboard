import React from "react";
import CircularProgress from "@material-ui/core/CircularProgress";
import Paper from "@material-ui/core/Paper";

import {
  analyzeLevelProgressions,
  analyzeResetData
} from "./levelUpProjectionUtils";
import { useWKApi } from "./useWKApi";
import { LevelProgression, Reset, Subject, Assignment } from "./wanikaniTypes";
import {
  LEVEL_PROGRESSIONS_API_URL,
  RESETS_API_URL,
  SUBJECTS_URL,
  ASSIGNMENTS_URL,
  LEVEL_PROGRESSION_LOCAL_STORAGE_KEY,
  SUBJECTS_LOCAL_STORAGE_KEY,
  ASSIGNMENTS_LOCAL_STORAGE_KEY,
  RESETS_LOCAL_STORAGE_KEY
} from "./constants";
import { LevelUpChart } from "./LevelUpChart";

export const Projections = ({ apiKey }: { apiKey: string }) => {
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
  if (
    isLoading ||
    resetDataIsLoading ||
    assignmentDataIsLoading ||
    subjectDataIsLoading ||
    !data ||
    !resetData ||
    !currentKanjiAssignments ||
    !currentKanjiSubjects ||
    !formattedDataWithProjections
  ) {
    return <CircularProgress />;
  }
  return (
    <div>
      Current Level Stats
      <Paper elevation={3}>Fastest time to level up</Paper>
      <Paper elevation={3}>Estimated time to level up</Paper>
      <Paper elevation={3}>Average Accuracy of Current Level Kanji</Paper>
      <LevelUpChart chartData={formattedDataWithProjections} />
    </div>
  );
};
