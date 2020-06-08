import React, { useState } from "react";
import Container from "@material-ui/core/Container";
import useRequest from "../src/useAxios";

import { ApiKeyForm } from "../src/ApiKeyForm";
import { ProjectionsUI } from "../src/Projections";
import { WKDashAppBar } from "../src/AppBar";
import { SUBJECTS_URL } from "../src/constants";
import { Subject } from "../src/wanikaniTypes";
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

  const { data } = useRequest<Subject[]>({
    url: SUBJECTS_URL,
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  console.log(data);

  return (
    <>
      <WKDashAppBar />
      <Container>
        {!apiKey && <ApiKeyForm saveApiKey={saveApiKey} />}

        {apiKey && <ProjectionsUI apiKey={apiKey} />}
      </Container>
    </>
  );
}
