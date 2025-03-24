#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import input from "@inquirer/input";
import confirm from "@inquirer/confirm";
import { parse, isValid, parseISO } from "date-fns";
import path from "path";
import fs from "fs";
import { globby } from "globby";
import chalk from "chalk";
import { loadConfig, createConfigFile } from "./config.js";
import { autoTag } from "./tag-helper.js";
import { uploadWithProgress } from "./upload.js";
import { S3Client } from "@aws-sdk/client-s3";

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

const config = loadConfig();
const s3 = new S3Client({ region: config.region });

function extractDateFromFilename(filename: string): string | null {
  const match = filename.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) return null;

  const date = parseISO(match[0]);
  return isValid(date) ? match[0] : null;
}

const uploadCommand = async (argv: any) => {
  try {
    const config = loadConfig();
    const s3 = new S3Client({ region: config.region });

    const globInput = await input({
      message: "Enter file paths or globs (e.g. scans/*.pdf):",
    });

    const filePaths = await globby(globInput);
    if (filePaths.length === 0) {
      console.log(chalk.yellow("No files matched."));
      return;
    }

    for (const filePath of filePaths) {
      const base = path.basename(filePath, path.extname(filePath));
      let detectedDate = extractDateFromFilename(base);
      let filename = base;
      if (!detectedDate) {
        console.log(chalk.red(`❌ No date detected in filename: ${base}`));
        detectedDate = await input({
          message: "Date received (YYYY-MM-DD):",
          validate: validateDate,
        });
      } else {
        filename = base.replace(detectedDate, "");
        console.log(
          chalk.green(`📅 Auto-detected date from filename: ${detectedDate}`),
        );
      }

      const suggested = autoTag(filename.replace(/\-/g, " "), true); // config.enableNlpTagging);
      let parsedDate = parseISO(detectedDate);

      const title = await input({
        message: "Short title:",
        default: slugify(suggested.join("-")),
      });

      let month = (parsedDate.getMonth() + 1).toString().padStart(2, "0");
      let year = parsedDate.getFullYear().toString().padStart(4, "0");

      const key = `documents/${year}/${month}/${detectedDate}--${slugify(title)}.pdf`;

      console.log(
        `📄 ${chalk.bold(filePath)} → s3://${chalk.cyan(config.defaultBucket)}/${key}`,
      );

      if (!argv.dryRun) {
        await uploadWithProgress(s3, config.defaultBucket!, key, filePath);
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
    "upload",
    "Upload documents to S3",
    (yargs) => {
      return yargs
        .option("dry-run", {
          alias: "d",
          type: "boolean",
          description: "Preview actions without uploading files",
          default: false,
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
  .demandCommand(1, "You must specify a command")
  .example("$0 upload", "Start the interactive document upload process")
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
      process.exit(1);
    } else {
      console.log("\n👋 Operation cancelled by user");
    }
  })
  .parse();
