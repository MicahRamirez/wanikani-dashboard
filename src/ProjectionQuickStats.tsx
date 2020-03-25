import React from "react";
import Paper from "@material-ui/core/Paper";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import FastForwardIcon from "@material-ui/icons/FastForward";
import DirectionsWalkIcon from "@material-ui/icons/DirectionsWalk";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import QueryBuilderIcon from "@material-ui/icons/QueryBuilder";
import SentimentSatisfiedAltIcon from "@material-ui/icons/SentimentSatisfiedAlt";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemIcon from "@material-ui/core/ListItemIcon";

import { DateTime, Duration } from "luxon";

import { FAST_LEVELS } from "./constants";
import { ChartData, Projections } from "./levelUpProjectionUtils";

interface ProjectionQuickStats {
  currentLevel: number;
  chartData: ChartData[];
  projections: Projections;
  minimumTimeToLevelInSeconds: number;
}

const getQuickStatDates = (
  chartData: ChartData[],
  currentLevel: number,
  projections: Projections
) => {
  const latestObservedLevel =
    chartData.find(
      chartData =>
        chartData.level === currentLevel - 1 && chartData.type === "recorded"
    ) || chartData[0];
  const levelStartDate = DateTime.fromMillis(latestObservedLevel.time);
  const timeOnLevelDate = levelStartDate.diffNow(["days", "hours"], {});
  const medianDate = levelStartDate.plus({
    days: FAST_LEVELS[currentLevel]
      ? projections.median.days.accelerated
      : projections.median.days.normal
  });
  return {
    levelStartDate,
    timeOnLevelDate,
    medianDate
  };
};

export const ProjectionsQuickStats: React.FC<ProjectionQuickStats> = ({
  currentLevel,
  projections,
  chartData,
  minimumTimeToLevelInSeconds
}) => {
  const fastestLevelUpObject = DateTime.local()
    .plus({ seconds: minimumTimeToLevelInSeconds })
    .diffNow(["days", "hours", "minutes", "seconds"])
    .toObject();
  const quickStatDates = getQuickStatDates(
    chartData,
    currentLevel,
    projections
  );
  const medianProjectionDuration = Duration.fromObject({
    days: FAST_LEVELS[currentLevel]
      ? projections.median.days.accelerated
      : projections.median.days.normal
  });
  console.log(medianProjectionDuration);
  debugger;
  return (
    <Grid item xs={12}>
      <Typography variant="h4" component="h5">
        {`Quick stats`}
      </Typography>
      <Paper elevation={2}>
        <List dense>
          <ListItem>
            <ListItemIcon>
              <SentimentSatisfiedAltIcon />
            </ListItemIcon>
            <ListItemText primary={`Level ${currentLevel}`} />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <HourglassEmptyIcon />
            </ListItemIcon>
            <ListItemText
              primary={`Started this level on ${quickStatDates.levelStartDate.toFormat(
                "ff"
              )}`}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <FastForwardIcon />
            </ListItemIcon>
            <ListItemText
              primary={`Fastest level up in ${
                fastestLevelUpObject.days && fastestLevelUpObject.days >= 0
                  ? `${fastestLevelUpObject.days} days `
                  : ""
              }${
                fastestLevelUpObject.hours && fastestLevelUpObject.hours >= 0
                  ? `${fastestLevelUpObject.hours} hours`
                  : ""
              }
              ${
                fastestLevelUpObject.minutes &&
                fastestLevelUpObject.minutes >= 0
                  ? `${fastestLevelUpObject.minutes} minutes`
                  : ""
              }`}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <DirectionsWalkIcon />
            </ListItemIcon>
            <ListItemText
              primary={`Likely level up in ${Math.floor(
                medianProjectionDuration.days
              )} days${
                Number.isFinite(medianProjectionDuration.days)
                  ? ` and ${Math.floor(
                      (medianProjectionDuration.days %
                        Math.floor(medianProjectionDuration.days)) *
                        24
                    )} hours`
                  : ""
              } `}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <QueryBuilderIcon />
            </ListItemIcon>
            <ListItemText
              primary={`Time on this level ${Math.floor(
                Math.abs(quickStatDates.timeOnLevelDate.days)
              )} days${
                Math.abs(quickStatDates.timeOnLevelDate.hours) > 0
                  ? ` and ${Math.floor(
                      Math.abs(quickStatDates.timeOnLevelDate.hours)
                    )} hours`
                  : ""
              }`}
            />
          </ListItem>
        </List>
      </Paper>
    </Grid>
  );
};
