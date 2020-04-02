import React, { useState } from "react";
import Container from "@material-ui/core/Container";

import { ApiKeyForm } from "../src/ApiKeyForm";
import { ProjectionsUI } from "../src/Projections";

const API_KEY_LOCAL_STORAGE = "apiKey";

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
  };

  return (
    <Container>
      {`Your api key ${apiKey}`}
      {!apiKey && <ApiKeyForm saveApiKey={saveApiKey} />}

      {apiKey && <ProjectionsUI apiKey={apiKey} />}
    </Container>
  );
}
