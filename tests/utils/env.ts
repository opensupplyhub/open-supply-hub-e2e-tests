import { config } from "dotenv";
import type { TestType } from "@playwright/test";

const requiredVars = [
  "BASE_URL",
  "USER_EMAIL",
  "USER_PASSWORD",
  "AUTH_TOKEN",
  "USER_ADMIN_EMAIL",
  "USER_ADMIN_PASSWORD",
  "USER_API_EMAIL",
  "USER_API_PASSWORD",
];

export async function setup() {
  config();

  requiredVars.forEach((name) => {
    if (!process.env[name]) {
      throw new Error(`'${name}' env variable is not defined`);
    }
  });
}

/** Mutating Data Moderator flows are only safe on test / preprod. */
export function isMutatingEnvironmentAllowed(): boolean {
  const env = (process.env.ENVIRONMENT || "").toLowerCase();
  const base = (process.env.BASE_URL || "").toLowerCase();
  return (
    env === "test" ||
    env === "preprod" ||
    base.includes("test.os-hub.net") ||
    base.includes("preprod.os-hub.net")
  );
}

export function skipIfMutatingNotAllowed(
  test: Pick<TestType<unknown, unknown>, "skip">,
) {
  test.skip(
    !isMutatingEnvironmentAllowed(),
    "Mutating tests only run on test/preprod environments",
  );
}
