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
import { DateTime } from "luxon";

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
  const levelProgressions = unwrapCollectionWrapper(data);

  const resetTimeStamp = DateTime.fromISO(mostRecentResetTimeStamp);
  const filteredLevelProgressions = levelProgressions.filter(elem => {
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
      (levelProgressionTimeStamp <= resetTimeStamp &&
        elem.level <= targetLevel) ||
      levelProgressionTimeStamp > resetTimeStamp
    );
  });

  const formattedData = filteredLevelProgressions.map(levelProgression => {
    console.log(levelProgression.started_at);
    if (levelProgression.started_at && levelProgression.passed_at) {
      const completedAt = DateTime.fromISO(levelProgression.passed_at);
      const startedAt = DateTime.fromISO(levelProgression.started_at);
      return {
        level: levelProgression.level,
        daysToLevelUp: completedAt.diff(startedAt, "days").days,
        completedAt: completedAt.toString(),
        startedAt: startedAt.toString(),
        time: completedAt.toLocal().valueOf()
      };
    } else {
      const startedAt = levelProgression.started_at
        ? DateTime.fromISO(levelProgression.started_at)
        : DateTime.utc();
      return {
        level: levelProgression.level,
        startedAt: startedAt.toString(),
        daysToLevelUp: 0,
        completedAt: undefined,
        time: 0
      };
    }
  });
  const averageLevelUpInDays =
    formattedData.reduce((acc, curr) => {
      if (curr && curr.daysToLevelUp) {
        return acc + curr.daysToLevelUp;
      }
      return acc;
    }, 0) / formattedData.length;
  formattedData.sort((a, b) => {
    if (a && b) {
      return a.level - b.level;
    }
    return 0;
  });
  formattedData[formattedData.length - 1] = {
    ...formattedData[formattedData.length - 1],

    daysToLevelUp: averageLevelUpInDays,
    completedAt: DateTime.fromISO(
      formattedData[formattedData.length - 1].startedAt
    )
      .plus({ days: averageLevelUpInDays })
      .toString(),
    time: DateTime.fromISO(formattedData[formattedData.length - 1].startedAt)
      .plus({ days: averageLevelUpInDays })
      .toLocal()
      .valueOf()
  };
  // sorted up to max level completed
  const formattedDataWithProjections = [...formattedData];
  for (let i = formattedDataWithProjections.length; i <= 60; i++) {
    const previousLevelData = formattedDataWithProjections[i - 1];
    const previousCompletedAt =
      previousLevelData && previousLevelData.completedAt
        ? previousLevelData.completedAt
        : "";
    const levelData = {
      level: i,
      daysToLevelUp: averageLevelUpInDays,
      startedAt: previousLevelData.completedAt as string,
      completedAt: DateTime.fromISO(previousCompletedAt)
        .plus({
          days: averageLevelUpInDays
        })
        .toString(),
      time: DateTime.fromISO(previousCompletedAt)
        .plus({
          days: averageLevelUpInDays
        })
        .toLocal()
        .valueOf(),
      projectType: "average"
    };
    formattedDataWithProjections.push(levelData);
  }
  const timeVal = DateTime.fromMillis(formattedDataWithProjections[0].time);
  console.log(timeVal);
  const f = { month: "short", day: "numeric", year: "numeric" };
  const varsa = timeVal.setLocale("en-US").toLocaleString(f);
  console.log(varsa);
  debugger;
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
  console.log(formattedDataWithProjections);
  return (
    <div>
      <ResponsiveContainer width={"95%"} height={500}>
        <LineChart data={formattedDataWithProjections}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="time"
            type="number"
            domain={["auto", "auto"]}
            scale="time"
            tickFormatter={unixTime => {
              const timeVal = DateTime.fromMillis(unixTime);
              const f = { month: "short", day: "numeric", year: "numeric" };
              return timeVal.setLocale("en-US").toLocaleString(f);
            }}
          />
          <YAxis dataKey="level" />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="level" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
