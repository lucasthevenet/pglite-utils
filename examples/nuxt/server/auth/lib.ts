import { Auth, type AuthConfig, setEnvDefaults, createActionURL } from "@auth/core";
import type { Session } from "@auth/core/types";
import type { H3Event } from "h3";
import { toWebRequest } from "h3";

export type GetSessionResult = Promise<Session | null>;

export async function getSession(
  event: H3Event,
  config: Omit<AuthConfig, "raw">,
): GetSessionResult {
  setEnvDefaults(process.env, config);
  const req = toWebRequest(event);
  const url = createActionURL(
    "session",
    req.headers.get("x-forwarded-proto") ?? "http",
    req.headers,
    process.env,
    config.basePath,
  );
  const response = await Auth(
    new Request(url, { headers: { cookie: req.headers.get("cookie") ?? "" } }),
    config,
  );

  const { status = 200 } = response;

  const data = await response.json();

  if (!data || !Object.keys(data).length) return null;
  if (status === 200) return data;
  throw new Error(data.message);
}
