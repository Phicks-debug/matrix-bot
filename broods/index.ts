import { readFileSync } from "node:fs";
import {
  defineAgent,
  defineMatrixConnection,
  defineSandbox,
  defineWorkspace,
  env,
} from "broods";

// A Lambda sandbox: a fresh, ephemeral bash environment created per run.
export const lambdaSandbox = defineSandbox({
  name: "lambda-sandbox",
  provider: "lambda",
  network: { mode: "allow-all" },
  permissionMode: "bypass",
  persistent: true,
  timeout: 60,
});

// Persistent files for the group: notes, decisions, drafts. Survives between runs,
// unlike the sandbox itself.
export const projectWorkspace = defineWorkspace({
  name: "project-workspace",
  storage: { provider: "s3" },
});

// The account's own device syncs through the cluster's matrix-forwarder, which
// holds its end-to-end keys. Only the rooms named here get replies; everything
// else the account sees is still delivered and stored as context.
export const matrixConnection = defineMatrixConnection({
  allowedChannelIds: ["!fktYwd1H6wSGv6vvEROdhvDHay2MZOuwWPY5wVjpAmU"],
  apiUrl: "https://matrix.eemcs.utwente.nl",
  botName: "Georgi",
  botToken: env("MATRIX_BOT_TOKEN"),
  mentionText: "@georgi-ai",
});

export const myAgent = defineAgent({
  name: "my-agent",
  provider: {
    deepseek: { apiKey: env("DEEPSEEK_API_KEY") },
  },
  model: {
    provider: "deepseek",
    modelId: "deepseek-flash",
    providerOptions: {
      deepseek: { reasoningEffort: "max", thinking: { type: "enabled" } },
    },
  },
  agent: {
    system: readFileSync(`${import.meta.dirname}/INSTRUCTION.md`, "utf8").trim(),
  },
  connections: [matrixConnection],
  sandboxes: [lambdaSandbox],
  workspaces: [projectWorkspace],
  publicAccess: true,
});
