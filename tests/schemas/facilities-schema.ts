export const facilitiesSchema = {
  type: "object",
  required: ["type", "count", "features"],
  properties: {
    type: { type: "string", const: "FeatureCollection" },
    count: { type: "integer" },
    next: { type: ["string", "null"], format: "uri" },
    previous: { type: ["string", "null"], format: "uri" },
    features: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "type", "geometry", "properties"],
        properties: {
          id: { type: "string" },
          type: { type: "string", const: "Feature" },
          geometry: {
            type: "object",
            required: ["type", "coordinates"],
            properties: {
              type: { type: "string", const: "Point" },
              coordinates: {
                type: "array",
                items: { type: "number" },
                minItems: 2,
                maxItems: 2,
              },
            },
          },
          properties: {
            type: "object",
            required: [
              "name",
              "address",
              "country_code",
              "os_id",
              "country_name",
              "has_approved_claim",
              "is_closed",
            ],
            properties: {
              name: { type: "string" },
              address: { type: "string" },
              country_code: { type: "string" },
              os_id: { type: "string" },
              country_name: { type: "string" },
              has_approved_claim: { type: "boolean" },
              is_closed: { type: ["boolean", "null"] },
            },
          },
        },
      },
    },
    extent: {
      type: "array",
      items: { type: "number" },
      minItems: 4,
      maxItems: 4,
    },
  },
};

export const facilitiesSchemaDetailsTrue = {
  type: "object",
  required: ["type", "count", "features"],
  properties: {
    type: {
      type: "string",
      const: "FeatureCollection",
    },
    count: {
      type: "integer",
    },
    next: {
      type: ["string", "null"],
      format: "uri",
    },
    previous: {
      type: ["string", "null"],
      format: "uri",
    },
    features: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "type", "geometry", "properties"],
        properties: {
          id: { type: "string" },
          type: { type: "string", const: "Feature" },
          geometry: {
            type: "object",
            required: ["type", "coordinates"],
            properties: {
              type: { type: "string", const: "Point" },
              coordinates: {
                type: "array",
                items: { type: "number" },
                minItems: 2,
                maxItems: 2,
              },
            },
          },
          properties: {
            type: "object",
            required: [
              "name",
              "address",
              "country_code",
              "os_id",
              "country_name",
              "has_approved_claim",
              "is_closed",
            ],
            properties: {
              name: { type: "string" },
              address: { type: "string" },
              country_code: { type: "string" },
              os_id: { type: "string" },
              country_name: { type: "string" },
              has_approved_claim: { type: "boolean" },
              is_closed: { type: ["boolean", "null"] },
            },
          },
        },
      },
    },
    extent: {
      type: "array",
      items: { type: "number" },
      minItems: 4,
      maxItems: 4,
    },
  },
};
