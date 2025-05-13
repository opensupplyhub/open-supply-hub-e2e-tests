export const unauthorizedSchema = {
    type: "object",
    required: ["detail"],
    additionalProperties: false,
    properties: {
      detail: { type: "string" }
    }
  };