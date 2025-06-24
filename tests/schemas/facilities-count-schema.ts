export const facilitiesCount = {
  type: "object",
  properties: {
    count: {
      type: "integer",
      minimum: 0,
    },
  },
  required: ["count"],
  additionalProperties: false,
};
