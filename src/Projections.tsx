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

const newSrsBuckets = () => {
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

const createExistenceMap = (assignmentArray: Assignment[]) => {
  return assignmentArray.reduce<{
    [assignmentId: number]: boolean;
  }>((assignmentMap, assignment) => {
    assignmentMap[assignment.subject_id] = true;
    return assignmentMap;
  }, {});
};

// determines the number of kanji that are unlocked by the GURU'ing of each radical assignment
const determineKanjiUnlockedByCurrentRadical = (
  radicalAssignment: Assignment,
  radicalUnlocksMap: { [radicalId: number]: number[] },
  lockedKanji: WanikaniCollectionWrapper<Subject>[],
  radicalIdToRadicalData: { [radicalId: number]: Assignment }
) => {
  let numberUnlockedKanji = 0;
  // for a radical assignment, check each kanji it is a component of
  radicalUnlocksMap[radicalAssignment.subject_id].forEach(kanjiSubjectId => {
    // from the locked kanji set get the kanjiSubject with kanjiSubjectId
    const kanji = lockedKanji.filter(wrappedKanji => {
      return wrappedKanji.id === kanjiSubjectId;
    })[0].data;
    // for typing sake, check that the component_subject_ids prop exists
    if (kanji.component_subject_ids) {
      kanji.component_subject_ids.forEach(radicalId => {
        // a radical component can be outside the current level(thus undefined in the lookup map), we do not care about these because
        // they were previously unlocked in another level and we are trying to determine what radical components in THIS LEVEL
        // unlock particular kanji
        const radicalCompareTo: Assignment | undefined =
          radicalIdToRadicalData[radicalId];
        // make sure we aren't comparing the same kanji
        if (
          radicalCompareTo &&
          radicalAssignment.subject_id !== radicalCompareTo.subject_id
        ) {
          if (radicalAssignment.srs_stage < radicalCompareTo.srs_stage) {
            numberUnlockedKanji++;
          } else if (
            radicalCompareTo.srs_stage === radicalAssignment.srs_stage &&
            radicalAssignment.available_at &&
            radicalCompareTo.available_at
          ) {
            // same srs stage
            const isSmaller = DateTime.fromISO(
              radicalAssignment.available_at
            ).diff(DateTime.fromISO(radicalCompareTo.available_at), ["seconds"])
              .seconds;
            if (isSmaller > 0) {
              numberUnlockedKanji++;
            }
          }
        }
      });
    }
  });
  if (numberUnlockedKanji === 0) {
    console.warn(
      "this radical assignment does not unlock any kanji by itself?",
      radicalAssignment
    );
  }
  return numberUnlockedKanji;
};

// calculates the fastest possible time a user can progress through the current level
const calculateFastestLevelUpTime = (
  wrappedLevelUpAssignments: WanikaniCollectionWrapper<Assignment>[], // assumption is that these assignments are for THIS level
  wrappedSubjects: WanikaniCollectionWrapper<Subject>[],
  currentLevel: number | undefined
) => {
  // split assignments for this level into kanji and radicals, ignore vocab
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
  // split *this levels* subjects into kanji and radicals
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

  // map of radicalId -> Assignment<Radical>
  const radicalIdToRadicalData = radicalAssignments.reduce<{
    [radicalId: number]: Assignment;
  }>((radicalIdToRadicalAssignment, radical) => {
    radicalIdToRadicalAssignment[radical.subject_id] = radical;
    return radicalIdToRadicalAssignment;
  }, {});
  // remove the WanikaniCollectionWrapper from subjects
  const kanjiSubjects = unwrapCollectionWrapper(
    wrappedCurrentLevelUpSubjects.kanji
  );
  // forumal for calculating required kanji to progress to the next level
  const levelUpRequirement = Math.ceil(kanjiSubjects.length * 0.9);
  // sort by closest available [now, a minute from now, ..., tomorrow, etc]
  kanjiAssignments.sort(sortByAvailable);
  radicalAssignments.sort(sortByAvailable);
  // group by srs groups
  const kanjiBySrsStage = kanjiAssignments.reduce<SrsBuckets>(
    groupBySrsStage,
    newSrsBuckets()
  );
  const radicalsBySrsStage = radicalAssignments.reduce<SrsBuckets>(
    groupBySrsStage,
    newSrsBuckets()
  );
  // out of all kanji assignments add up those >= GURU stage
  const kanjiPassedSoFar = Object.entries(kanjiBySrsStage).reduce<number>(
    (count, [key, item]) => {
      if (Number(key) >= GURU) {
        count += item.length;
      }
      return count;
    },
    0
  );

  const currentLevelKanjiAssignmentHashset = createExistenceMap(
    kanjiAssignments
  );
  const currentLevelRadicalAssignmentHashset = createExistenceMap(
    radicalAssignments
  );

  // Cross reference Subject<Kanji> for this level with Assignment<Kanji> to determine which kanji are locked
  // These stay wrapped because the subject_id is on the wrapper
  const lockedKanji: WanikaniCollectionWrapper<
    Subject
  >[] = wrappedCurrentLevelUpSubjects.kanji.filter(
    wrappedSubject => !currentLevelKanjiAssignmentHashset[wrappedSubject.id]
  );

  const radicalUnlocksKanjiMap = lockedKanji.reduce<{
    [radicalSubjectId: number]: number[];
  }>((radicalUnlocksKanji, currentLockedKanji) => {
    // component_subject_ids is an optional property on the Subject type, so we have to check for it
    if (currentLockedKanji.data.component_subject_ids) {
      // for a locked kanji for each component radical in component_subject_ids
      currentLockedKanji.data.component_subject_ids.forEach(
        radicalSubjectId => {
          // add the radical to the map with key as radicalSubjectId and value being the currentLockedKanji.id
          if (
            !radicalUnlocksKanji[radicalSubjectId] &&
            currentLevelRadicalAssignmentHashset[radicalSubjectId]
          ) {
            radicalUnlocksKanji[radicalSubjectId] = [currentLockedKanji.id];
          } else if (Array.isArray(radicalUnlocksKanji[radicalSubjectId])) {
            // a radical with an existing entry is a component for  at least two kanji in the current level
            radicalUnlocksKanji[radicalSubjectId].push(currentLockedKanji.id);
          }
        }
      );
    }
    return radicalUnlocksKanji;
  }, {});

  const calculateTimeToGuruInSeconds = (level: number | undefined) => {
    if (!level) {
      return 0;
    }
    let srsIdx = 0;
    let timeInSeconds = 0;
    while (srsIdx < 5) {
      if (FAST_LEVELS[level]) {
        timeInSeconds += SRS_STAGES[srsIdx].accelerated_interval;
      } else {
        timeInSeconds += SRS_STAGES[srsIdx].interval;
      }
      srsIdx++;
    }
    return timeInSeconds;
  };
  // when there aren't enough kanji assignments to level up we need to look at radicals (harder case)
  // EASY CASE: One radical unlocks one kanji
  // DIFFICULT CASE: Multiple radicals on the same level required to unlock a kanji
  // when there are multiple radicals the bottle neck is on the radical at the lowest srs stage
  // so when calculating the optimal time with dependent radicals, take the radical at the lower srs stage throw out the higher one
  // if the radicals are at the same level then take the one whose available now is furthest from now
  if (kanjiAssignments.length < levelUpRequirement) {
    let lockedKanjiUntilLevelUpRequirement =
      kanjiAssignments.length - levelUpRequirement;
    let timeToLevelUpInSeconds = 0;
    // SIMPLIFICATION STEP: Find radicals that map to the same kanji, determine which is at the lowest SRS stage, throw out the other
    srsLoop: for (let i = APPRENTICE_FOUR; i >= 0; i--) {
      if (radicalsBySrsStage[i].length === 0) {
        if (currentLevel && FAST_LEVELS[currentLevel]) {
          timeToLevelUpInSeconds += SRS_STAGES[i].accelerated_interval;
        } else {
          timeToLevelUpInSeconds += SRS_STAGES[i].interval;
        }
      }
      for (let k = 0; k < radicalsBySrsStage[i].length; k++) {
        const currentRadicalAvailableAt = radicalsBySrsStage[i][k].available_at;
        if (currentRadicalAvailableAt) {
          const potentialTimeInSeconds = DateTime.fromISO(
            currentRadicalAvailableAt
          ).diffNow("seconds").seconds;
          lockedKanjiUntilLevelUpRequirement -= determineKanjiUnlockedByCurrentRadical(
            radicalsBySrsStage[i][k],
            radicalUnlocksKanjiMap,
            lockedKanji,
            radicalIdToRadicalData
          );
          if (lockedKanjiUntilLevelUpRequirement <= 0) {
            timeToLevelUpInSeconds += potentialTimeInSeconds;
            break srsLoop;
          }
        } else if (k + 1 === radicalsBySrsStage[i].length) {
          if (currentLevel && FAST_LEVELS[currentLevel]) {
            timeToLevelUpInSeconds += SRS_STAGES[i].accelerated_interval;
          } else {
            timeToLevelUpInSeconds += SRS_STAGES[i].interval;
          }
        }
      }
    }
    return timeToLevelUpInSeconds + calculateTimeToGuruInSeconds(currentLevel);

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
  console.log("minutes", minutes);
  return (
    <div className={classes.root}>
      <Grid container spacing={3}>
        <Grid container item xs={12} spacing={10}>
          <Grid item xs={4} spacing={1}>
            <Paper elevation={3}>
              <span>Fastest time to level up</span>
              <br />
              {`${days}D ${hours}H ${
                minutes !== undefined ? Math.ceil(minutes) : "unknown"
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
