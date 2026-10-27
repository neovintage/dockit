#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import input from "@inquirer/input";
import { parse, isValid, parseISO, format } from "date-fns";
import path from "path";
import os from "os";
import fs from "fs";
import { globby } from "globby";
import chalk from "chalk";
import type { DockitConfig } from "./config.js";
import { loadConfig, createConfigFile, PLACEHOLDER_BUCKET } from "./config.js";
import { autoTag } from "./tag-helper.js";
import { uploadWithProgress } from "./upload.js";
import { contentTypeFor, isSupportedFile } from "./content-type.js";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import type { AwsCredentialIdentity } from "@aws-sdk/types";

// Slugify helper
function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");
}

// Validation
function validateDate(input: string): true | string {
  const parsed = parse(input, "yyyy-MM-dd", new Date());
  return isValid(parsed) || "Invalid date format (YYYY-MM-DD)";
}

function createS3Client(config: DockitConfig): S3Client {
  // Without explicit keys, fall back to the default AWS credential chain
  // (~/.aws, SSO, instance roles) instead of passing empty strings.
  const credentials: AwsCredentialIdentity | undefined =
    config.awsAccessKeyId && config.awsSecretAccessKey
      ? {
          accessKeyId: config.awsAccessKeyId,
          secretAccessKey: config.awsSecretAccessKey,
        }
      : undefined;

  return new S3Client({ region: config.region, credentials });
}

function extractDateFromFilename(filename: string): string | null {
  const match = filename.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) return null;

  const date = parseISO(match[0]);
  return isValid(date) ? match[0] : null;
}

function expandHome(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

async function keyExists(
  s3: S3Client,
  bucket: string, key: string,
): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// Append -2, -3, ... until the key is unused in this run and in the bucket.
async function uniqueKey(
  s3: S3Client,
  bucket: string,
  key: string,
  used: Set<string>,
): Promise<string> {
  const ext = path.extname(key);
  const stem = key.slice(0, key.length - ext.length);
  let candidate = key;
  for (let n = 2; used.has(candidate) || (await keyExists(s3, bucket, candidate)); n++) {
    candidate = `${stem}-${n}${ext}`;
  }
  used.add(candidate);
  return candidate;
}

const uploadCommand = async (argv: any) => {
  const config = loadConfig(argv.config);
  const dryRun: boolean = argv.dryRun ?? config.dryRunDefault ?? true;
  const bucket = config.defaultBucket!;
  if (!dryRun && (!bucket || bucket === PLACEHOLDER_BUCKET)) {
    console.error(
      chalk.red(
        "❌ No bucket configured. Set S3_BUCKET or defaultBucket in your config (run `config`).",
      ),
    );
    process.exit(1);
  }
  if (argv.dryRun === undefined && dryRun) {
    console.log(
      chalk.yellow("Dry run (dryRunDefault is on). Pass --no-dry-run to upload.\n"),
    );
  }
  const s3 = createS3Client(config);

  try {
    const target =
      argv.path ??
      (await input({
        message: "Enter a folder, file paths or globs (e.g. scans/*.pdf):",
      }));

    // globby expands a bare directory to every file beneath it.
    const matches = await globby(expandHome(target));
    const filePaths = matches.filter(isSupportedFile);
    const skipped = matches.length - filePaths.length;
    if (skipped > 0) {
      console.log(chalk.gray(`Skipping ${skipped} unsupported file(s).`));
    }
    if (filePaths.length === 0) {
      console.log(chalk.yellow("No files matched."));
      return;
    }

    const usedKeys = new Set<string>();

    for (const filePath of filePaths) {
      const base = path.basename(filePath, path.extname(filePath));
      let detectedDate = extractDateFromFilename(base);
      let filename = base;
      if (!detectedDate) {
        console.log(chalk.red(`❌ No date detected in filename: ${base}`));
        detectedDate = await input({
          message: "Date received (YYYY-MM-DD):",
          default: format(fs.statSync(filePath).mtime, "yyyy-MM-dd"),
          validate: validateDate,
        });
      } else {
        filename = base.replace(detectedDate, "");
        console.log(
          chalk.green(`📅 Auto-detected date from filename: ${detectedDate}`),
        );
      }

      const suggested = autoTag(
        filename.replace(/\-/g, " "),
        config.enableNlpTagging,
      );
      let parsedDate = parseISO(detectedDate);

      const title = await input({
        message: "Short title:",
        default: slugify(suggested.join("-")),
      });

      let month = (parsedDate.getMonth() + 1).toString().padStart(2, "0");
      let year = parsedDate.getFullYear().toString().padStart(4, "0");

      const ext = path.extname(filePath).toLowerCase();
      const key = await uniqueKey(
        s3,
        bucket,
        `documents/${year}/${month}/${detectedDate}--${slugify(title)}${ext}`,
        usedKeys,
      );

      console.log(
        `📄 ${chalk.bold(filePath)} → s3://${chalk.cyan(bucket)}/${key}`,
      );

      if (!dryRun) {
        await uploadWithProgress(
          s3,
          bucket,
          key,
          filePath,
          contentTypeFor(filePath),
        );
        console.log(chalk.green("✓ Upload complete\n"));
      } else {
        console.log(chalk.gray("⚠️  Dry run — not uploaded\n"));
      }
    }
  } catch (error: any) {
    if (error?.name === "ExitPromptError") {
      console.log("\n👋 Operation cancelled by user");
      process.exit(0);
    }
    throw error;
  }
};

// Handle Ctrl+C
process.on("SIGINT", () => {
  console.log("\n👋 Operation cancelled by user");
  process.exit(0);
});

// CLI configuration
yargs(hideBin(process.argv))
  .command(
    "upload [path]",
    "Upload documents (PDF, images, zip) to S3. [path] may be a folder, file, or glob",
    (yargs) => {
      return yargs
        .positional("path", {
          type: "string",
          description: "Folder, file, or glob to upload (prompted if omitted)",
        })
        .option("dry-run", {
          alias: "d",
          type: "boolean",
          description:
            "Preview actions without uploading (default: dryRunDefault in config; use --no-dry-run to upload)",
        })
        .option("config", {
          alias: "c",
          type: "string",
          description: "Path to custom config file",
        });
    },
    uploadCommand,
  )
  .command(
    "config",
    "Create a new configuration file",
    (yargs) => {
      return yargs;
    },
    createConfigFile,
  )
  .demandCommand(1, "❌ Error: You must specify a command")
  .showHelpOnFail(false)
  .example("$0 upload", "Start the interactive document upload process")
  .example("$0 upload ~/scans", "Upload every supported file in a folder")
  .example(
    "$0 upload --dry-run",
    "Preview uploads without actually uploading files",
  )
  .help()
  .alias("help", "h")
  .version()
  .wrap(null)
  .fail((msg, err, yargs) => {
    if (err?.name !== "ExitPromptError") {
      console.error("❌ Error:", err);
      yargs.showHelp();
      process.exit(1);
    } else {
      console.log("\n👋 Operation cancelled by user");
    }
  })
  .parse();
