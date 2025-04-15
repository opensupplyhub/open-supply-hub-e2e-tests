import { config } from "dotenv";

export async function setup() {
  config();

  if (!process.env.BASE_URL) {
    throw new Error("BASE_URL is not defined");
  }
}
