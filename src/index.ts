#!/usr/bin/env node

import input from "@inquirer/input";
import confirm from "@inquirer/confirm";
import { parse, format, isValid } from "date-fns";
import path from "path";
import fs from "fs";
import { globby } from "globby";
import chalk from "chalk";
import { loadConfig } from "./config.js";
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

const run = async () => {
  const globInput = await input({
    message: "Enter file paths or globs (e.g. scans/*.pdf):",
  });

  const filePaths = await globby(globInput);
  if (filePaths.length === 0) {
    console.log(chalk.yellow("No files matched."));
    return;
  }

  const source = await input({
    message: "Document source (e.g. bank):",
    validate: (val) => !!val || "Source is required",
  });

  const receivedDate = await input({
    message: "Date received (YYYY-MM-DD):",
    validate: validateDate,
  });

  const dryRun = await confirm({
    message: "Dry run? (preview only)",
    default: config.dryRunDefault ?? true,
  });

  const parsedDate = parse(receivedDate, "yyyy-MM-dd", new Date());
  const year = format(parsedDate, "yyyy");
  const month = format(parsedDate, "MM");

  for (const filePath of filePaths) {
    const base = path.basename(filePath, path.extname(filePath));
    const suggested = autoTag(base, config.enableNlpTagging);

    const tags = await input({
      message: `Tags for ${base} (comma-separated):`,
      default: suggested.join(","),
    });

    const title = await input({
      message: "Short title:",
      default: base,
    });

    const fileName = `${slugify(source)}-${slugify(tags.replace(/,/g, "-"))}--${receivedDate}--${slugify(title)}.pdf`;
    const key = `documents/${year}/${month}/${fileName}`;

    console.log(
      `📄 ${chalk.bold(filePath)} → s3://${chalk.cyan(config.defaultBucket)}/${key}`,
    );

    if (!dryRun) {
      await uploadWithProgress(s3, config.defaultBucket!, key, filePath);
      console.log(chalk.green("✓ Upload complete\n"));
    } else {
      console.log(chalk.gray("⚠️  Dry run — not uploaded\n"));
    }
  }
};

run().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
