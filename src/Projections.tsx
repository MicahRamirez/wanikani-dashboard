import React from "react";
import CircularProgress from "@material-ui/core/CircularProgress";
import LinearProgress from "@material-ui/core/LinearProgress";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import { DateTime } from "luxon";

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

// default sort for assignments that have available_at set to null. We want these at the end of the array. If available_at is null then it is likely in the
// lesson queue.
const EPOCH_STRING_DEFAULT = "2100-01-01T00:00:00Z";
const sortByAvailable = (a: Assignment, b: Assignment) => {
  const dateTimeA = DateTime.fromISO(
    a.available_at ? a.available_at : EPOCH_STRING_DEFAULT
  ).toMillis();
  const dateTimeB = DateTime.fromISO(
    b.available_at ? b.available_at : EPOCH_STRING_DEFAULT
  ).toMillis();
  return dateTimeA - dateTimeB;
};

interface SrsBuckets {
  [srsStage: number]: Assignment[];
}

const SRS_BUCKETS: SrsBuckets = { 0: [], 1: [], 2: [], 3: [], 4: [] };

const groupBySrsStage = (
  groupingsSoFar: SrsBuckets,
  currentAssignment: Assignment
) => {
  groupingsSoFar[currentAssignment.srs_stage].push(currentAssignment);
  return groupingsSoFar;
};

const calculateFastestLevelUpTime = (
  wrappedLevelUpAssignments: WanikaniCollectionWrapper<Assignment>[],
  wrappedSubjects: WanikaniCollectionWrapper<Subject>[],
  currentLevel: number | undefined
) => {
  if (!wrappedSubjects || !wrappedLevelUpAssignments) {
    return;
  }
  debugger;
  console.log(currentLevel);
  // filtering out assignments without an ava
  const {
    kanji: kanjiAssignments,
    radical: radicalAssignments
  } = unwrapCollectionWrapper(wrappedLevelUpAssignments)
    .filter(elem => elem.subject_type !== "vocabulary" && elem.srs_stage <= 4)
    .reduce<{ [subjectType: string]: Assignment[] }>(
      (prev, currentObj) => {
        prev[currentObj.subject_type].push(currentObj);
        return prev;
      },
      { kanji: [], radical: [] }
    );
  // a level up subject is a subject who factors into whether or not a level progression occurs
  const wrappedCurrentLevelUpSubjects = wrappedSubjects
    .filter(elem => elem.object !== "vocabulary")
    .reduce<{ [subjectType: string]: WanikaniCollectionWrapper<Subject>[] }>(
      (prev, currentObj) => {
        if (currentObj.data.level === currentLevel) {
          prev[currentObj.object].push(currentObj);
        }
        return prev;
      },
      { kanji: [], radical: [] }
    );
  const { kanjiSubjects, radicalSubjects } = {
    kanjiSubjects: unwrapCollectionWrapper(wrappedCurrentLevelUpSubjects.kanji),
    radicalSubjects: unwrapCollectionWrapper(
      wrappedCurrentLevelUpSubjects.radical
    )
  };
  // number guru'ed required for level up is determined by kanji
  const levelUpRequirement = Math.ceil(kanjiSubjects.length * 0.9);
  debugger;
  console.log(levelUpRequirement);
  console.log(radicalSubjects);
  console.log(radicalAssignments);
  // sort by closest available [now, a minute from now, ..., tomorrow, etc]
  kanjiAssignments.sort(sortByAvailable);
  radicalAssignments.sort(sortByAvailable);
  // group by srs groups
  const kanjiBySrsStage = kanjiAssignments.reduce(
    groupBySrsStage,
    Object.assign({}, SRS_BUCKETS)
  );
  const radicalsBySrsStage = radicalAssignments.reduce(
    groupBySrsStage,
    Object.assign({}, SRS_BUCKETS)
  );
  console.log(kanjiBySrsStage, radicalsBySrsStage);
  // when there aren't enough kanji assignments to level up we need to look at radicals (harder case)
  if (kanjiAssignments.length < levelUpRequirement) {
    // look at each radical and its srs level
    // for an srs level what's the remaining time to completion (in seconds)
    // radical -> remaining time left
    //         -> kanji unlocked at guru
    // which radicals are the closest to level up
    // so take all radicals closest to level up
    //    with these do they unlock enough kanji to meet the level requirement? if yes
    // upon completion
  }
  for (let i = 0; i < kanjiAssignments.length; i++) {}
  // we have enough kanji unlocked start at the highest srs level
  // group all kanji by srs level and sort by available at in each grouping
  // kanjiGuruedSoFar: number
  // totalRequiredTime: number (seconds?)
  // for srs levels starting at GURU - 1 to Apprentice 1:
  //    timeToAddForSrsLevel = 0
  //    for each kanji in a srs level
  //      set potentialTime to currentKanji.available_at - now
  //      kanjiGuruedSoFar + 1;
  //      if kanjiGuruedSoFar >= levelUpRequirement
  //        add potentialTime
  //        break;
  //
  // add timeSoFar + time
  // at Guru - 1 levels add up number of kanji. Does current Guru'ed kanji + Guru - 1 level kanji >= level requirement?

  console.log("required kanji for level up", levelUpRequirement);
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
  console.log("currentLevel", currentLevel);
  console.log(currentKanjiSubjects);
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
          levels: `${currentLevel}`
        }
      },
      localStorageDataKey: `${ASSIGNMENTS_LOCAL_STORAGE_KEY}?levels=${currentLevel}`
    },
    apiKey
  );
  const classes = useStyles();
  const fastestLevelUpTime = calculateFastestLevelUpTime(
    levelUpAssignments,
    currentKanjiSubjects,
    currentLevel
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
    console.log("Subject Progress", subjectProgress.percentage);
    console.log("Assignment Progress", assignmentProgress.percentage);
    return (
      <div>
        <span>Subject Progress</span>
        <LinearProgress value={subjectProgress.percentage} />
        <span>Assignment Progress</span>
        <LinearProgress value={assignmentProgress.percentage} />
        <CircularProgress />
      </div>
    );
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
