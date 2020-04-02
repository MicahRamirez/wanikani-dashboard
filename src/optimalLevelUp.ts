import { DateTime } from "luxon";

import { unwrapCollectionWrapper } from "./useWKApi";
import { Subject, Assignment } from "./wanikaniTypes";
import { SRS_STAGES, FAST_LEVELS } from "./constants";
import { WanikaniCollectionWrapper } from "./localStorageUtils";

/**
 * on level up all radicals are made available
 *
 * Optimal level up time is
 * Time taken to guru radicals + time taken to guru kanji
 * Optimal time is ((14400 + 28800 + 82800 + 169200) * 1000 ) *2
 *                 A1 + A2 + A3 + A4
 * fastest level up time 6.829916666666667 for long levels
 *
 * fastest level up time for short levels
 */
// get assignments of type kanji and radical at uncompleted level
// get review statistics for all subjects
const MILLISECONDS_IN_SECONDS = 1000;
// each level is gated by 2 passes of subjects from Apprentice I to Guru I
const PROGRESSION_GATES = 2;

// TODO: Move to levelUpProjectionUtils
export const calculateOptimalLevelUp = () => {
  const timeUntilPassedInMS =
    (SRS_STAGES[1].interval +
      SRS_STAGES[2].interval +
      SRS_STAGES[3].interval +
      SRS_STAGES[4].interval) *
    MILLISECONDS_IN_SECONDS *
    PROGRESSION_GATES;
  const fastTimeUntilPassedInMS =
    (SRS_STAGES[1].accelerated_interval +
      SRS_STAGES[2].accelerated_interval +
      SRS_STAGES[3].accelerated_interval +
      SRS_STAGES[4].accelerated_interval) *
    MILLISECONDS_IN_SECONDS *
    PROGRESSION_GATES;

  const now = DateTime.utc();

  const optimalLongInDays = now.plus(timeUntilPassedInMS).diff(now, "days")
    .days;
  const optimalShortInDays = now.plus(fastTimeUntilPassedInMS).diff(now, "days")
    .days;

  return {
    optimalShortInDays,
    optimalLongInDays
  };
};

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
      // TODO: IF THERE IS ANOTHER RADICAL ASSIGNMENT IN THIS LEVEL THAT IS A COMPONENT OF THIS KANJI WE NEED TO COMPARE THEM.
      // ONLY INCREMENT BY THE BOTTLE NECK
      // IF THERE ARE NO OTHER RADICAL ASSIGNMENTS IN THIS LEVEL FOR THIS KANJI THEN THIS SHOULD INCREASE THE numberUnlocked
      // so for all components in the kanji_component_subject_ids if radicalAssignment is the only one in there then increment
      const numberOfComponentsFromThisLevel = kanji.component_subject_ids.reduce(
        (numberSoFar, subject_id) => {
          if (radicalUnlocksMap[subject_id]) {
            return numberSoFar + 1;
          } else {
            return numberSoFar;
          }
        },
        0
      );
      if (numberOfComponentsFromThisLevel === 1) {
        numberUnlockedKanji++;
      } else {
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
              ).diff(DateTime.fromISO(radicalCompareTo.available_at), [
                "seconds"
              ]).seconds;
              if (isSmaller > 0) {
                numberUnlockedKanji++;
              }
            }
          }
        });
      }
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

const calculateAssignmentTimeInSeconds = (
  unlockRequirement: number,
  assignmentsBySrsStage: SrsBuckets,
  currentLevel: number | undefined,
  radicalHelpers: {
    radicalUnlocksKanjiMap: { [radicalSubjectId: number]: number[] };
    lockedKanji: WanikaniCollectionWrapper<Subject>[];
    radicalIdToRadicalData: { [radicalId: number]: Assignment };
  }
) => {
  let requiredSeconds = 0;
  let assignmentUnlockRequirement = unlockRequirement;
  // each Assignment type is sorted by first available to now AND grouped by their srs bucket
  srsBucketEvaluation: for (
    let srsStage = APPRENTICE_FOUR;
    srsStage >= 0;
    srsStage--
  ) {
    // evaluating srs stages from right to left, therefore if a higher srs stage is empty we must apply
    // the associated time cost for that level
    if (assignmentsBySrsStage[srsStage].length === 0) {
      if (currentLevel && FAST_LEVELS[currentLevel]) {
        requiredSeconds += SRS_STAGES[srsStage].accelerated_interval;
      } else {
        requiredSeconds += SRS_STAGES[srsStage].interval;
      }
    }

    // determine the cost in seconds for this srs stage
    // when the assignmentUnlockRequirement is met it is max(assignmentsBySrsStage[srsStage][k]) where k is somewhere between i=0 ,..., i=assignmentsBySrsStage[srsStage].length - 1
    // else cost is SRS_STAGE[i].interval when assignmentUnlockRequirement is not met for this srsStage
    for (let i = 0; i < assignmentsBySrsStage[srsStage].length; i++) {
      // assignment in srsStage with the ith closest available_at
      const assignment = assignmentsBySrsStage[srsStage][i];
      // available_at is undef at srs_stage 0
      if (assignment.available_at) {
        const secondsFromNow = DateTime.fromISO(
          assignment.available_at
        ).diffNow("seconds").seconds;
        // determine the associated weight of the assignment depending on its subject_type
        if (assignment.subject_type === "radical") {
          // a radical can 'unlock' one or more kanji
          assignmentUnlockRequirement -= determineKanjiUnlockedByCurrentRadical(
            assignmentsBySrsStage[srsStage][i],
            radicalHelpers.radicalUnlocksKanjiMap,
            radicalHelpers.lockedKanji,
            radicalHelpers.radicalIdToRadicalData
          );
        } else if (assignment.subject_type === "kanji") {
          assignmentUnlockRequirement--;
        }
        // the ith element in the srsStage completes this unlock requirement
        if (assignmentUnlockRequirement <= 0) {
          requiredSeconds += secondsFromNow;
          break srsBucketEvaluation;
        }
      }
      if (i + 1 === assignmentsBySrsStage[srsStage].length) {
        if (currentLevel && FAST_LEVELS[currentLevel]) {
          requiredSeconds += SRS_STAGES[srsStage].accelerated_interval;
        } else {
          requiredSeconds += SRS_STAGES[srsStage].interval;
        }
      }
    }
  }
  return requiredSeconds;
};

// calculates the fastest possible time a user can progress through the current level
export const calculateFastestLevelUpTime = (
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
  // formula for calculating required kanji to progress to the next level
  const levelUpRequirement = Math.ceil(kanjiSubjects.length * 0.9);
  // sort by closest available [now, a minute from now, ..., tomorrow, etc]
  kanjiAssignments.sort(sortByAvailable);
  radicalAssignments.sort(sortByAvailable);
  // group by srs groups
  const kanjiBySrsStage = kanjiAssignments.reduce<SrsBuckets>(
    groupBySrsStage,
    newSrsBuckets()
  );
  console.log("radicalAssignments for this level", radicalAssignments);
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

  if (levelUpRequirement === 0) {
    return 0;
  }

  if (kanjiAssignments.length < levelUpRequirement) {
    // calculates the time for kanjiAssignments.length to equal the levelRequirement + the time it takes to guru those unlocked
    return (
      calculateAssignmentTimeInSeconds(
        kanjiAssignments.length - levelUpRequirement,
        radicalsBySrsStage,
        currentLevel,
        { radicalUnlocksKanjiMap, lockedKanji, radicalIdToRadicalData }
      ) + calculateTimeToGuruInSeconds(currentLevel)
    );
  } else {
    return calculateAssignmentTimeInSeconds(
      levelUpRequirement - kanjiPassedSoFar,
      kanjiBySrsStage,
      currentLevel,
      { radicalUnlocksKanjiMap, lockedKanji, radicalIdToRadicalData }
    );
  }
};
