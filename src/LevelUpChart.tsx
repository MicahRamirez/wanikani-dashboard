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

/**
 */
export const LevelUpChart: React.FC<{ chartData: ChartData[] }> = ({
  chartData
}) => {
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
            scale="time"
            dataKey={"time"}
            domain={["auto", "auto"]}
            tickFormatter={unixTime => {
              return DateTime.fromMillis(unixTime).toLocaleString(
                DateTime.DATETIME_FULL
              );
            }}
            tickCount={20}
            interval={"preserveStartEnd"}
          />
          <YAxis
            type="number"
            domain={[5, "dataMax"]}
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
