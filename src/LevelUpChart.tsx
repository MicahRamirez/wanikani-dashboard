import React from "react";
import CircularProgress from "@material-ui/core/CircularProgress";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
  Line,
  LineChart,
  CartesianGrid
} from "recharts";
import { useWKApi, WanikaniCollectionWrapper } from "./useWKApi";
import { DateTime, Duration } from "luxon";

const LEVEL_PROGRESSIONS_API_URL =
  "https://api.wanikani.com/v2/level_progressions";
const LEVEL_PROGRESSION_LOCAL_STORAGE_KEY = "levelProgressions";
const RESETS_API_URL = "https://api.wanikani.com/v2/resets";
const RESETS_LOCAL_STORAGE_KEY = "resets";

// TODO

export interface LevelProgression {
  abandoned_at: null | string; // Timestamp when the user abandons the level. This is primary used when the user initiates a reset.
  completed_at: null | string; // Timestamp when the user burns 100% of the assignments belonging to the associated subject's level.
  created_at: string; // Timestamp when the level progression is created
  level: number; // Integer	The level of the progression, with possible values from 1 to 60.
  passed_at: null | string; // Timestamp when the user passes at least 90% of the assignments with a type of kanji belonging to the associated subject's level.
  started_at: null | string; // Timestamp when the user starts their first lesson of a subject belonging to the level.
  unlocked_at: null | string; // Timestamp when the user can access lessons and reviews for the level.
}

export interface Reset {
  created_at: string; // Timestamp when the reset was created.
  original_level: number; // The user's level before the reset, from 1 to 60
  target_level: number; // The user's level after the reset, from 1 to 60. It must be less than or equal to original_level.
  confirmed_at: string; //Timestamp when the user confirmed the reset.
}

// level: levelProgression.level,
// daysToLevelUp: completedAt.diff(startedAt, "days").days,
// completedAt: completedAt.toString(),
// startedAt: startedAt.toString(),
// time: completedAt.toLocal().valueOf()
export interface ChartData {
  level: number;
  timeToLeveUp?: Duration;
  completedAt: DateTime;
  startedAt: DateTime;
  time?: number; // ms since epoch
  timeaverage?: number;
  timemedian?: number;
  type: "average" | "recorded" | "median";
}

const aggregateLevelProgressionData = (data: LevelProgression[]) => {
  return data;
};

const aggregateResetsData = (data: Reset[]) => {
  return data;
};

const unwrapCollectionWrapper = <T extends unknown>(
  wrappedData: WanikaniCollectionWrapper<T>[]
): T[] => {
  return wrappedData.map<T>(wrappedElement => wrappedElement.data);
};

const getAverageLevelUpInDays = (obj: ChartData[]): number => {
  return (
    obj.reduce<number>((acc, curr) => {
      debugger;
      if (curr && curr.timeToLeveUp) {
        return acc + curr.timeToLeveUp.days;
      }
      return acc;
    }, 0) / obj.length
  );
};

const formatLevelProgressions = (
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
    debugger;
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
    if (a && b) {
      return a.level - b.level;
    }
    return 0;
  });
  return formattedData;
};

const analyzeResetData = (
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

const filterLevelProgressions = (
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

const getMedianLevelUpInDays = (formattedData: ChartData[]) => {
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

const analyzeLevelProgressions = (
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
  console.log(averageLevelUpInDays);
  const medianLevelUpInDays: number = getMedianLevelUpInDays(formattedData);
  const projections: { days: number; type: "average" | "median" }[] = [
    { days: averageLevelUpInDays, type: "average" },
    { days: medianLevelUpInDays, type: "median" }
  ];
  console.log(projections);
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
      level: i,
      startedAt: previousAverageProjection.completedAt,
      completedAt: previousAverageProjection.completedAt.plus({
        days: projections[0].days
      }),
      timeaverage: previousAverageProjection.completedAt
        .plus({
          days: projections[0].days
        })
        .valueOf(),
      type: projections[0].type
    });

    medianProjection.push({
      level: i,
      startedAt: previousMedianProject.completedAt,
      completedAt: previousMedianProject.completedAt.plus({
        days: projections[1].days
      }),
      timemedian: previousMedianProject.completedAt
        .plus({
          days: projections[1].days
        })
        .valueOf(),
      type: projections[1].type
    });
    previousAverageIdx++;
    previousMedianIdx++;

    // const levelData = {
    //   level: i,
    //   startedAt: previousLevelData.completedAt,
    //   completedAt: previousLevelData.completedAt.plus({
    //     days: projection.days
    //   }),

    //   [`time${projection.type}`]: previousLevelData.completedAt
    //     .plus({ days: projection.days })
    //     .valueOf(),
    //   type: projection.type
    // };
  }
  // const timeVal = DateTime.fromMillis(formattedDataWithProjections[0].time);
  // const f = { month: "short", day: "numeric", year: "numeric" };
  // const varsa = timeVal.setLocale("en-US").toLocaleString(f);
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

export const LevelUpChart: React.FC<{ apiKey: string }> = ({ apiKey }) => {
  // *should* yield all level progressions, including those from past resets
  const [{ data, isLoading, isError, doFetch }] = useWKApi<LevelProgression>(
    LEVEL_PROGRESSIONS_API_URL,
    {
      axiosConfig: { method: "GET", responseType: "json" },
      mungeFunction: aggregateLevelProgressionData,
      localStorageDataKey: LEVEL_PROGRESSION_LOCAL_STORAGE_KEY
    },
    apiKey
  );

  const [
    {
      data: resetData,
      isLoading: resetDataIsLoading,
      isError: resetDataIsError,
      doFetch: resetDataDoFetch
    }
  ] = useWKApi<Reset>(
    RESETS_API_URL,
    {
      axiosConfig: { method: "GET", responseType: "json" },
      mungeFunction: aggregateResetsData,
      localStorageDataKey: RESETS_LOCAL_STORAGE_KEY
    },
    apiKey
  );
  console.log(isError, doFetch);
  console.log(resetDataIsError, resetDataDoFetch);
  if (
    isLoading ||
    resetDataIsLoading ||
    data === undefined ||
    resetData === undefined
  ) {
    return <CircularProgress />;
  }
  // ignore level progressions between targetLevel and originalLevel after the mostRecentReset timestamp (USED TO FILTER)
  const {
    mostRecentResetTimeStamp,
    targetLevel,
    originalLevel
  } = analyzeResetData(resetData);
  const { formattedDataWithProjections } = analyzeLevelProgressions(data, {
    mostRecentResetTimeStamp,
    targetLevel,
    originalLevel
  });
  console.log("formatted projections", formattedDataWithProjections);
  // console.log(
  //   "TIME",
  //   formattedDataWithProjections.map(element => {
  //     if (element.timemedian) {
  //       return DateTime.fromMillis(element.timemedian).toString();
  //     } else if (element.timeaverage) {
  //       return DateTime.fromMillis(element.timeaverage).toString();
  //     } else if (element.time) {
  //       return DateTime.fromMillis(element.time).toString();
  //     } else {
  //       return "wtf";
  //     }
  //   })
  // );
  // const ticks = [
  //   DateTime.utc(2019, 5, 15, 8, 30).valueOf(),
  //   DateTime.utc(2019, 10, 15, 8, 30).valueOf(),
  //   DateTime.utc(2019, 12, 15, 8, 30).valueOf(),
  //   DateTime.utc(2020, 2, 30, 8, 30).valueOf()
  // ];
  return (
    <div>
      <ResponsiveContainer width={"95%"} height={500}>
        <LineChart data={formattedDataWithProjections}>
          <CartesianGrid strokeDasharray="3 3" />

          <YAxis
            type="number"
            scale="time"
            dataKey={obj => {
              if (obj.timemedian) {
                return obj.timemedian;
              } else if (obj.timeaverage) {
                return obj.timeaverage;
              } else if (obj.time) {
                return obj.time;
              }
              debugger;
              return [obj.time, obj.level];
            }}
            domain={["auto", "auto"]}
          />
          <XAxis type="number" dataKey="level" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={"timemedian"} stroke="yellow" />
          <Line type="monotone" dataKey="time" stroke="blue" />
          <Line type="monotone" dataKey={"timeaverage"} stroke="orange" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
