import React, { useState } from "react";
import Container from "@material-ui/core/Container";

import { LevelUpChart } from "../src/LevelUpChart";
import { ApiKeyForm } from "../src/ApiKeyForm";

const API_KEY_LOCAL_STORAGE = "apiKey";

const isClientSide = () => typeof Storage !== "undefined";

export default function Index() {
  const savedApiKey =
    isClientSide() && localStorage.getItem(API_KEY_LOCAL_STORAGE);
  const [apiKey, setApiKey] = useState(savedApiKey || undefined);
  const saveApiKey = (apiKeyInput: string) => {
    console.log("setting api key");
    // validate apiKey
    console.log(apiKeyInput);
    setApiKey(apiKeyInput);
    isClientSide() &&
      typeof apiKeyInput === "string" &&
      localStorage.setItem(API_KEY_LOCAL_STORAGE, apiKeyInput);
    console.log("handling click");
  };

  return (
    <Container>
      {`Your api key ${apiKey}`}
      {!apiKey && <ApiKeyForm saveApiKey={saveApiKey} />}
      {apiKey && <LevelUpChart apiKey={apiKey} />}
    </Container>
  );
}
