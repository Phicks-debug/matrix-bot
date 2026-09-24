import { readFileSync } from "node:fs";
import {
  defineAgent,
  defineMatrixConnection,
  defineSandbox,
  defineWorkspace,
  env,
} from "broods";

export const lambdaSandbox = defineSandbox({
  name: "lambda-sandbox",
  provider: "lambda",
  network: { mode: "allow-all" },
  permissionMode: "bypass",
  persistent: true,
  timeout: 60,
});

export const projectWorkspace = defineWorkspace({
  name: "project-workspace",
  storage: { provider: "s3" },
});

export const matrixConnection = defineMatrixConnection({
  allowedChannelIds: ["!fktYwd1H6wSGv6vvEROdhvDHay2MZOuwWPY5wVjpAmU"],
  apiUrl: "https://matrix.eemcs.utwente.nl",
  botName: "Georgi",
  botToken: env("MATRIX_BOT_TOKEN"),
  mentionText: "@georgi-ai",
});

export const georgiAgent = defineAgent({
  name: "georgi-agent",
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
    maxTurn: -1,
  },
  connections: [matrixConnection],
  sandboxes: [lambdaSandbox],
  workspaces: [projectWorkspace],
  publicAccess: true,
});
