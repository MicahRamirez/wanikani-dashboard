import React, { useState, useEffect } from "react";
import Container from "@material-ui/core/Container";
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
    <Container>
      {`Your api key ${apiKey}`}
      {!apiKey && <ApiKeyForm saveApiKey={saveApiKey} />}
      {apiKey && <LevelUpChart apiKey={apiKey} />}
    </Container>
  );
}
