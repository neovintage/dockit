import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const HOME = process.env.HOME || process.env.USERPROFILE || "";
const CONFIG_PATH = path.join(HOME, ".dockitrc.json");

export interface DockitConfig {
  defaultBucket?: string;
  region?: string;
  dryRunDefault?: boolean;
  enableNlpTagging?: boolean;
}

let cachedConfig: DockitConfig | null = null;

export function loadConfig(): DockitConfig {
  if (cachedConfig) return cachedConfig;

  let fileConfig: DockitConfig = {};
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    } catch (e) {
      console.warn("⚠️ Failed to parse ~/.dockitrc.json");
    }
  }

  cachedConfig = {
    defaultBucket:
      process.env.S3_BUCKET ||
      fileConfig.defaultBucket ||
      "your-default-bucket",
    region: process.env.AWS_REGION || fileConfig.region || "us-west-2",
    dryRunDefault: fileConfig.dryRunDefault ?? true,
    enableNlpTagging: fileConfig.enableNlpTagging ?? false,
  };

  return cachedConfig;
}
