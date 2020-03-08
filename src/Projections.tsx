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
  RESETS_LOCAL_STORAGE_KEY,
  SRS_STAGES,
  FAST_LEVELS
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

const GURU = 5;
const APPRENTICE_FOUR = 4;
interface SrsBuckets {
  [srsStage: number]: Assignment[];
}

const newBuckets = () => {
  const buckets: { [bucket: number]: Assignment[] } = {};
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].reduce<SrsBuckets>(
    (bucketSoFar, srsStage) => {
      bucketSoFar[srsStage] = [];
      return bucketSoFar;
    },
    buckets
  );
};

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
    return 0;
  }
  // filtering out assignments without an ava
  const {
    kanji: kanjiAssignments,
    radical: radicalAssignments
  } = unwrapCollectionWrapper(wrappedLevelUpAssignments)
    .filter(elem => elem.subject_type !== "vocabulary")
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
  // sort by closest available [now, a minute from now, ..., tomorrow, etc]
  kanjiAssignments.sort(sortByAvailable);
  radicalAssignments.sort(sortByAvailable);
  // group by srs groups
  const kanjiBySrsStage = kanjiAssignments.reduce(
    groupBySrsStage,
    newBuckets()
  );

  const radicalsBySrsStage = radicalAssignments.reduce(
    groupBySrsStage,
    newBuckets()
  );
  const kanjiPassedSoFar = Object.entries(kanjiBySrsStage).reduce(
    (count, [key, item]) => {
      if (Number(key) >= GURU) {
        count += item.length;
      }
      return count;
    },
    0
  );
  const kanjiAssignmentSubjectIdMap = kanjiAssignments.reduce<{
    [assignmentSubjectId: number]: boolean;
  }>((assignmentMap, kanjiAssignment) => {
    assignmentMap[kanjiAssignment.subject_id] = true;
    return assignmentMap;
  }, {});
  const lockedKanji = wrappedCurrentLevelUpSubjects.kanji.filter(
    wrappedSubject => !kanjiAssignmentSubjectIdMap[wrappedSubject.id]
  );
  const currentLevelRadicalAssignmentMap = radicalAssignments.reduce<{
    [radicalSubjectId: number]: boolean;
  }>((radicalMap, currentRadicalAssignment) => {
    radicalMap[currentRadicalAssignment.subject_id] = true;
    return radicalMap;
  }, {});
  const radicalUnlocksKanjiMap = lockedKanji.reduce<{
    [radicalSubjectId: number]: number[];
  }>((radicalUnlocksKanji, currentLockedKanji) => {
    if (currentLockedKanji.data.component_subject_ids) {
      // for a locked radical for each component radical add that radical as a key with value being kanji associated with it
      // a single radical could hypothetically unlock more than 1 kanji
      currentLockedKanji.data.component_subject_ids.forEach(
        radicalSubjectId => {
          if (
            !radicalUnlocksKanji[radicalSubjectId] &&
            currentLevelRadicalAssignmentMap[radicalSubjectId]
          ) {
            radicalUnlocksKanji[radicalSubjectId] = [currentLockedKanji.id];
          } else if (Array.isArray(radicalUnlocksKanji[radicalSubjectId])) {
            radicalUnlocksKanji[radicalSubjectId].push(currentLockedKanji.id);
          }
        }
      );
    }
    return radicalUnlocksKanji;
  }, {});
  console.log(lockedKanji);
  console.log(radicalUnlocksKanjiMap);
  // want a map of for a radical which kanji they unlock at this level
  // so same as kanji, each radical sorted by available_at and grouped by srs stage
  // while going through the exact same algo for kanji only different is for the radical id unlockMap[radicalId].length - kanjiPassedSoFar
  // const radicalUnlockMap =
  // for kanji without an available_at
  console.log(radicalSubjects, radicalsBySrsStage);
  console.log(kanjiSubjects);
  console.log(wrappedCurrentLevelUpSubjects.radical);
  console.log("Wrapped Kanji Subjects", wrappedCurrentLevelUpSubjects.kanji);
  // when there aren't enough kanji assignments to level up we need to look at radicals (harder case)
  // EASY CASE: One radical unlocks one kanji
  // DIFFICULT CASE: Multiple radicals on the same level required to unlock a kanji
  // when there are multiple radicals the bottle neck is on the radical at the lowest srs stage
  // so when calculating the optimal time with dependent radicals, take the radical at the lower srs stage throw out the higher one
  // if the radicals are at the same level then take the one whose available now is furthest from now
  if (kanjiAssignments.length < levelUpRequirement) {
    // so while there aren't enough kanji the minimum amount of time to level up is
    // look at each radical and its srs level
    // for an srs level what's the remaining time to completion (in seconds)
    // radical -> remaining time left
    //         -> kanji unlocked at guru
    // which radicals are the closest to level up
    // so take all radicals closest to level up
    //    with these do they unlock enough kanji to meet the level requirement? if yes
    // upon completion
  }
  let kanjiRequiredToLevelUp = levelUpRequirement - kanjiPassedSoFar;
  let timeToLevelUp = 0;
  loopOne: for (let i = APPRENTICE_FOUR; i >= 0; i--) {
    // for each srs bucket we add the max amount of time expected for that level as it is the bottleneck
    for (let k = 0; k < kanjiBySrsStage[i].length; k++) {
      const currentKanjiAvailableAt = kanjiBySrsStage[i][k].available_at;
      if (currentKanjiAvailableAt) {
        // determine how long from now until this kanji can be attacked
        const potentialTime = DateTime.fromISO(currentKanjiAvailableAt).diffNow(
          "seconds"
        ).seconds;
        // add this kanji as one required for level up
        kanjiRequiredToLevelUp--;
        if (kanjiRequiredToLevelUp <= 0) {
          // after including this kanji we have fit our requirement
          // add the time to level up and get out of this iteration
          timeToLevelUp += potentialTime;
          break loopOne;
        } else if (k + 1 === kanjiBySrsStage[i].length) {
          // we attempted to add every single time until as a configuration, none got us to required level up
          // this means that we at least have some other kanji in a lower SRS bucket so at the minimum the time required
          // is this srs level interval + some lower srs bucket time from now
          if (currentLevel && FAST_LEVELS[currentLevel]) {
            timeToLevelUp += SRS_STAGES[i].accelerated_interval;
          } else {
            timeToLevelUp += SRS_STAGES[i].interval;
          }
        }
      } else {
        console.warn("potential time was null or undefined");
      }
    }
  }
  return timeToLevelUp;
  // for ()
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
  console.log(currentLevel);
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
  const { days, hours, minutes } = DateTime.local()
    .plus({ seconds: fastestLevelUpTime })
    .diffNow(["days", "hours", "minutes"])
    .toObject();
  const fastestLevelUpDate = DateTime.local()
    .plus({ seconds: fastestLevelUpTime })
    .toFormat("ff");
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
            <Paper elevation={3}>
              <span>Fastest time to level up</span>
              <br />
              {`${days}D ${hours}H ${
                minutes ? Math.ceil(minutes) : "unknown"
              }M`}
              <br />
              <span>{fastestLevelUpDate}</span>
            </Paper>
          </Grid>
          <Grid item xs={4} spacing={1}>
            <Paper elevation={3}>Estimated time to level up</Paper>
          </Grid>
          <Grid item xs={4} spacing={1}>
            <Paper elevation={3}>Average Accuracy of Current Level Kanji</Paper>
          </Grid>
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
