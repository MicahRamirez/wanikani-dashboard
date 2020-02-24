import axios, { AxiosResponse } from "axios";
import qs from "qs";

interface WanikaniNextPageUrl {
  page_after_id: string;
}
const isWanikaniPageUrl = (
  parsedQueryString: any
): parsedQueryString is WanikaniNextPageUrl => {
  return (
    typeof parsedQueryString === "object" &&
    typeof parsedQueryString.page_after_id === "string"
  );
};

const wanikaniApi = axios.create({
  baseURL: "https://api.wanikani.com/v2",
  timeout: 3000
});

export interface WanikaniApiResponse<T> {
  object: string; // denotes data type
  url: string; // denotes api call
  pages?: {
    per_page: number; // number of entries per page
    next_url: string | null; // ref to next page if it exists
    previous_url: string | null; // ref to prev page if it exists
  };
  total_count?: number;
  data_updated_at: string; // 2020-01-20T11:07:04.987403Z
  data: T[];
}

// https://docs.api.wanikani.com/20170710/#review-statistics
export interface ReviewStatistic {
  created_at: string;
  subject_id: number;
  subject_type: "radical" | "kanji" | "vocabulary";
  meaning_correct: number;
  meaning_incorrect: number;
  meaning_max_streak: number;
  meaning_current_streak: number;
  reading_correct: number;
  reading_incorrect: number;
  reading_max_streak: number;
  reading_current_streak: number;
  percentage_correct: number;
  hidden: boolean;
}

export const getAllReviewStatistics = async (apiKey: string) => {
  let response:
    | AxiosResponse<WanikaniApiResponse<WanikaniApiResponse<ReviewStatistic>>>
    | undefined;
  try {
    response = await wanikaniApi.get<
      WanikaniApiResponse<WanikaniApiResponse<ReviewStatistic>>
    >("/review_statistics", {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    console.log("Successfully fetched first set of review statistics");
  } catch (error) {
    console.error(error);
    response = undefined;
  }
  if (!response) {
    console.log("there was no response");
    return [];
  }
  const listOfData = [response.data.data];
  if (!response.data.pages) {
    // no pages so we are done
    return listOfData;
  }
  let nextUrl = response.data.pages.next_url;
  try {
    while (nextUrl !== null) {
      const queryStringParms = qs.parse(
        nextUrl.slice(nextUrl.lastIndexOf("?") + 1)
      );
      if (!isWanikaniPageUrl(queryStringParms)) {
        return;
      }
      const pageAfterid = queryStringParms.page_after_id;
      response = await wanikaniApi.get<
        WanikaniApiResponse<WanikaniApiResponse<ReviewStatistic>>
      >(`/review_statistics?page_after_id=${pageAfterid}`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      listOfData.push(response.data.data);
      nextUrl = response.data.pages ? response.data.pages.next_url : null;
    }
  } catch (error) {
    console.error("something broke", error);
  }
  console.log(listOfData);
  return listOfData;
};

// get level progressions
// from that determine highest level

// https://docs.api.wanikani.com/20170710/?shell#get-all-subjects
// get all [radicals, kanji] from the highest level
// determine fastest possible level up path
