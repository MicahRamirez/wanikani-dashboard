import React from "react";
import Container from "@material-ui/core/Container";

import { ProjectionsUI } from "../src/Projections";
import { WKDashAppBar } from "../src/AppBar";

const isClientSide = () => typeof Storage !== "undefined";
const API_KEY_LOCAL_STORAGE = "apiKey";

export default function Projections() {
  const savedApiKey =
    isClientSide() && localStorage.getItem(API_KEY_LOCAL_STORAGE);
  return (
    <>
      <WKDashAppBar />
      <Container>
        {savedApiKey && <ProjectionsUI apiKey={savedApiKey} />}
      </Container>
    </>
  );
}
