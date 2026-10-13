import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { root, work, writeJson, terraformValues } from './config.mjs';

const execute = promisify(execFile);
export async function run(command, args, options = {}) {
  try {
    const result = await execute(command, args, { cwd: root, maxBuffer: 32 * 1024 * 1024, env: process.env, ...options });
    return result.stdout;
  } catch (error) {
    throw new Error(`${command} ${args[0] ?? ''} failed: ${(error.stderr || error.stdout || error.message).slice(-6000)}`);
  }
}

export async function prepareTerraform(catalog, policy, { local = false } = {}) {
  const directory = path.join(work, 'terraform');
  await fs.mkdir(directory, { recursive: true });
  for (const filename of ['versions.tf', 'variables.tf', 'main.tf', 'outputs.tf', '.terraform.lock.hcl']) {
    await fs.copyFile(path.join(root, 'terraform', filename), path.join(directory, filename));
  }
  if (local) throw new Error('Use the isolated integration root for local backend verification');
  await writeJson(path.join(directory, 'requests.auto.tfvars.json'), terraformValues(catalog, policy));
  const bucket = process.env.STATE_BUCKET;
  const region = process.env.AWS_REGION;
  if (!bucket || !region) throw new Error('STATE_BUCKET and AWS_REGION must be configured');
  await run('terraform', ['init', '-input=false', '-lockfile=readonly', `-backend-config=bucket=${bucket}`, `-backend-config=region=${region}`, '-backend-config=key=gevico/repos/terraform.tfstate', '-backend-config=encrypt=true', '-backend-config=use_lockfile=true'], { cwd: directory });
  return directory;
}

export async function terraformPlan(directory, { readOnly = false } = {}) {
  const plan = path.join(directory, 'request.tfplan');
  await run('terraform', ['plan', '-input=false', '-no-color', ...(readOnly ? ['-lock=false'] : ['-lock-timeout=5m']), `-out=${plan}`], { cwd: directory });
  return JSON.parse(await run('terraform', ['show', '-json', plan], { cwd: directory }));
}

export async function terraformApply(directory) {
  return run('terraform', ['apply', '-input=false', '-no-color', '-lock-timeout=5m', path.join(directory, 'request.tfplan')], { cwd: directory });
}
