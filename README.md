# Dockit

The human way to manage, backup, and track all of your import documents.

## Use Cases

- **Document Management**: Dockit simplifies the process of organizing and storing documents, ensuring they are easily accessible when needed.
- **Backup and Recovery**: With Dockit, you can create backups of your documents and restore them quickly in case of data loss or corruption.
- **Tracking Changes**: Dockit allows you to track changes made to documents over time, providing a history of updates and revisions.

## Setup

Requires Node.js 22.12 or higher.

```bash
git clone https://github.com/neovintage/dockit.git
cd dockit
npm install
npm run build
node dist/index.js config   # creates ~/.dockitrc.json; edit it to set your bucket
```

Optionally run `npm link` to get a `dockit` command that runs the Node build.

## Using Dockit

```bash
node dist/index.js upload                 # prompts for a folder, file, or glob
node dist/index.js upload ~/scans         # upload every supported file in a folder
node dist/index.js upload ~/scans --no-dry-run
node dist/index.js upload -c ./other.json # use a different config file
```

Supported files: pdf, zip, jpg/jpeg, png, gif, heic, webp, tif/tiff. Files are stored as
`documents/<year>/<month>/<date>--<title>.<ext>`. If the filename has no date, you're
prompted for one (defaulting to the file's modified date). Existing keys are never
overwritten; a `-2`, `-3`, ... suffix is added.

Dry run is controlled by `dryRunDefault` in the config (on by default). Use `--dry-run` or
`--no-dry-run` to override it per run.

## Configuration

`~/.dockitrc.json` (or `--config`) holds `defaultBucket`, `region`, `dryRunDefault`,
`enableNlpTagging`, and optionally `awsAccessKeyId` / `awsSecretAccessKey`. The environment
variables `S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (also
read from a local `.env`) take precedence. If no keys are set, the default AWS credential
chain (`~/.aws`, SSO, etc.) is used.
