import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const HOME = process.env.HOME || process.env.USERPROFILE || "";
const DEFAULT_CONFIG_PATH = path.join(HOME, ".dockitrc.json");
export const PLACEHOLDER_BUCKET = "your-default-bucket";

export interface DockitConfig {
  defaultBucket?: string;
  region?: string;
  dryRunDefault?: boolean;
  enableNlpTagging?: boolean;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
}

export function loadConfig(configPath?: string): DockitConfig {
  const resolvedPath = configPath
    ? path.resolve(configPath)
    : DEFAULT_CONFIG_PATH;

  let fileConfig: DockitConfig = {};
  if (fs.existsSync(resolvedPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
    } catch (e) {
      console.warn(`⚠️ Failed to parse ${resolvedPath}`);
    }
  } else if (configPath) {
    console.warn(`⚠️ Config file not found: ${resolvedPath}`);
  }

  return {
    defaultBucket:
      process.env.S3_BUCKET ||
      fileConfig.defaultBucket ||
      PLACEHOLDER_BUCKET,
    region: process.env.AWS_REGION || fileConfig.region || "us-west-2",
    dryRunDefault: fileConfig.dryRunDefault ?? true,
    enableNlpTagging: fileConfig.enableNlpTagging ?? true,
    awsAccessKeyId:
      process.env.AWS_ACCESS_KEY_ID || fileConfig.awsAccessKeyId || "",
    awsSecretAccessKey:
      process.env.AWS_SECRET_ACCESS_KEY || fileConfig.awsSecretAccessKey || "",
  };
}

export function createConfigFile() {
  const defaultConfig: DockitConfig = {
    defaultBucket: PLACEHOLDER_BUCKET,
    region: "us-west-2",
    dryRunDefault: true,
    enableNlpTagging: true,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  };

  try {
    fs.writeFileSync(DEFAULT_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
    console.log(`Created default config file at ${DEFAULT_CONFIG_PATH}`);
  } catch (e) {
    console.error(`Failed to create config file: ${e}`);
  }
}
