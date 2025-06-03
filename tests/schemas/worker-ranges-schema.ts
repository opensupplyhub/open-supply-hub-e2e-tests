export const workersRanges = {
  type: "array",
  items: {
    type: "string",
    enum: [
      "Less than 1000",
      "1001-5000",
      "5001-10000",
      "More than 10000"
    ]
  },
  minItems: 4,
  maxItems: 4,
  uniqueItems: true
};
