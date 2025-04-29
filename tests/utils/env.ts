import { config } from "dotenv";

export async function setup() {
  config();

  if (!process.env.BASE_URL) {
    throw new Error("BASE_URL is not defined");
  }

  if (!process.env.USER_EMAIL) {
    throw new Error("USER_EMAIL is not defined");
  }

  if (!process.env.USER_PASSWORD) {
    throw new Error("USER_PASSWORD is not defined");
  }

  if (!process.env.AUTH_TOKEN) {
    throw new Error("AUTH_TOKEN is not defined");
  }
}
