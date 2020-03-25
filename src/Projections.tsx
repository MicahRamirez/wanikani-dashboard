import React from "react";
import LinearProgress from "@material-ui/core/LinearProgress";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";

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
import { calculateFastestLevelUpTime } from "./optimalLevelUp";
import { ProjectionsQuickStats } from "./ProjectionQuickStats";

const useStyles = makeStyles(_ => ({
  root: {
    flexGrow: 1
  }
}));

export const ProjectionsUI = ({ apiKey }: { apiKey: string }) => {
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
    currentLevel,
    projections
  } = analyzeLevelProgressions(data, {
    mostRecentResetTimeStamp,
    targetLevel
  });
  // if we know the current level then also fetch data to project current performance
  const [
    {
      data: currentKanjiSubjects,
      isLoading: subjectDataIsLoading,
      progress: subjectProgress
    }
  ] = useWKApi<Subject>(
    SUBJECTS_URL,
    {
      isPaginated: true,
      skip: currentLevel === undefined,
      axiosConfig: {
        method: "GET",
        responseType: "json"
      },
      localStorageDataKey: SUBJECTS_LOCAL_STORAGE_KEY
    },
    apiKey
  );
  const [
    {
      data: levelUpAssignments,
      isLoading: assignmentDataIsLoading,
      progress: assignmentProgress
    }
  ] = useWKApi<Assignment>(
    ASSIGNMENTS_URL,
    {
      isPaginated: true,
      skip: currentLevel === undefined,
      axiosConfig: {
        method: "GET",
        responseType: "json",
        params: {
          levels: `${currentLevel}`,
          unlocked: "true"
        }
      },
      localStorageDataKey: `${ASSIGNMENTS_LOCAL_STORAGE_KEY}?levels=${currentLevel}&unlocked=true`
    },
    apiKey
  );
  const classes = useStyles();
  const minimumTimeToLevelInSeconds = calculateFastestLevelUpTime(
    levelUpAssignments,
    currentKanjiSubjects,
    currentLevel
  );
  if (
    isLoading ||
    resetDataIsLoading ||
    assignmentDataIsLoading ||
    subjectDataIsLoading ||
    !data ||
    !resetData ||
    !levelUpAssignments ||
    !currentKanjiSubjects ||
    !formattedDataWithProjections
  ) {
    return (
      <div>
        <span>Subject Progress</span>
        <LinearProgress
          variant="determinate"
          value={subjectProgress.percentage}
        />
        <span>Assignment Progress</span>
        <LinearProgress
          variant="determinate"
          value={assignmentProgress.percentage}
        />
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
        <Grid container item xs={12}>
          {currentLevel &&
          projections &&
          formattedDataWithProjections &&
          minimumTimeToLevelInSeconds ? (
            <ProjectionsQuickStats
              currentLevel={currentLevel}
              projections={projections}
              chartData={formattedDataWithProjections}
              minimumTimeToLevelInSeconds={minimumTimeToLevelInSeconds}
            />
          ) : (
            <span>Unable to load quickstats</span>
          )}
        </Grid>
        <Grid item xs={12}>
          {formattedDataWithProjections.length > 1 && (
            <LevelUpChart chartData={formattedDataWithProjections} />
          )}
          {currentLevel === 1 && (
            <span>Not enough data, come back after you level up :) </span>
          )}
        </Grid>
      </Grid>
    </div>
  );
};
