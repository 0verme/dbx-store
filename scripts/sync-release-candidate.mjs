import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const options = parseOptions(process.argv.slice(2));
const repository = required(options, "repository");
const tag = required(options, "tag");
const releaseCandidatesUrl = required(options, "release-candidates-url");
const output = required(options, "output");
const metadataUrl = options["metadata-url"];

assert(/^[^/]+\/[A-Za-z0-9._-]+$/.test(repository), `Invalid source repository '${repository}'`);
assert(tag && !tag.includes(".."), "Invalid release tag");
assertUrl(releaseCandidatesUrl, "release-candidates-url");
if (metadataUrl) assertUrl(metadataUrl, "metadata-url");

const release = await fetchJson(releaseCandidatesUrl);
const identity = release.plugin;
assert(identity && typeof identity === "object" && !Array.isArray(identity), "release-candidates.json has no plugin identity");
for (const field of ["id", "publisher", "version"]) {
  assert(typeof identity[field] === "string" && identity[field].length > 0, `Missing plugin identity field '${field}'`);
}
assert(Array.isArray(release.artifacts) && release.artifacts.length > 0, "Release contains no plugin artifacts");

const metadata = metadataUrl ? await fetchOptionalJson(metadataUrl) : {};
assert(metadata && typeof metadata === "object" && !Array.isArray(metadata), "Store metadata must be an object");
if (metadata.icon && !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(metadata.icon)) {
  metadata.icon = `https://raw.githubusercontent.com/${repository}/${encodeURIComponent(tag)}/${metadata.icon.replace(/^\/+/, "")}`;
}
const allowedMetadata = new Set([
  "name",
  "description",
  "icon",
  "tags",
  "permissions",
  "source",
  "homepage",
  "license",
  "releaseNotes",
  "localizations",
]);
for (const key of Object.keys(metadata)) assert(allowedMetadata.has(key), `Unsupported store metadata field '${key}'`);

const candidate = {
  schemaVersion: 1,
  id: identity.id,
  publisher: identity.publisher,
  version: identity.version,
  ...metadata,
  targets: release.artifacts.map((artifact) => ({
    target: artifact.target,
    url: releaseAssetUrl(repository, tag, artifact.url),
    sha256: artifact.sha256,
    size: artifact.size,
  })).sort((left, right) => left.target.localeCompare(right.target)),
};

const existingPlugin = await readOptionalJson(path.join("plugins", `${identity.id}.json`));
if (!existingPlugin) {
  candidate.name ??= identity.name;
  candidate.description ??= identity.description ?? "";
  candidate.source ??= `https://github.com/${repository}/tree/${encodeURIComponent(tag)}`;
  candidate.homepage ??= `https://github.com/${repository}`;
  assert(typeof candidate.name === "string" && candidate.name.length > 0, "New plugins require store metadata 'name'");
  assert(typeof candidate.license === "string" && candidate.license.length > 0, "New plugins require store metadata 'license'");
}

await writeFile(output, `${JSON.stringify(candidate, null, 2)}\n`);
console.log(`Prepared ${candidate.id}@${candidate.version} with ${candidate.targets.length} target(s)`);

function parseOptions(arguments_) {
  const parsed = {};
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (!argument.startsWith("--")) throw new Error(`Unexpected argument '${argument}'`);
    const key = argument.slice(2);
    const value = arguments_[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for '${argument}'`);
    parsed[key] = value;
    index += 1;
  }
  return parsed;
}

function required(parsed, key) {
  if (!parsed[key]) throw new Error(`Missing required option '--${key}'`);
  return parsed[key];
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertUrl(value, name) {
  const url = new URL(value);
  assert(url.protocol === "https:", `${name} must use HTTPS`);
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  return response.json();
}

async function fetchOptionalJson(url) {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (response.status === 404) return {};
  if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  return response.json();
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function releaseAssetUrl(sourceRepository, releaseTag, artifactUrl) {
  assert(typeof artifactUrl === "string" && artifactUrl.length > 0, "Artifact URL is required");
  const parsed = new URL(artifactUrl, "https://artifact.invalid/");
  const fileName = path.posix.basename(parsed.pathname);
  assert(fileName === parsed.pathname.slice(1) && /^[A-Za-z0-9._-]+\.dbxp$/.test(fileName), `Invalid candidate artifact '${artifactUrl}'`);
  return `https://github.com/${sourceRepository}/releases/download/${encodeURIComponent(releaseTag)}/${encodeURIComponent(fileName)}`;
}
