export const facilityProcessingTypes = {
  type: "array",
  items: {
    type: "object",
    required: ["facilityType", "processingTypes"],
    properties: {
      facilityType: { type: "string" },
      processingTypes: {
        type: "array",
        items: { type: "string" },
      },
    },
    additionalProperties: false,
  },
};
