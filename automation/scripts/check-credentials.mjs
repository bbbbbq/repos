import { github } from './github.mjs';
import { forkUserClient, ForkCredentialError, reportForkCredentialIssue, resolveForkCredentialIssues } from './credentials.mjs';

try {
  if (process.env.GITHUB_REPOSITORY !== 'gevico/repos' || process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Credential checks must use trusted gevico/repos main code');
  await forkUserClient();
  await resolveForkCredentialIssues(github(process.env.CONTROL_TOKEN));
  console.log('Fork credentials authenticate zevorn as an active gevico owner');
} catch (error) {
  if (error instanceof ForkCredentialError) await reportForkCredentialIssue(github(process.env.CONTROL_TOKEN), error);
  console.error(error.message);
  process.exitCode = 1;
}
