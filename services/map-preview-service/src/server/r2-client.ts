import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { type RidiLogger } from "@ridi/logger";
import { generate } from "xksuid";

import { env } from "./env";

export class R2Client {
  private s3 = new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
    // requestChecksumCalculation: "WHEN_REQUIRED",
    // responseChecksumValidation: "WHEN_REQUIRED",
  });
  private logger: RidiLogger;

  constructor(logger: RidiLogger) {
    this.logger = logger.withContext({ module: "r2-client" });
  }

  public async uploadPreview(
    reqId: string,
    imageData: Uint8Array,
  ): Promise<string> {
    const key = `${env.PREVIEW_PREFIX}/${reqId}/${generate()}.png`;

    this.logger.info("Starting upload", { key });

    const put = new PutObjectCommand({
      Bucket: env.MAP_DATA_BUCKET,
      Key: key,
      Body: imageData,
    });

    await this.s3.send(put);

    const url = `${env.BUCKET_URL}/${key}`;

    this.logger.info("Upload finished", { key, url });

    return url;
  }
}
