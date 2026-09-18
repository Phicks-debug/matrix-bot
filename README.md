# matrix-bot

Broods project for Georgi, an agent in a Twente University module group chat on
the UT Matrix server (`matrix.eemcs.utwente.nl`). People call it by writing
`@georgi-ai`.

Nothing runs locally. The server allows only Microsoft SSO and has no webhooks,
so an account has to long-poll `/sync`, and the cluster's `matrix-forwarder`
does that: it holds the device's end-to-end keys, decrypts what arrives, and
POSTs each message to this agent's webhook. Replies, typing and reactions go
back out through it.

```text
Synapse /sync ──> matrix-forwarder (beeblast k3s) ──> gateway ──> Georgi
                  holds the crypto store          <── POST /v1/send
```

This repo is only the agent: its persona (`broods/INSTRUCTION.md`), its model,
its sandbox and workspace, and the Matrix connection that names the room.

## Deploy

```sh
bun install
bunx broods diff       # what would change
bunx broods dev --once # sync this stage, pushing MATRIX_BOT_TOKEN with it
```

Not `broods deploy`: it ignores `BROODS_STAGE` and targets Production, and it
never pushes `env()` values, so the connection would arrive without its token.
`dev` syncs the stage this project actually uses and pushes the token with it.

Needs `broods` 0.38.0 or newer, the first release with
`defineMatrixConnection`. There is no dashboard UI for Matrix channels, so the
connection has to be declared here in code.

`.github/workflows/sync.yml` runs that same command on pushes to `main`, but it
is off until three repository secrets exist: `BROODS_API_KEY`,
`DEEPSEEK_API_KEY`, `MATRIX_BOT_TOKEN`. Without them the job prints a line and
skips. `.github/workflows/ci.yml` typechecks every push and scans the diff for
committed secrets.

`MATRIX_BOT_TOKEN` in `.env.local` is the access token for the Matrix device
the forwarder syncs as. `.env.local` is gitignored, and the config reads the
token through `env()`, so no token lands in code. The account and device IDs
are not written down here either; read them off the device's session list.

## The account is a person's, not a bot's

The forwarder filters nothing: every room the account is in is delivered and
stored as context, and only `allowedChannelIds` decides where Georgi replies.
Adding the account to a room therefore shares that room's messages with Broods.

Replies are sent from the account, so other members see its typing indicator,
and clients without per-message profiles show "Georgi: " as text. The device is
not cross-signed, so it shows as unverified to others.

## Rotating the device

There is no login tool here any more. Mint a device with any Matrix client,
signed in as the account, then put its access token in `.env.local` and
redeploy. Delete the old device in the client's session list, or its keys sit
on the account forever.

Rotate whenever a token has been anywhere it should not be: a shared file, a
paste, a screenshot. A Matrix access token does not expire on its own.
