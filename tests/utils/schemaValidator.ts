import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv, { mode: "full" });

export function validateSchema(schema: object, data: unknown) {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    throw new Error(`Schema validation failed:\n${JSON.stringify(validate.errors, null, 2)}`);
  }
}