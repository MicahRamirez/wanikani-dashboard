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
  TooltipPayload,
  ReferenceLine
} from "recharts";
import { DateTime } from "luxon";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import Box from "@material-ui/core/Box";
import ZoomInIcon from "@material-ui/icons/ZoomIn";
import ZoomOutIcon from "@material-ui/icons/ZoomOut";
import { useWindowSize } from "react-use";

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
  const { x, y, payload, screenWidth } = props;
  let formatToken = "LLL y";
  if (screenWidth < 1080) {
    formatToken = "LLL d";
  }
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
        {DateTime.fromMillis(payload.value).toFormat(formatToken)}
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
const recursiveHelper = (min: number, max: number, tickCount: number) => {
  return recursiveMethod(min, max, {}, tickCount, 0);
};

// this method isn't ideal, but is sufficient for a relatively small number of ticks across some domain x0->xn that are evenly
// distrubted across that domain. At higher tick levels this recursive method has a high cost because one of the base cases can
// only be properly evaluated as the recursion nears completion

// also the sub problem is repeated to max tickCount, so depth of tickCount O(2^n)
// not going to worry about refining this as will try highcharts for the next graph. Shouldn't have to be drawing my own ticks
const recursiveMethod = (
  minDomain: number,
  maxDomain: number,
  ticksAtLevel: { [levelIdx: number]: number[] },
  tickCount: number,
  tickLevel: number
) => {
  const midpoint = Math.floor((minDomain + maxDomain) / 2);
  if (minDomain >= maxDomain || maxDomain <= minDomain) {
    return ticksAtLevel;
    // we have the correct amount of ticks
  } else if (tickCount < 0) {
    return ticksAtLevel;
  } else if (
    ticksAtLevel[tickLevel] &&
    tickCount - ticksAtLevel[tickLevel].length < 0
  ) {
    // if the ticks at the current level would go over the current tick count this isn't a
    // config
    delete ticksAtLevel[tickLevel];
    return ticksAtLevel;
  }
  if (!ticksAtLevel[tickLevel]) {
    ticksAtLevel[tickLevel] = [];
  }

  // place a tick at the midpoint at the tick level
  ticksAtLevel[tickLevel].push(midpoint);

  recursiveMethod(
    midpoint,
    maxDomain,
    ticksAtLevel,
    tickCount - 1,
    tickLevel + 1
  );
  recursiveMethod(
    minDomain,
    midpoint,
    ticksAtLevel,
    tickCount - 1,
    tickLevel + 1
  );
  return ticksAtLevel;
};

const LABEL_COPY: { [labelKey: string]: string } = {
  average: "Average Level Projection",
  level: "Observed Level",
  median: "Median Level Projection",
  optimal: "Optimal Level Projection"
};
export const LevelUpChart: React.FC<{ chartData: ChartData[] }> = ({
  chartData
}) => {
  const [zoom, setZoom] = React.useState("small");
  const handleZoom = (_: any, newZoom: "small" | "large") => {
    if (newZoom !== null) {
      setZoom(newZoom);
    }
  };
  const { width } = useWindowSize();
  let data = chartData;
  let xAxisDomain = [0, 0];
  let yAxisDomain = [61, 0];
  let yAxisTicks = [1, 10, 20, 30, 40, 50, 60];
  if (width < 1080 || zoom === "small") {
    const domainStart = DateTime.local()
      .minus({ months: 1 })
      .toMillis();
    const domainEnd = DateTime.local()
      .plus({ months: 2 })
      .toMillis();
    xAxisDomain = [domainStart, domainEnd];
    data = data.filter(dataToRender => {
      return (
        dataToRender.time > xAxisDomain[0] && dataToRender.time < xAxisDomain[1]
      );
    });
    yAxisDomain = data
      .map(elem => {
        let level = 0;
        if (elem.level) {
          level = elem.level;
        } else if (elem.median) {
          level = elem.median;
        } else if (elem.optimal) {
          level = elem.optimal;
        } else if (elem.average) {
          level = elem.average;
        }
        return {
          level
        };
      })
      .reduce(
        (yAxisDomainSoFar, dataEl) => {
          if (dataEl.level < yAxisDomainSoFar[0]) {
            yAxisDomainSoFar[0] = dataEl.level;
          }
          if (dataEl.level > yAxisDomainSoFar[1]) {
            yAxisDomainSoFar[1] = dataEl.level;
          }
          return yAxisDomainSoFar;
        },
        [61, 0]
      );
    const finalAxis = [];
    for (let i = yAxisDomain[0]; i <= yAxisDomain[1]; i++) {
      finalAxis.push(i);
    }
    yAxisTicks = finalAxis;
  } else {
    xAxisDomain = chartData.reduce(
      (domain, elem) => {
        if (elem.time < domain[0]) {
          domain[0] = elem.time;
        } else if (elem.time > domain[1]) {
          domain[1] = elem.time;
        }
        return domain;
      },
      [chartData[0].time, chartData[0].time]
    );
  }

  const NUMBER_OF_TICKS = 5;
  const ticksAtLevel = recursiveHelper(
    xAxisDomain[0],
    xAxisDomain[1],
    NUMBER_OF_TICKS
  );
  const actualTicks = Object.values(ticksAtLevel).reduce(
    (tickArray, currentArray) => {
      return [...tickArray, ...currentArray];
    },
    [xAxisDomain[0]]
  );
  // Mean: What is the average level up time
  // Median: What is the time of the average level up
  // Fastest Possible:
  // Optimal: Given your current pace on the current level
  return (
    <Paper elevation={3}>
      <div style={{ paddingTop: "26px", paddingRight: "26px" }}>
        <ResponsiveContainer height={500}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              type="number"
              dataKey="time"
              domain={xAxisDomain as any}
              interval={0}
              height={100}
              width={100}
              ticks={actualTicks}
              tick={props => <TiltedAxisTick {...props} screenWidth={width} />}
            />
            <YAxis
              type="number"
              domain={yAxisDomain as any}
              ticks={yAxisTicks}
              dataKey={obj => {
                if (obj.average) {
                  return obj.average;
                } else if (obj.median) {
                  return obj.median;
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
            <Legend
              wrapperStyle={{ paddingBottom: "26px", marginLeft: "26px" }}
              formatter={(value, _) => {
                return <span>{LABEL_COPY[value]}</span>;
              }}
            />
            <ReferenceLine
              x={DateTime.local().toMillis()}
              stroke="red"
              label={`今日 - ${DateTime.local().toFormat("LLL dd")}`}
            />
            <Line
              type="natural"
              dataKey="average"
              stroke="green"
              isAnimationActive={false}
            />
            <Line
              type="natural"
              dataKey="level"
              stroke="blue"
              isAnimationActive={false}
            />
            <Line
              type="natural"
              dataKey="median"
              stroke="orange"
              isAnimationActive={false}
            />
            <Line
              type="natural"
              dataKey="optimal"
              stroke="red"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
        {width > 1080 && (
          <Box
            style={{
              display: "flex",
              justifyContent: "center",
              paddingBottom: "12px"
            }}
          >
            <ToggleButtonGroup
              value={zoom}
              exclusive
              onChange={handleZoom}
              aria-label="graph zoom"
            >
              <ToggleButton value="small" aria-label="small-zoom">
                <ZoomInIcon />
              </ToggleButton>
              <ToggleButton value="large" aria-label="large-zoom">
                <ZoomOutIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}
      </div>
    </Paper>
  );
};
