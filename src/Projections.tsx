import React from "react";
import CircularProgress from "@material-ui/core/CircularProgress";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";

import {
  analyzeLevelProgressions,
  analyzeResetData
} from "./levelUpProjectionUtils";
import { useWKApi, unwrapCollectionWrapper } from "./useWKApi";
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
import { WanikaniCollectionWrapper } from "./localStorageUtils";

/**
 * Upon leveling up all radicals are assigned and a portion of kanji are unlocked
 * in order to determine levelu
 * @param wrappedLevelUpAssignments
 * @param wrappedKanjiSubjects
 */
const calculateFastestLevelUpTime = (
  wrappedLevelUpAssignments: WanikaniCollectionWrapper<Assignment>[],
  wrappedKanjiSubjects: WanikaniCollectionWrapper<Subject>[]
) => {
  if (!wrappedKanjiSubjects || !wrappedLevelUpAssignments) {
    return;
  }
  // levelUpAssignments are assignments that are required to be guru'ed to level up
  const levelUpAssignments = unwrapCollectionWrapper(wrappedLevelUpAssignments)
    .filter(elem => elem.subject_type !== "vocabulary")
    .reduce<{ [subjectType: string]: Assignment[] }>(
      (prev, currentObj) => {
        prev[currentObj.subject_type].push(currentObj);
        return prev;
      },
      { kanji: [], radical: [] }
    );
  const kanjiSubjects = unwrapCollectionWrapper(wrappedKanjiSubjects);
  const levelUpRequirement = Math.ceil(kanjiSubjects.length * 0.9);
  // when there aren't enough kanji assignments to level up we need to look at radicals (harder case)
  if (levelUpAssignments.kanji.length < levelUpRequirement) {
    // look at each radical and its srs level
    // for an srs level what's the remaining time to completion (in seconds)
    // radical -> remaining time left
    //         -> kanji unlocked at guru
    // which radicals are the closest to level up
    // so take all radicals closest to level up
    //    with these do they unlock enough kanji to meet the level requirement? if yes
    // upon completion
  } else {
    // we have enough kanji unlocked start at the highest srs level
    // group all kanji by srs level and sort by available at in each grouping
    // kanjiGuruedSoFar: number
    // totalRequiredTime: number (seconds?)
    // for srs levels starting at GURU - 1 to Apprentice 1:
    //    timeToAddForSrsLevel = 0
    //    for each kanji in a srs level
    //      set potentialTime to currentKanji.available_at - now
    //      kanjiGuruedSoFar + 1;
    //      if kanjiGuruedSoFar < levelUpRequirement
    //        subtract
    //
    // add timeSoFar + time
    // at Guru - 1 levels add up number of kanji. Does current Guru'ed kanji + Guru - 1 level kanji >= level requirement?
  }

  console.log("required kanji for level up", levelUpRequirement);
  console.log("subjects", kanjiSubjects);
  console.log(levelUpAssignments);
};

const useStyles = makeStyles(_ => ({
  root: {
    flexGrow: 1
  }
}));

// const Tiles = () => {};

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
    { data: levelUpAssignments, isLoading: assignmentDataIsLoading }
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
  const classes = useStyles();
  const fastestLevelUpTime = calculateFastestLevelUpTime(
    levelUpAssignments,
    currentKanjiSubjects
  );
  console.log(fastestLevelUpTime);
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
    return <CircularProgress />;
  }

  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
        <Grid container item xs={12} spacing={10}>
          <Grid item xs={4} spacing={1}>
            <Paper elevation={3}>Fastest time to level up</Paper>
          </Grid>
          <Grid item xs={4} spacing={1}>
            <Paper elevation={3}>Estimated time to level up</Paper>
          </Grid>
          <Grid item xs={4} spacing={1}>
            <Paper elevation={3}>Average Accuracy of Current Level Kanji</Paper>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <LevelUpChart chartData={formattedDataWithProjections} />
        </Grid>
      </Grid>
    </div>
  );
};
