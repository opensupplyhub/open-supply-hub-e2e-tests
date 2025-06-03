export const moderationEventsMerge = {
  type: "array",
  items: {
    type: "object",
    required: ["current_id", "original_id", "created_at", "merge_date"],
    properties: {
      current_id: { type: "string" },
      original_id: { type: "string" },
      created_at: { type: "string", format: "date-time" },
      merge_date: { type: "string", format: "date-time" }
    },
    additionalProperties: false
  }
};