import React, { useState, useEffect } from "react";
import Container from "@material-ui/core/Container";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import Link from "../src/Link";
import { DateTime } from "luxon";

import { getAllReviewStatistics } from "../src/api";
import { LevelUpChart } from "../src/LevelUpChart";
import { ApiKeyForm } from "../src/ApiKeyForm";

const API_KEY_LOCAL_STORAGE = "apiKey";
const WK_REVIEW_STATISTICS = "wkReviewStatistics";
// const WK_LEVEL_PROGRESSIONS = "wkLevelProgressions";
const DATA_LAST_UPDATED_TIMESTAMP_LOCAL_STORAGE = "wanikaniLastUpdated";

const isClientSide = () => typeof Storage !== "undefined";

export default function Index() {
  const savedApiKey =
    isClientSide() && localStorage.getItem(API_KEY_LOCAL_STORAGE);
  const [apiKey, setApiKey] = useState(savedApiKey || undefined);
  const saveApiKey = (apiKeyInput: string) => {
    // validate apiKey
    setApiKey(apiKeyInput);
    isClientSide() &&
      typeof apiKeyInput === "string" &&
      localStorage.setItem(API_KEY_LOCAL_STORAGE, apiKeyInput);
    console.log("handling click");
  };

  useEffect(() => {
    const hasLocalData =
      isClientSide() && localStorage.getItem(WK_REVIEW_STATISTICS) !== null;
    if (apiKey !== undefined) {
      !hasLocalData &&
        getAllReviewStatistics(apiKey).then(data => {
          if (data && data.length > 0) {
            isClientSide() &&
              localStorage.setItem(WK_REVIEW_STATISTICS, JSON.stringify(data));
            isClientSide() &&
              localStorage.setItem(
                DATA_LAST_UPDATED_TIMESTAMP_LOCAL_STORAGE,
                DateTime.utc().toString()
              );
          }
        });
    }
  }, [apiKey]);
  return (
    <Container maxWidth="sm">
      {`Your api key ${apiKey}`}
      <Box my={4}>
        {!apiKey && <ApiKeyForm saveApiKey={saveApiKey} />}
        {apiKey && <LevelUpChart apiKey={apiKey} />}
        <Typography variant="h4" component="h1" gutterBottom>
          Next.js with TypeScript example
        </Typography>
        <Link href="/about" color="secondary">
          Go to the about page
        </Link>
      </Box>
    </Container>
  );
}
