# matrix-bot

Broods project for Georgi, an agent in a Twente University module group chat on
the UT Matrix server. People call it by writing `@georgi-ai`.

Nothing runs locally. The server allows only Microsoft SSO and has no webhooks,
so an account has to long-poll `/sync`. The cluster's `matrix-forwarder` does
that: it holds the device's end-to-end keys, decrypts what arrives, and POSTs
each message to this agent's webhook. Replies, typing and reactions go back out
through it.

```text
Synapse /sync ──> matrix-forwarder (beeblast k3s) ──> gateway ──> Georgi
                  holds the crypto store          <── POST /v1/send
```

This repo is only the agent: its persona (`broods/INSTRUCTION.md`), its model,
its sandbox and workspace, and the Matrix connection that names the room.

## Setup

```sh
cp .env.example .env.local   # fill in the three keys
bun install
bunx broods diff             # what would change
bunx broods dev --once       # sync this stage, pushing MATRIX_BOT_TOKEN with it
```

Not `broods deploy`: it ignores `BROODS_STAGE` and targets Production, and it
never pushes `env()` values, so the connection would arrive without its token.

Needs `broods` 0.38.0 or newer, the first release with
`defineMatrixConnection`. Matrix channels have no dashboard UI, so the
connection is declared in code.

## CI

`ci.yml` typechecks and scans history for committed secrets. `sync.yml` runs
`broods dev --once` on pushes to `main`, and skips until `BROODS_API_KEY`,
`DEEPSEEK_API_KEY` and `MATRIX_BOT_TOKEN` exist as repository secrets.

## The account is a person's, not a bot's

The forwarder filters nothing. It POSTs every room the account is in to this
agent's webhook, so every room's messages reach Broods core. Core is what
filters, and it filters on arrival: a room outside `allowedChannelIds` is
dropped and nothing from it is stored. In the allowed room the opposite holds.
Every message is kept as context, and a `@georgi-ai` mention is what starts a
run.

So the allow list decides what Broods keeps, not what it receives. Adding the
account to a room sends that room's messages to Broods whether or not Georgi
ever answers there.

Replies are sent from the account, so other members see its typing indicator,
and clients without per-message profiles show "Georgi: " as text. The device is
not cross-signed, so it shows as unverified to others.

## Rotating the device

Mint a device with any Matrix client signed in as the account, put its access
token in `.env.local`, and redeploy. Delete the old device in the client's
session list, or its keys sit on the account forever.

Rotate whenever a token has been somewhere it should not be: a shared file, a
paste, a screenshot. A Matrix access token does not expire on its own.
