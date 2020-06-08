import React, { useState } from "react";
import { AxiosResponse } from "axios";
import useRequest from "../src/useAxios";
import { DateTime } from "luxon";

import { ApiKeyForm } from "../src/ApiKeyForm";
import { WKDashAppBar } from "../src/AppBar";
import { SUBJECTS_URL } from "../src/constants";
import { Subject } from "../src/wanikaniTypes";
const API_KEY_LOCAL_STORAGE = "apiKey";

const isClientSide = () => typeof Storage !== "undefined";

interface Page {
  per_page: number;
  next_url: string | null;
  previous_url: string | null;
}

interface WanikaniCollection<T> {
  data: T[];
  object: string;
  url: string;
  pages: Page;
  total_count: number;
  data_updated_at: string;
}

export default function BookClub() {
  const savedApiKey =
    isClientSide() && localStorage.getItem(API_KEY_LOCAL_STORAGE);
  const [apiKey, setApiKey] = useState(savedApiKey || undefined);
  const [subjectUrl, setSubjectUrl] = useState(SUBJECTS_URL);
  const [lastModified, setLastModified] = useState<string>();
  const [subjectData, setSubjectData] = useState<Subject[]>([]);
  const saveApiKey = (apiKeyInput: string) => {
    // validate apiKey
    setApiKey(apiKeyInput);
    isClientSide() &&
      typeof apiKeyInput === "string" &&
      localStorage.setItem(API_KEY_LOCAL_STORAGE, apiKeyInput);
  };

  const onSuccess = ({ data }: AxiosResponse<WanikaniCollection<Subject>>) => {
    console.log("api request success");
    if (data.pages.next_url) {
      setSubjectData([...subjectData, ...data.data]);
      setSubjectUrl(data.pages.next_url);
    } else {
      setLastModified(DateTime.utc().toHTTP());
    }
  };

  const { data } = useRequest<WanikaniCollection<Subject>>(
    {
      url: subjectUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "If-Modified-Since": lastModified,
      },
    },
    { onSuccess }
  );
  console.log(data);
  // this works pretty well, let's explore a proper dexiedb attempt with a more fleshed
  // out storage interface.
  return (
    <>
      <WKDashAppBar />
      {!apiKey && <ApiKeyForm saveApiKey={saveApiKey} />}
      {subjectData && <ul></ul>}
    </>
  );
}
