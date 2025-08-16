import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Zod schema for SessionCandidate validation
export const SessionCandidateSchema = z.object({
  // Required fields
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  source_url: z.string().url("Invalid source URL"),
  city: z.string().min(1, "City is required").max(100, "City too long"),
  state: z.string().min(2, "State must be at least 2 characters").max(50, "State too long"),
  
  // Optional fields
  start_date: z.string().datetime().optional().nullable(),
  end_date: z.string().datetime().optional().nullable(),
  price_min: z.number().min(0, "Price cannot be negative").max(10000, "Price too high").optional().nullable(),
  price_max: z.number().min(0, "Price cannot be negative").max(10000, "Price too high").optional().nullable(),
  age_min: z.number().int().min(0, "Age cannot be negative").max(25, "Age too high").optional().nullable(),
  age_max: z.number().int().min(0, "Age cannot be negative").max(25, "Age too high").optional().nullable(),
  availability_hint: z.enum(["open", "full", "waitlist", "unknown"]).optional().nullable(),
  signup_url: z.string().url("Invalid signup URL").optional().nullable(),
  days_of_week: z.array(z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])).optional().nullable(),
  
  // Additional fields for context
  description: z.string().max(1000, "Description too long").optional().nullable(),
  capacity: z.number().int().min(1, "Capacity must be positive").max(1000, "Capacity too high").optional().nullable(),
  platform: z.string().max(50, "Platform name too long").optional().nullable(),
}).refine((data) => {
  // Cross-field validation: end_date should be after start_date
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["end_date"]
}).refine((data) => {
  // Cross-field validation: price_max should be >= price_min
  if (data.price_min !== null && data.price_max !== null) {
    return data.price_max >= data.price_min;
  }
  return true;
}, {
  message: "Max price must be greater than or equal to min price",
  path: ["price_max"]
}).refine((data) => {
  // Cross-field validation: age_max should be >= age_min
  if (data.age_min !== null && data.age_max !== null) {
    return data.age_max >= data.age_min;
  }
  return true;
}, {
  message: "Max age must be greater than or equal to min age",
  path: ["age_max"]
});

export type SessionCandidate = z.infer<typeof SessionCandidateSchema>;

// OpenAI function schema for structured extraction
export const OPENAI_FUNCTION_SCHEMA = {
  name: "extract_session_data",
  description: "Extract structured session/camp data from HTML content",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name or title of the session/camp/activity",
        minLength: 1,
        maxLength: 200
      },
      source_url: {
        type: "string",
        format: "uri",
        description: "URL where this session data was found"
      },
      city: {
        type: "string",
        description: "City where the session takes place",
        minLength: 1,
        maxLength: 100
      },
      state: {
        type: "string",
        description: "State where the session takes place (e.g., 'California', 'TX')",
        minLength: 2,
        maxLength: 50
      },
      start_date: {
        type: "string",
        format: "date-time",
        description: "ISO datetime when session starts (optional)"
      },
      end_date: {
        type: "string", 
        format: "date-time",
        description: "ISO datetime when session ends (optional)"
      },
      price_min: {
        type: "number",
        minimum: 0,
        maximum: 10000,
        description: "Minimum price in USD (optional)"
      },
      price_max: {
        type: "number",
        minimum: 0,
        maximum: 10000,
        description: "Maximum price in USD (optional)"
      },
      age_min: {
        type: "integer",
        minimum: 0,
        maximum: 25,
        description: "Minimum age requirement (optional)"
      },
      age_max: {
        type: "integer",
        minimum: 0,
        maximum: 25,
        description: "Maximum age requirement (optional)"
      },
      availability_hint: {
        type: "string",
        enum: ["open", "full", "waitlist", "unknown"],
        description: "Current availability status (optional)"
      },
      signup_url: {
        type: "string",
        format: "uri",
        description: "Direct URL for registration/signup (optional)"
      },
      days_of_week: {
        type: "array",
        items: {
          type: "string",
          enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        },
        description: "Days of week when session occurs (optional)"
      },
      description: {
        type: "string",
        maxLength: 1000,
        description: "Brief description of the session (optional)"
      },
      capacity: {
        type: "integer",
        minimum: 1,
        maximum: 1000,
        description: "Maximum number of participants (optional)"
      },
      platform: {
        type: "string",
        maxLength: 50,
        description: "Platform or provider name (optional)"
      }
    },
    required: ["name", "source_url", "city", "state"],
    additionalProperties: false
  }
};

// Confidence scoring components
export interface ConfidenceScore {
  model_score: number;      // 0-1: LLM confidence in extraction
  schema_valid: number;     // 0-1: Schema validation success
  rules_used: number;       // 0-1: How much fallback rules were used
  overall: number;          // 0-1: Combined confidence
}

export function calculateConfidence(
  modelConfidence: number,
  schemaValid: boolean,
  fallbackUsed: boolean,
  retryCount: number
): ConfidenceScore {
  const model_score = Math.max(0, modelConfidence - (retryCount * 0.2));
  const schema_valid = schemaValid ? 1.0 : 0.0;
  const rules_used = fallbackUsed ? 0.5 : 1.0; // Lower score if fallback was needed
  
  // Overall confidence is weighted average
  const overall = (model_score * 0.4) + (schema_valid * 0.4) + (rules_used * 0.2);
  
  return {
    model_score,
    schema_valid,
    rules_used,
    overall
  };
}