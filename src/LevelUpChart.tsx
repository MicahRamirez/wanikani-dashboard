import React from "react";
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
import { DateTime } from "luxon";

import { ChartData } from "./levelUpProjectionUtils";

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
          <Tooltip />
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
