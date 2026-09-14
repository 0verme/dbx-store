import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Finalizes signed plugin candidates: reads candidates/*.json plus the signed
// artifact digests produced by the store signing workflow, writes/merges
// plugins/<id>.json, and removes the consumed candidate files. Run from the
// repository root after every target has been signed and published.

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidatesDirectory = path.join(root, "candidates");
const pluginsDirectory = path.join(root, "plugins");
const listingFields = ["name", "description", "icon", "tags", "permissions", "source", "homepage", "license", "localizations"];

const signingKeyId = requiredOption("--signing-key-id");
const signedPath = requiredOption("--signed");
const artifactBaseUrl = normalizeBaseUrl(requiredOption("--artifact-base-url"));
const signed = JSON.parse(await readFile(signedPath, "utf8"));

const files = (await readdir(candidatesDirectory)).filter((file) => file.endsWith(".json")).sort();
if (files.length === 0) throw new Error("No candidates/*.json found to finalize");
for (const file of files) {
  const candidate = JSON.parse(await readFile(path.join(candidatesDirectory, file), "utf8"));
  const pluginPath = path.join(pluginsDirectory, `${candidate.id}.json`);
  let plugin = null;
  try {
    plugin = JSON.parse(await readFile(pluginPath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const artifacts = candidate.targets.map((target) => {
    const digest = signed[`${candidate.id}/${candidate.version}/${target.target}`];
    if (!digest) throw new Error(`Missing signed digest for ${candidate.id}/${candidate.version}/${target.target}`);
    const fileName = `${candidate.id}-${candidate.version}-${target.target}.dbxp`;
    return {
      target: target.target,
      url: `${artifactBaseUrl}/plugins/${candidate.id}/${candidate.version}/${fileName}`,
      sha256: digest.sha256,
      signingKeyId,
      size: digest.size,
    };
  });
  const version = {
    version: candidate.version,
    releasedAt: new Date().toISOString(),
    releaseNotes: candidate.releaseNotes ?? "",
    artifacts,
  };
  if (plugin) {
    for (const field of listingFields) {
      if (candidate[field] !== undefined) plugin[field] = candidate[field];
    }
    if (plugin.versions.some((entry) => entry.version === candidate.version)) {
      throw new Error(`Version '${candidate.version}' is already listed for plugin '${candidate.id}'`);
    }
    plugin.versions.push(version);
    plugin.latestVersion = plugin.versions
      .map((entry) => entry.version)
      .sort(compareSemver)
      .at(-1);
  } else {
    plugin = {
      id: candidate.id,
      name: candidate.name,
      description: candidate.description ?? "",
      publisher: candidate.publisher,
      verified: false,
      icon: candidate.icon ?? "",
      tags: candidate.tags ?? [],
      permissions: candidate.permissions ?? [],
      source: candidate.source ?? "",
      homepage: candidate.homepage ?? "",
      license: candidate.license ?? "",
      latestVersion: candidate.version,
      versions: [version],
      ...(candidate.localizations ? { localizations: candidate.localizations } : {}),
    };
  }
  await writeFile(pluginPath, `${JSON.stringify(plugin, null, 2)}\n`);
  await rm(path.join(candidatesDirectory, file));
  console.log(`Finalized ${candidate.id}@${candidate.version} (${artifacts.length} artifact(s))`);
}

function requiredOption(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) throw new Error(`Missing required option ${name}`);
  return process.argv[index + 1];
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`Invalid artifact base URL: ${value}`);
  return value.replace(/\/+$/, "");
}

function compareSemver(left, right) {
  const parse = (value) => value.split(/[+-]/)[0].split(".").map((part) => Number.parseInt(part, 10));
  const [leftMajor, leftMinor, leftPatch] = parse(left);
  const [rightMajor, rightMinor, rightPatch] = parse(right);
  return leftMajor - rightMajor || leftMinor - rightMinor || leftPatch - rightPatch;
}
