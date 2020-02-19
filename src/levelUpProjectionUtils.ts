import { DateTime, Duration } from "luxon";
import { WanikaniCollectionWrapper, unwrapCollectionWrapper } from "./useWKApi";

import { Reset, LevelProgression } from "./wanikaniTypes";

export interface ChartData {
  level?: number;
  timeToLeveUp?: Duration;
  completedAt: DateTime;
  startedAt: DateTime;
  time: number; // ms since epoch
  averageLevel?: number;
  medianLevel?: number;
  type: "average" | "recorded" | "median";
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
  const resetData = unwrapCollectionWrapper(resetDataWrapper);
  // starting at a time before WK conception
  let mostRecentReset = resetData[0];
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
    targetLevel: mostRecentReset.target_level,
    originalLevel: mostRecentReset.original_level
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
      console.log("filtering out an uncompleted level");
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
    mostRecentResetTimeStamp: string;
    targetLevel: number;
    originalLevel: number;
  }
) => {
  const levelProgressions: LevelProgression[] = unwrapCollectionWrapper(data);
  const filteredLevelProgressions: LevelProgression[] = filterLevelProgressions(
    levelProgressions,
    targetLevel,
    mostRecentResetTimeStamp
  );
  const formattedData: ChartData[] = formatLevelProgressions(
    filteredLevelProgressions
  );
  const averageLevelUpInDays: number = getAverageLevelUpInDays(formattedData);
  const medianLevelUpInDays: number = getMedianLevelUpInDays(formattedData);
  const projections: { days: number; type: "average" | "median" }[] = [
    { days: averageLevelUpInDays, type: "average" },
    { days: medianLevelUpInDays, type: "median" }
  ];
  // const optimalLevelUpInDays: number = getOptimalLevelUpInDays()
  // const goalLevelUpInDays: number = getUserGoalLevelUpInDays()

  // sorted up to max level completed
  const averageProjection = [...[formattedData[formattedData.length - 1]]];
  const medianProjection = [...[formattedData[formattedData.length - 1]]];
  let previousAverageIdx = 0;
  let previousMedianIdx = 0;
  for (let i = formattedData.length; i <= 60; i++) {
    const previousAverageProjection = averageProjection[previousAverageIdx];
    const previousMedianProject = medianProjection[previousMedianIdx];
    averageProjection.push({
      averageLevel: i,
      startedAt: previousAverageProjection.completedAt,
      completedAt: previousAverageProjection.completedAt.plus({
        days: projections[0].days
      }),
      time: previousAverageProjection.completedAt
        .plus({
          days: projections[0].days
        })
        .valueOf(),
      type: projections[0].type
    });

    medianProjection.push({
      medianLevel: i,
      startedAt: previousMedianProject.completedAt,
      completedAt: previousMedianProject.completedAt.plus({
        days: projections[1].days
      }),
      time: previousMedianProject.completedAt
        .plus({
          days: projections[1].days
        })
        .valueOf(),
      type: projections[1].type
    });
    previousAverageIdx++;
    previousMedianIdx++;
  }
  formattedData.pop();
  averageProjection.shift();
  medianProjection.shift();
  const formattedDataWithProjections = [
    ...formattedData,
    ...averageProjection,
    ...medianProjection
  ];
  console.log(formattedDataWithProjections.length, "full data set length");
  return { formattedDataWithProjections, averageLevelUpInDays };
};
