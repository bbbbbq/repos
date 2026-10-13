import fs from 'node:fs/promises';
import { getIDToken } from '@actions/core';
import { decodeJwt } from 'jose';

if (!process.env.GITHUB_ACTIONS) throw new Error('Identity inspection runs in GitHub Actions');
const claims = decodeJwt(await getIDToken('sts.amazonaws.com'));
const identity = { issuer: claims.iss, audience: claims.aud, subject: claims.sub, workflow: claims.job_workflow_ref, repository: claims.repository };
console.log(JSON.stringify(identity, null, 2));
await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, `## AWS OIDC identity\n\nUse this exact audience and subject in the IAM trust policy.\n\n\`\`\`json\n${JSON.stringify(identity, null, 2)}\n\`\`\`\n`);
