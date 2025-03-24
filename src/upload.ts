import { Upload } from "@aws-sdk/lib-storage";
import { S3Client } from "@aws-sdk/client-s3";
import fs from "fs";
import cliProgress from "cli-progress";

export async function uploadWithProgress(
  s3: S3Client,
  bucket: string,
  key: string,
  filePath: string,
) {
  const fileStream = fs.createReadStream(filePath);
  const fileSize = fs.statSync(filePath).size;

  const bar = new cliProgress.SingleBar(
    {
      format: `Uploading {filename} [{bar}] {percentage}% | {value}/{total} bytes`,
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic,
  );

  bar.start(fileSize, 0, { filename: filePath });

  const uploader = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: key,
      Body: fileStream,
      ContentType: "application/pdf",
    },
  });

  uploader.on("httpUploadProgress", (progress) => {
    if (progress.loaded) {
      bar.update(progress.loaded);
    }
  });

  await uploader.done();
  bar.stop();
}
