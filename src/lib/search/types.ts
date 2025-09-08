export type RawResult = {
  title: string;
  url: string;
  snippet?: string;
  startDate?: string;
  endDate?: string;
  price?: string;
  venueName?: string;
  city?: string;
  state?: string;
  provider?: string; // "sawyer" | "mindbody" | "amilia" | "skiclub" | "generic"
};