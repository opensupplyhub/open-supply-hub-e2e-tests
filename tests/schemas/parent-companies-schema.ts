export const parentCompanies = {
  type: "array",
  items: {
    type: "array",
    minItems: 2,
    maxItems: 2,
    items: [
      { anyOf: [{ type: "integer" }, { type: "string" }] },
      { type: "string" }
    ]
  }
};
