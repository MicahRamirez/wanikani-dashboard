import React from "react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
  Line,
  LineChart,
  CartesianGrid,
  TooltipPayload
} from "recharts";
import { DateTime } from "luxon";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";

import {
  ChartData,
  AVERAGE_LEVEL_DATA_KEY,
  OBSERVED_LEVEL_DATA_KEY,
  MEDIAN_LEVEL_DATA_KEY,
  OPTIMAL_LEVEL_DATA_KEY
} from "./levelUpProjectionUtils";

interface TooltipProps {
  type: string;
  payload: TooltipPayload[];
  label: string;
  active: boolean;
}
const getTooltipCopy = (
  dataKey: TooltipPayload["dataKey"],
  value: TooltipPayload["value"]
) => {
  // TODO import data keys from the associated utils so don't have to rely on hardcoded strings
  switch (dataKey) {
    case OPTIMAL_LEVEL_DATA_KEY:
      return `Projected Optimal Level: ${value}`;
    case MEDIAN_LEVEL_DATA_KEY:
      return `Projected Median Level: ${value}`;
    case AVERAGE_LEVEL_DATA_KEY:
      return `Projected Average Level: ${value}`;
    case OBSERVED_LEVEL_DATA_KEY:
      return `Observed Level: ${value}`;
    default:
      return "unknown data key";
  }
};

export const TiltedAxisTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <g className=".test" transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#666"
        transform="rotate(-45)"
      >
        {DateTime.fromMillis(payload.value).toFormat("LLL y")}
      </text>
    </g>
  );
};

const CustomTooltip: React.FC<TooltipProps> = ({ payload, label, active }) => {
  if (!active) {
    return null;
  }
  // DateTime format tokens https://moment.github.io/luxon/docs/manual/formatting.html#table-of-tokens
  return (
    <Paper>
      <Box>
        <Typography variant="caption">
          {getTooltipCopy(payload[0].name, payload[0].value)}
        </Typography>
      </Box>
      <Box>
        <Typography variant="caption">
          {DateTime.fromMillis(Number(label)).toFormat("FF")}
        </Typography>
      </Box>
    </Paper>
  );
};

const getTicksAndDomain = (data: ChartData[], desiredTicks: number) => {
  // 1m in s, 2w in s, 1w in s, 1d in s
  const fittings = [
    2592000 * 1000,
    1296000 * 1000,
    648000 * 1000,
    86400 * 1000
  ];
  const fittingsTicks: number[][] = [[], [], [], []];
  // domain = MIN, MAX
  const domain = data.reduce(
    (domain, elem) => {
      if (elem.time < domain[0]) {
        domain[0] = elem.time;
      } else if (elem.time > domain[1]) {
        domain[1] = elem.time;
      }
      return domain;
    },
    [data[0].time, data[0].time]
  );
  console.log(domain);
  for (let i = 0; i < fittings.length; i++) {
    const currentFitting = fittings[i];
    const currentFittingArray = fittingsTicks[i];
    let start = domain[0];
    while (fittingsTicks[i].length <= desiredTicks - 1 && start < domain[1]) {
      currentFittingArray.push(start);
      start += currentFitting;
    }
  }
  let selectedFitting = fittingsTicks[0];
  for (let i = 0; i < fittingsTicks.length; i++) {
    const diffWithEndpoint =
      domain[1] - selectedFitting[selectedFitting.length - 1];
    if (
      domain[1] - fittingsTicks[i][fittingsTicks[i].length - 1] <
      diffWithEndpoint
    ) {
      selectedFitting = fittingsTicks[i];
    }
  }
  return { domain: domain, ticks: selectedFitting };
};

/**
 */
export const LevelUpChart: React.FC<{ chartData: ChartData[] }> = ({
  chartData
}) => {
  const NUMBER_OF_TICKS = 10;
  const { ticks, domain } = getTicksAndDomain(chartData, NUMBER_OF_TICKS);
  console.log(ticks, domain);
  // Mean: What is the average level up time
  // Median: What is the time of the average level up
  // Fastest Possible:
  // Optimal: Given your current pace on the current level
  return (
    <div>
      <ResponsiveContainer width={"95%"} height={500}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            type="number"
            dataKey="time"
            domain={domain as any}
            // tick={<TiltedAxisTick />}
            tickFormatter={unixTime => {
              console.log("tet");
              const formatted = DateTime.fromMillis(unixTime).toFormat("f");
              if (!formatted) {
                console.log("wtf");
              }
              return formatted;
            }}
          />
          <YAxis
            type="number"
            domain={[1, 60]}
            ticks={[1, 10, 20, 30, 40, 50, 60]}
            dataKey={obj => {
              if (obj.averageLevel) {
                return obj.averageLevel;
              } else if (obj.medianLevel) {
                return obj.medianLevel;
              } else if (obj.type === "recorded") {
                return obj.level;
              }
            }}
          />
          <Tooltip
            content={(props: TooltipProps) => {
              if (!props) {
                return null;
              }
              return <CustomTooltip {...props} />;
            }}
          />
          <Legend />
          <Line type="natural" dataKey="averageLevel" stroke="green" />
          <Line type="natural" dataKey="level" stroke="blue" />
          <Line type="natural" dataKey="medianLevel" stroke="orange" />
          <Line type="natural" dataKey="optimalLevel" stroke="red" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
