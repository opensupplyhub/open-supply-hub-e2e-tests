export const getFacilitiesDownloadsSchema = {
  type: "object",
  required: ["count", "next", "previous", "results"],
  properties: {
    count: { type: "integer" },
    next: { type: ["string", "null"], format: "uri" },
    previous: { type: ["string", "null"], format: "uri" },
    results: {
      type: "object",
      required: ["rows", "headers"],
      properties: {
        headers: {
          type: "array",
          items: { type: "string" }
        },
        rows: {
          type: "array",
          items: {
            type: "array",
            items: { type: ["string", "number", "boolean", "null"] }
          }
        }
      }
    }
  }
};
