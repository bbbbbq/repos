import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPolicy } from '../scripts/config.mjs';
import { verifyCatalog } from '../scripts/github.mjs';

const policy = { ...await loadPolicy(), administrator_users: [], administrator_teams: [] };
const request = {
  name: 'demo', description: 'Ruleset verification test', visibility: 'public', topics: [],
  access: { users: {}, teams: {} },
};
const adminActor = (mode) => ({ actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: mode });

function clientFor(bypassActors) {
  const response = (data) => async () => ({ data });
  const repos = {
    get: response({ id: 123, name: 'demo', description: request.description, visibility: 'public',
      default_branch: policy.default_branch, topics: [], archived: false, html_url: 'https://github.com/gevico/demo' }),
    listInvitations: response([]), listTeams: response([]), listCollaborators: response([]),
    getRepoRulesets: response([{ id: 456, name: 'review-default-branch', enforcement: 'active' }]),
    getRepoRuleset: response({
      conditions: { ref_name: { include: ['~DEFAULT_BRANCH'] } },
      rules: [{ type: 'deletion' }, { type: 'non_fast_forward' }, { type: 'pull_request', parameters: {
        required_approving_review_count: 1, dismiss_stale_reviews_on_push: true, require_last_push_approval: true,
      } }],
      ...(bypassActors === undefined ? {} : { bypass_actors: bypassActors }),
    }),
  };
  return { rest: { repos }, paginate: async (method, params) => (await method(params)).data };
}

test('verification accepts the explicit bypass actors for each supported setting', async () => {
  for (const mode of ['none', 'pull_request', 'always']) {
    const declaration = { ...request, ruleset: { admin_bypass: mode } };
    const actors = mode === 'none' ? [] : [adminActor(mode)];
    const result = await verifyCatalog(clientFor(actors), { demo: declaration }, policy);
    assert.equal(result[0].id, 123);
    assert.equal(result[0].status, 'active');
  }
});

test('verification rejects unavailable bypass actors even when no bypass is expected', async () => {
  for (const mode of ['none', 'pull_request', 'always']) {
    const declaration = { ...request, ruleset: { admin_bypass: mode } };
    await assert.rejects(verifyCatalog(clientFor(), { demo: declaration }, policy), /bypass actors.*unavailable.*write access/);
  }
});

test('verification still rejects missing, extra, and incorrect bypass actors', async () => {
  const declaration = { ...request, ruleset: { admin_bypass: 'pull_request' } };
  for (const actors of [[], [adminActor('always')], [adminActor('pull_request'), { actor_id: 42, actor_type: 'Team', bypass_mode: 'always' }]]) {
    await assert.rejects(verifyCatalog(clientFor(actors), { demo: declaration }, policy), /bypass actors differ/);
  }
  await assert.rejects(verifyCatalog(clientFor([adminActor('always')]), { demo: request }, policy), /bypass actors differ/);
});

test('existing repositories retain their unmanaged branch rules during verification', async () => {
  const existing = { ...request, mode: 'existing', repository_id: 123 };
  const client = clientFor();
  client.rest.repos.getRepoRulesets = () => assert.fail('Existing repository rulesets must not be verified');
  const result = await verifyCatalog(client, { demo: existing }, policy);
  assert.equal(result[0].id, 123);
});
