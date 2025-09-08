export interface RawResult {
  title: string;
  snippet?: string;
  city?: string;
  state?: string;
  url: string;
  confidence?: number;
  [key: string]: any;
}