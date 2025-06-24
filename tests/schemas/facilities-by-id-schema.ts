export const facilitiesById = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["id", "type", "geometry", "properties"],
  properties: {
    id: { type: "string" },
    type: { type: "string", enum: ["Feature"] },
    geometry: {
      type: "object",
      required: ["type", "coordinates"],
      properties: {
        type: { type: "string", enum: ["Point"] },
        coordinates: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          items: { type: "number" },
        },
      },
    },
    properties: {
      type: "object",
      additionalProperties: true,
      required: [
        "name",
        "address",
        "country_code",
        "country_name",
        "os_id",
        "other_names",
        "other_addresses",
        "contributors",
      ],
      properties: {
        name: { type: "string" },
        address: { type: "string" },
        country_code: { type: "string" },
        country_name: { type: "string" },
        os_id: { type: "string" },
        country_code_alpha3: { type: "string" },
        location_type: { type: "string" },
        other_names: {
          type: "array",
          items: { type: "string" },
        },
        other_addresses: {
          type: "array",
          items: { type: "string" },
        },
        contributors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "integer" },
              name: { type: "string" },
              is_verified: { type: "boolean" },
              contributor_name: { type: "string" },
              list_name: { type: ["string", "null"] },
            },
            required: ["name"],
            additionalProperties: false,
          },
        },
      },
    },
  },
};
