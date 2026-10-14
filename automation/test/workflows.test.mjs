import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { root, parseYaml } from '../scripts/config.mjs';

test('privileged request workflow executes trusted base code and a read-only app identity', async () => {
  const workflow = parseYaml(await fs.readFile(path.join(root, '.github/workflows/request.yml'), 'utf8'), 'request.yml');
  assert.ok(workflow.on.pull_request_target);
  assert.equal(workflow.jobs.request.environment, 'preview');
  const steps = workflow.jobs.request.steps;
  const checkout = steps.find((step) => step.uses?.startsWith('actions/checkout@'));
  assert.equal(checkout.with.ref, '${{ github.event.pull_request.base.sha || github.sha }}');
  assert.equal(checkout.with['persist-credentials'], false);
  assert.ok(steps.every((step) => !step.run?.includes('github.event.pull_request.head')));
  assert.equal(workflow.permissions.actions, 'read');
  const automation = steps.find((step) => step.uses === './.github/actions/automation');
  assert.equal(automation.with.command, 'request');
  assert.equal(automation.env.STATE_AGE_KEY, '${{ secrets.STATE_AGE_KEY }}');
  assert.equal(automation.env.APP_CLIENT_ID, '${{ vars.READ_APP_CLIENT_ID }}');
  assert.equal(automation.env.APP_PRIVATE_KEY, '${{ secrets.READ_APP_PRIVATE_KEY }}');
  assert.equal(automation.env.FORK_USER_TOKEN, undefined);
  assert.equal(automation.env.GH_TOKEN, undefined);
  assert.equal(workflow.jobs.request.env.APP_PRIVATE_KEY, undefined);
  assert.equal(workflow.jobs.request.env.STATE_AGE_KEY, undefined);
});

test('apply workflow restricts credentials and serializes writes on the approved branch', async () => {
  const workflow = parseYaml(await fs.readFile(path.join(root, '.github/workflows/apply.yml'), 'utf8'), 'apply.yml');
  assert.deepEqual(workflow.on.push.branches, ['main']);
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.equal(workflow.jobs.apply.environment, 'production');
  const automation = workflow.jobs.apply.steps.find((step) => step.uses === './.github/actions/automation');
  assert.equal(automation.with.command, 'apply');
  assert.equal(automation.env.STATE_AGE_KEY, '${{ secrets.STATE_AGE_KEY }}');
  assert.equal(automation.env.APP_CLIENT_ID, '${{ vars.WRITE_APP_CLIENT_ID }}');
  assert.equal(automation.env.APP_PRIVATE_KEY, '${{ secrets.WRITE_APP_PRIVATE_KEY }}');
  assert.equal(automation.env.FORK_USER_TOKEN, '${{ secrets.FORK_USER_TOKEN }}');
  assert.equal(automation.env.GH_TOKEN, undefined);
  assert.equal(workflow.permissions.issues, 'write');
  assert.equal(workflow.jobs.apply.env.STATE_AGE_KEY, undefined);
});
