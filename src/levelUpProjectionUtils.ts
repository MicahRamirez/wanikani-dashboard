import { DateTime, Duration } from "luxon";
import { WanikaniCollectionWrapper, unwrapCollectionWrapper } from "./useWKApi";
import { calculateOptimalLevelUp } from "./optimalLevelUp";
import { FAST_LEVELS } from "./constants";

import { Reset, LevelProgression } from "./wanikaniTypes";

export interface ChartData {
  level?: number;
  timeToLeveUp?: Duration;
  completedAt: DateTime;
  startedAt: DateTime;
  time: number; // ms since epoch
  average?: number;
  median?: number;
  optimal?: number;
  type: "average" | "recorded" | "median" | "optimal" | "userpace";
}

export const AVERAGE_LEVEL_DATA_KEY = "average";
export const OBSERVED_LEVEL_DATA_KEY = "level";
export const MEDIAN_LEVEL_DATA_KEY = "median";
export const OPTIMAL_LEVEL_DATA_KEY = "optimal";

export interface Projections {
  [projectionType: string]: { days: { normal: number; accelerated: number } };
}

const getAverageLevelUpInDays = (obj: ChartData[]): number => {
  return (
    obj.reduce<number>((acc, curr) => {
      if (curr && curr.timeToLeveUp) {
        return acc + curr.timeToLeveUp.days;
      }
      return acc;
    }, 0) / obj.length
  );
};

const createProjection = (
  data: ChartData,
  projectionType: "average" | "median" | "optimal" | "recorded",
  projections: Projections,
  level: number
) => {
  let completedAt = data.completedAt.plus({
    days: projections[projectionType].days.normal
  });

  switch (projectionType) {
    case "optimal":
      if (FAST_LEVELS[level]) {
        completedAt = data.completedAt.plus({
          days: projections[projectionType].days.accelerated
        });
      }
      break;
    default:
      if (FAST_LEVELS[level]) {
        const {
          optimalLongInDays,
          optimalShortInDays
        } = calculateOptimalLevelUp();
        const deviationFromOptimal =
          projections[projectionType].days.normal / optimalLongInDays;
        const projectedAcceleratedDays =
          deviationFromOptimal * optimalShortInDays;
        completedAt = data.completedAt.plus({ days: projectedAcceleratedDays });
      }
  }
  return {
    startedAt: data.completedAt,
    completedAt: completedAt, // data.completedAt shifted by the average, median, or optimal
    time: completedAt.valueOf(),
    type: projectionType,
    [projectionType]: level
  };
};

export const formatLevelProgressions = (
  levelProgressions: LevelProgression[]
): ChartData[] => {
  const formattedData = levelProgressions.map<ChartData>(levelProgression => {
    const placeHolderDateTime = DateTime.utc();
    const startedAt = levelProgression.started_at
      ? DateTime.fromISO(levelProgression.started_at)
      : placeHolderDateTime;
    const completedAt = levelProgression.passed_at
      ? DateTime.fromISO(levelProgression.passed_at)
      : placeHolderDateTime;
    return {
      level: levelProgression.level,
      timeToLeveUp: completedAt.diff(startedAt, "days"),
      completedAt: completedAt,
      startedAt: startedAt,
      type: "recorded",
      time:
        completedAt.valueOf() !== placeHolderDateTime.valueOf()
          ? completedAt.valueOf()
          : 0 // use 0 to signify that this is a placeholder
    };
  });
  formattedData.sort((a, b) => {
    if (a.level && b.level) {
      return a.level - b.level;
    }
    return 0;
  });
  return formattedData;
};

export const analyzeResetData = (
  resetDataWrapper: WanikaniCollectionWrapper<Reset>[]
) => {
  if (!resetDataWrapper) {
    return {};
  }
  const resetData = unwrapCollectionWrapper(resetDataWrapper);
  // starting at a time before WK conception
  let mostRecentReset = resetData[0];
  if (!mostRecentReset) {
    return {};
  }
  for (let reset of resetData) {
    if (
      DateTime.fromISO(mostRecentReset.confirmed_at) <
      DateTime.fromISO(reset.confirmed_at)
    ) {
      mostRecentReset = reset;
    }
  }
  return {
    mostRecentResetTimeStamp: mostRecentReset.confirmed_at,
    targetLevel: mostRecentReset.target_level
  };
};

export const filterLevelProgressions = (
  levelProgressions: LevelProgression[],
  targetLevel: number,
  lastResetTimeStamp: string
) => {
  const resetDateTime = DateTime.fromISO(lastResetTimeStamp);
  return levelProgressions.filter(elem => {
    const levelProgressionTimeStamp = DateTime.fromISO(elem.created_at);
    // maybe can reduce some of this logic but there are two cases *i think* need to be handled
    // past exclusion case, the user could only partially reset thus we don't want to exclude all level progressions that are behind the timestamp
    // so if the progression came before the latest reset BUT it was less than the target level then this is valid data
    // Progression Oct 7 lvl 1
    // Progression Oct 8 lvl 2
    // Progression Oct 9 lvl 3
    // Oct 10 Reset lvl 2 ... reset timestmap of Oct 10
    // we should keep progression lvl 1 and accept lvl progressions created after the reset
    return (
      (levelProgressionTimeStamp <= resetDateTime &&
        elem.level <= targetLevel) ||
      levelProgressionTimeStamp > resetDateTime
    );
  });
};

export const getMedianLevelUpInDays = (formattedData: ChartData[]) => {
  const levelUpTimeInDays = formattedData
    .filter(data => {
      return data.time !== 0;
    })
    .map(data => {
      return data.completedAt.diff(data.startedAt, "days").days;
    });
  levelUpTimeInDays.sort((a, b) => a - b);
  if (levelUpTimeInDays.length % 2 === 0) {
    const middleLeft = levelUpTimeInDays.length / 2;
    const middleRight = middleLeft - 1;
    return levelUpTimeInDays[middleLeft] + levelUpTimeInDays[middleRight] / 2;
  } else {
    return levelUpTimeInDays[Math.floor(levelUpTimeInDays.length / 2)];
  }
};

export const analyzeLevelProgressions = (
  data: WanikaniCollectionWrapper<LevelProgression>[],
  {
    mostRecentResetTimeStamp,
    targetLevel
  }: {
    mostRecentResetTimeStamp: string | undefined;
    targetLevel: number | undefined;
  }
) => {
  if (data.length === 0) {
    return {};
  } else if (data.length === 1) {
    return { currentLevel: 1, formattedDataWithProjections: [] };
  }
  let levelProgressions: LevelProgression[] = unwrapCollectionWrapper(data);
  if (targetLevel && mostRecentResetTimeStamp) {
    levelProgressions = filterLevelProgressions(
      levelProgressions,
      targetLevel,
      mostRecentResetTimeStamp
    );
  }

  const formattedData: ChartData[] = formatLevelProgressions(levelProgressions);
  const averageLevelUpInDays: number = getAverageLevelUpInDays(formattedData);
  const medianLevelUpInDays: number = getMedianLevelUpInDays(formattedData);
  const { optimalLongInDays, optimalShortInDays } = calculateOptimalLevelUp();
  const projections: {
    [projectionType: string]: { days: { normal: number; accelerated: number } };
  } = {
    average: {
      days: { normal: averageLevelUpInDays, accelerated: averageLevelUpInDays }
    },
    median: {
      days: { normal: medianLevelUpInDays, accelerated: medianLevelUpInDays }
    },
    optimal: {
      days: { normal: optimalLongInDays, accelerated: optimalShortInDays }
    }
  };
  // sketch, but we know the last piece of data on this struct is defined
  const currentLevel = formattedData[formattedData.length - 1].level as number;
  const averageProjection = [...[formattedData[formattedData.length - 1]]];
  const medianProjection = [...[formattedData[formattedData.length - 1]]];
  const optimalProjection = [...[formattedData[formattedData.length - 1]]];
  let previousAverageIdx = 0;
  let previousMedianIdx = 0;
  let previousOptimalIdx = 0;
  for (let i = formattedData.length; i <= 60; i++) {
    const previousAverageProjection = averageProjection[previousAverageIdx];
    const previousMedianProjection = medianProjection[previousMedianIdx];
    const previousOptimalProjection = optimalProjection[previousOptimalIdx];
    averageProjection.push(
      createProjection(previousAverageProjection, "average", projections, i)
    );

    medianProjection.push(
      createProjection(previousMedianProjection, "median", projections, i)
    );
    optimalProjection.push(
      createProjection(previousOptimalProjection, "optimal", projections, i)
    );
    previousAverageIdx++;
    previousMedianIdx++;
    previousOptimalIdx++;
  }
  formattedData.pop();
  averageProjection.shift();
  medianProjection.shift();
  optimalProjection.shift();
  const formattedDataWithProjections = [
    ...formattedData,
    ...averageProjection,
    ...medianProjection,
    ...optimalProjection
  ];
  return {
    formattedDataWithProjections,
    averageLevelUpInDays,
    currentLevel,
    projections
  };
};
