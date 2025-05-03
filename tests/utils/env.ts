import { config } from "dotenv";

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
