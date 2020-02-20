import { DateTime } from "luxon";

import { SRS_STAGES } from "./constants";

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
