export type SessionItem = {
  id: string;
  start: string;
  end: string | null;
  availability: number | null;
  availability_status?: string;
  price_min: number | null;
  platform: string | null;
  registration_open_at?: string | null;
};

export type ActivityResult = {
  activity_id: string;
  name: string;
  city: string | null;
  state: string | null;
  sessions: SessionItem[];
  score: number;
};