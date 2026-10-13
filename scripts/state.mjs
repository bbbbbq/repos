import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export class StateStore {
  constructor() {
    if (!process.env.STATE_BUCKET || !process.env.AWS_REGION) throw new Error('STATE_BUCKET and AWS_REGION must be configured');
    this.bucket = process.env.STATE_BUCKET;
    this.client = new S3Client({ region: process.env.AWS_REGION });
  }

  async get(key, optional = false) {
    try {
      const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: `gevico/repos/${key}` }));
      return { data: JSON.parse(await response.Body.transformToString()), version: response.VersionId ?? response.ETag };
    } catch (error) {
      if (optional && (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404)) return null;
      throw error;
    }
  }

  async put(key, data) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: `gevico/repos/${key}`, Body: `${JSON.stringify(data, null, 2)}\n`, ContentType: 'application/json', ServerSideEncryption: 'AES256' }));
  }

  async terraformState() {
    const state = await this.get('terraform.tfstate', true);
    const names = new Set();
    for (const resource of state?.data.resources ?? []) {
      if (resource.type === 'github_repository') for (const instance of resource.instances ?? []) names.add(instance.index_key);
    }
    return { names, version: state?.version ?? null, serial: state?.data.serial ?? 0, lineage: state?.data.lineage ?? null };
  }
}
