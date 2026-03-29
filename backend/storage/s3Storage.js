import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

function normalizeBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export function createS3StorageProvider({
  bucket,
  region,
  endpoint,
  accessKeyId,
  secretAccessKey,
  forcePathStyle = false,
}) {
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error('Configuracao S3 incompleta.');
  }

  const client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: normalizeBooleanEnv(forcePathStyle, false),
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return {
    name: 's3',
    async uploadBuffer({ key, buffer, contentType, metadata = {} }) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          Metadata: metadata,
        })
      );

      return {
        storage_provider: 's3',
        file_key: key,
        file_path: null,
      };
    },
    async deleteObject({ fileKey }) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: fileKey,
        })
      );
    },
    async getMetadata({ fileKey }) {
      const result = await client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: fileKey,
        })
      );

      return {
        contentLength: result.ContentLength ?? null,
        lastModified: result.LastModified?.toISOString() || null,
        contentType: result.ContentType || null,
      };
    },
    async openReadStream({ fileKey }) {
      const result = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: fileKey,
        })
      );

      return {
        stream: result.Body,
        contentLength: result.ContentLength ?? null,
        contentType: result.ContentType || null,
        lastModified: result.LastModified?.toISOString() || null,
      };
    },
    async checkHealth() {
      await client.send(
        new HeadBucketCommand({
          Bucket: bucket,
        })
      );

      return {
        available: true,
        provider: 's3',
        bucket,
        region,
      };
    },
  };
}

export default createS3StorageProvider;
