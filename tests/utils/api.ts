import { APIRequestContext, APIResponse } from "@playwright/test";

export interface Options {
  authenticate: boolean;
  params?:
    | { [key: string]: string | number | boolean }
    | URLSearchParams
    | string;
}

export async function get(
  request: APIRequestContext,
  url: string,
  options: Options
): Promise<APIResponse> {
  const { BASE_URL, AUTH_TOKEN } = process.env;

  return request.get(`${BASE_URL}${url}`, {
    headers: {
      Authorization: options.authenticate ? `Token ${AUTH_TOKEN}` : "",
    },
    params: options.params,
  });
}
