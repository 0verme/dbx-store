import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDirectory = path.join(root, "plugins");
const catalogPath = path.join(root, "catalog", "index.json");
const identifierPattern = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const semverPattern = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const sha256Pattern = /^[a-f0-9]{64}$/i;

await rejectCommittedPackages(root);

const files = (await readdir(pluginsDirectory)).filter((file) => file.endsWith(".json")).sort();
const plugins = [];
for (const file of files) {
  const plugin = JSON.parse(await readFile(path.join(pluginsDirectory, file), "utf8"));
  validatePlugin(plugin, file);
  plugins.push(normalizePlugin(plugin));
}

const ids = new Set();
for (const plugin of plugins) {
  assert(!ids.has(plugin.id), `Duplicate plugin id '${plugin.id}'`);
  ids.add(plugin.id);
}

const catalog = {
  $schema: "../schemas/marketplace.schema.json",
  catalogVersion: 1,
  repository: {
    id: "dbx-official",
    name: "DBX Marketplace",
    homepage: "https://github.com/t8y2/dbx-store",
  },
  plugins: plugins.sort((left, right) => left.id.localeCompare(right.id)),
};

await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Validated ${plugins.length} plugin metadata file(s)`);

function validatePlugin(plugin, file) {
  assert(plugin && typeof plugin === "object" && !Array.isArray(plugin), `${file}: plugin metadata must be an object`);
  assert(identifierPattern.test(plugin.id || ""), `${file}: invalid plugin id`);
  assert(file === `${plugin.id}.json`, `${file}: filename must match plugin id '${plugin.id}.json'`);
  assert(nonempty(plugin.name), `${file}: name is required`);
  assert(nonempty(plugin.publisher), `${file}: publisher is required`);
  assert(semverPattern.test(plugin.latestVersion || ""), `${file}: latestVersion must be semantic versioning`);
  assert(Array.isArray(plugin.versions) && plugin.versions.length > 0, `${file}: at least one version is required`);
  assert(plugin.versions.some((version) => version.version === plugin.latestVersion), `${file}: latestVersion is missing from versions`);
  const versions = new Set();
  for (const version of plugin.versions) {
    assert(semverPattern.test(version.version || ""), `${file}: invalid version '${version.version}'`);
    assert(!versions.has(version.version), `${file}: duplicate version '${version.version}'`);
    versions.add(version.version);
    assert(Array.isArray(version.artifacts), `${file}: version '${version.version}' artifacts must be an array`);
    const targets = new Set();
    for (const artifact of version.artifacts) {
      assert(/^[a-z0-9-]{1,64}$/.test(artifact.target || ""), `${file}: invalid target '${artifact.target}'`);
      assert(!targets.has(artifact.target), `${file}: duplicate target '${artifact.target}' in ${version.version}`);
      targets.add(artifact.target);
      const url = parseUrl(artifact.url, `${file}: invalid artifact URL`);
      assert(url.protocol === "https:", `${file}: artifact URLs must use HTTPS`);
      assert(sha256Pattern.test(artifact.sha256 || ""), `${file}: invalid SHA-256 for ${version.version}/${artifact.target}`);
      assert(Number.isSafeInteger(artifact.size) && artifact.size >= 0 && artifact.size <= 512 * 1024 * 1024, `${file}: invalid artifact size for ${version.version}/${artifact.target}`);
    }
  }
}

function normalizePlugin(plugin) {
  const normalized = structuredClone(plugin);
  normalized.verified = normalized.verified === true;
  normalized.description ||= "";
  normalized.tags ||= [];
  normalized.permissions ||= [];
  normalized.versions.sort((left, right) => right.version.localeCompare(left.version, undefined, { numeric: true }));
  for (const version of normalized.versions) version.artifacts.sort((left, right) => left.target.localeCompare(right.target));
  return normalized;
}

async function rejectCommittedPackages(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await rejectCommittedPackages(entryPath);
    if (entry.isFile()) {
      assert(!entry.name.endsWith(".dbxp"), `Binary plugin package must not be committed: ${path.relative(root, entryPath)}`);
      const metadata = await stat(entryPath);
      assert(metadata.size <= 1024 * 1024, `Repository file exceeds 1 MiB: ${path.relative(root, entryPath)}`);
    }
  }
}

function parseUrl(value, message) {
  try {
    return new URL(value);
  } catch {
    throw new Error(message);
  }
}

function nonempty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
