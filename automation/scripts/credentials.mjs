import { github } from './github.mjs';

const marker = '<!-- gevico-fork-credentials -->';

export class ForkCredentialError extends Error {}

export async function forkUserClient(token = process.env.FORK_USER_TOKEN) {
  if (!token) throw new ForkCredentialError('FORK_USER_TOKEN is missing from the production environment');
  const client = github(token);
  try {
    const { data: user } = await client.rest.users.getAuthenticated();
    if (user.login !== 'zevorn') throw new ForkCredentialError('FORK_USER_TOKEN must belong to zevorn');
    const { data: membership } = await client.rest.orgs.getMembershipForAuthenticatedUser({ org: 'gevico' });
    if (membership.state !== 'active' || membership.role !== 'admin') throw new ForkCredentialError('The Fork user must be an active gevico organization owner');
    return client;
  } catch (error) {
    if (error instanceof ForkCredentialError) throw error;
    if ([401, 403, 404].includes(error.status)) throw new ForkCredentialError(`FORK_USER_TOKEN cannot authenticate or access gevico (HTTP ${error.status})`);
    throw error;
  }
}

async function credentialIssues(control) {
  const issues = await control.paginate(control.rest.issues.listForRepo, { owner: 'gevico', repo: 'repos', state: 'open', per_page: 100 });
  return issues.filter((issue) => !issue.pull_request && issue.user.login === 'github-actions[bot]' && issue.body?.startsWith(marker));
}

export async function reportForkCredentialIssue(control, error, context = 'FORK_USER_TOKEN') {
  const existing = await credentialIssues(control);
  if (existing.length) return existing[0];
  const run = process.env.GITHUB_RUN_ID ? `https://github.com/gevico/repos/actions/runs/${process.env.GITHUB_RUN_ID}` : 'Local credential verification';
  return (await control.rest.issues.create({ owner: 'gevico', repo: 'repos', title: 'Fork credential requires renewal',
    body: `${marker}\n\n@zevorn\n\nCredential check failed for ${context}: ${error.message}\n\nRun: ${run}\n\nUpdate the production environment secret FORK_USER_TOKEN, then rerun Credentials or the failed Apply workflow. Repository creation, access and lifecycle operations use GitHub App credentials.\n` })).data;
}

export async function resolveForkCredentialIssues(control) {
  for (const issue of await credentialIssues(control)) await control.rest.issues.update({ owner: 'gevico', repo: 'repos', issue_number: issue.number, state: 'closed', state_reason: 'completed' });
}
