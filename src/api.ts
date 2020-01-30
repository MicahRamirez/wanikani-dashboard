import axios, { AxiosResponse } from "axios";

const wanikaniApi = axios.create({
  baseURL: "https://api.wanikani.com/v2",
  timeout: 1000
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

const getAllReviewStatistics = async (apiKey: string) => {
  const reviewStatistics = {};
  let response: AxiosResponse<WanikaniApiResponse<
    WanikaniApiResponse<ReviewStatistic>
  >>;
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
    return {};
  }
  const wkApiResponse = response.data;
  // reviewStatistics.collectionUpdatedAt = response.
  // getAllReviewStatisticsHelper()
};

// const getAllReviewStatisticsHelper = (pageUrl: string) => {};
