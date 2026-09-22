// Mints a Matrix access token for the forwarder to sync as.
//
// The UT server offers only SSO and `m.login.token`, so there is no password to
// script. This opens the SSO redirect, catches the login token the browser is
// sent back with, and trades it for an access token on a device of its own.
// Element's token is not a substitute: two processes sharing one device id also
// share its one-time keys, and whichever claims a key first leaves the other
// unable to decrypt.

const API_URL = "https://matrix.eemcs.utwente.nl";
const DEVICE_NAME = "broods-matrix-forwarder";
const ENV_FILE = new URL("../.env.local", import.meta.url).pathname;
const IDENTITY_PROVIDER = "oidc-microsoft";
const PORT = 8787;
const REDIRECT_URL = `http://localhost:${PORT}/`;

interface LoginResponse {
  access_token: string;
  device_id: string;
  user_id: string;
}

const loginToken = await awaitLoginToken();
const session = await exchange(loginToken);
await writeToken(session.access_token);

console.log(`Logged in as ${session.user_id} on device ${session.device_id}.`);
console.log(`Wrote MATRIX_BOT_TOKEN to ${ENV_FILE}.`);
console.log("Next: bunx broods dev --once");
console.log(
  "Do not sign this device out in a Matrix client, it is the forwarder's.",
);

/** Serves the SSO redirect target until the browser comes back with a token. */
async function awaitLoginToken(): Promise<string> {
  const { promise, resolve } = Promise.withResolvers<string>();
  const server = Bun.serve({
    fetch: (request: Request): Response => {
      const token = new URL(request.url).searchParams.get("loginToken");
      if (!token) {
        return new Response("Waiting for a login token.", { status: 400 });
      }
      resolve(token);

      return new Response("Signed in. Close this tab.", { status: 200 });
    },
    port: PORT,
  });

  const ssoUrl =
    `${API_URL}/_matrix/client/v3/login/sso/redirect/${IDENTITY_PROVIDER}` +
    `?redirectUrl=${encodeURIComponent(REDIRECT_URL)}`;
  console.log("Open this and sign in with the UT account:\n");
  console.log(ssoUrl, "\n");

  const token = await promise;
  await server.stop();

  return token;
}

async function exchange(loginToken: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/_matrix/client/v3/login`, {
    body: JSON.stringify({
      initial_device_display_name: DEVICE_NAME,
      token: loginToken,
      type: "m.login.token",
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Login failed (${response.status}): ${await response.text()}`);
  }

  return (await response.json()) as LoginResponse;
}

/** Replaces the MATRIX_BOT_TOKEN line and leaves every other key alone. */
async function writeToken(accessToken: string): Promise<void> {
  const file = Bun.file(ENV_FILE);
  const current = (await file.exists()) ? await file.text() : "";
  const line = `MATRIX_BOT_TOKEN="${accessToken}"`;
  const pattern = /^MATRIX_BOT_TOKEN=.*$/m;
  const next = pattern.test(current)
    ? current.replace(pattern, line)
    : `${current.trimEnd()}\n${line}\n`;

  await Bun.write(ENV_FILE, next);
}
