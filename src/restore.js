const core = require("@actions/core");
const exec = require("@actions/exec");
const md5File = require("md5-file");
const cache = require("@actions/cache");
const path = require('path')

async function uname() {
  let output = "";
  const options = {};
  if (process.env.prefix) {
    output += process.env.prefix;
  }
  options.listeners = {
    stdout: data => {
      output += data.toString();
    },
  };
  await exec.exec("uname", [], options);

  return output.trim();
}

async function run() {
  const workingDir = process.env.WORKING_DIR || null;
  if (workingDir) {
    process.chdir(workingDir);
  }
  const os = await uname();
  const cachePath = path.join(process.cwd(), '.yarn', 'cache')
  core.saveState("YARN_CACHE_PATH", cachePath);

  const hash = md5File.sync("yarn.lock");

  const primaryKey = `${os}-yarn-node-cache-${hash}`;
  const restoreKey = `${os}-yarn-node-cache-`;
  core.saveState("YARN_CACHE_KEY", primaryKey);
  core.info(`Cache keys: ${[primaryKey, restoreKey].join(", ")}`);

  const cacheKey = await cache.restoreCache(
    [cachePath, "node_modules"],
    primaryKey,
    [restoreKey]
  );

  if (!cacheKey) {
    core.info("Cache not found");
    return;
  }

  core.saveState("YARN_CACHE_RESULT", cacheKey);
  const isExactKeyMatch = primaryKey === cacheKey;
  core.setOutput("cache-hit", isExactKeyMatch.toString());

  core.info(`Cache restored from key: ${cacheKey}`);
}

run().catch(err => {
  core.setFailed(err.toString());
});
