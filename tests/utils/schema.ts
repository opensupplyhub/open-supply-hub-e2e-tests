import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv, { mode: "full" });

export function validate(schema: object, data: unknown) {
  const validator = ajv.compile(schema);
  const isValid = validator(data);

  if (!isValid) {
    throw new Error(
      `Schema validation failed:\n${JSON.stringify(validator.errors, null, 2)}`
    );
  }
}
