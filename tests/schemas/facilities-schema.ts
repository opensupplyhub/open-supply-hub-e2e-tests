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

const facilityContributorItem = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    id: { type: "integer" },
    name: { type: "string" },
    is_verified: { type: "boolean" },
    contributor_name: { type: "string" },
    list_name: { type: ["string", "null"] },
    contributor_type: { type: "string" },
    last_contributed_at: { type: ["string", "null"], format: "date-time" },
    list_uploaded_at: { type: ["string", "null"], format: "date-time" },
    count: { type: "integer" },
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
              "contributors",
              "contributor_fields",
              "extended_fields",
              "sector",
            ],
            properties: {
              name: { type: "string" },
              address: { type: "string" },
              country_code: { type: "string" },
              os_id: { type: "string" },
              country_name: { type: "string" },
              has_approved_claim: { type: "boolean" },
              is_closed: { type: ["boolean", "null"] },
              contributors: {
                type: "array",
                items: facilityContributorItem,
              },
              contributor_fields: {
                type: "array",
              },
              extended_fields: {
                type: "object",
                additionalProperties: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["value", "field_name"],
                    properties: {
                      value: {},
                      field_name: { type: "string" },
                      contributor_id: { type: ["integer", "null"] },
                      contributor_name: { type: ["string", "null"] },
                      updated_at: { type: "string", format: "date-time" },
                      is_from_created_from: { type: "boolean" },
                    },
                    additionalProperties: true,
                  },
                },
              },
              sector: {
                type: "array",
                items: {
                  type: "object",
                  required: ["values"],
                  properties: {
                    updated_at: { type: "string", format: "date-time" },
                    contributor_id: { type: ["integer", "null"] },
                    contributor_name: { type: ["string", "null"] },
                    values: {
                      type: "array",
                      items: { type: "string" },
                    },
                    is_from_claim: { type: "boolean" },
                  },
                  additionalProperties: true,
                },
              },
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
