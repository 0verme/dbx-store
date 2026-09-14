import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pluginsDirectory = path.join(root, "plugins");
const artifactBaseUrl = normalizeBaseUrl(requiredOption("--base-url"));
const shouldRewrite = process.argv.includes("--rewrite");

const files = (await readdir(pluginsDirectory)).filter((file) => file.endsWith(".json")).sort();
const artifacts = [];

for (const file of files) {
  const pluginPath = path.join(pluginsDirectory, file);
  const plugin = JSON.parse(await readFile(pluginPath, "utf8"));
  let changed = false;
  for (const version of plugin.versions) {
    for (const artifact of version.artifacts) {
      const oldUrl = artifact.url;
      const parsed = new URL(oldUrl);
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      const downloadIndex = pathParts.indexOf("download");
      if (parsed.hostname !== "github.com" || downloadIndex === -1 || pathParts[downloadIndex - 1] !== "releases") continue;
      const releaseTag = decodeURIComponent(pathParts[downloadIndex + 1] || "");
      const fileName = decodeURIComponent(pathParts.at(-1) || "");
      if (!releaseTag || !fileName) throw new Error(`Cannot parse GitHub Release URL: ${oldUrl}`);
      const prefix = `plugins/${plugin.id}/${version.version}`;
      const newUrl = `${artifactBaseUrl}/${prefix}/${fileName}`;
      artifacts.push({
        pluginId: plugin.id,
        version: version.version,
        target: artifact.target,
        releaseTag,
        oldUrl,
        newUrl,
        key: `${prefix}/${fileName}`,
        assets: [fileName, `${fileName.replace(/\.dbxp$/, "")}.artifact.json`, `${fileName.replace(/\.dbxp$/, "")}.signing-receipt.json`],
        sha256: artifact.sha256,
      });
      if (shouldRewrite) {
        artifact.url = newUrl;
        changed = true;
      }
    }
  }
  if (changed) await writeFile(pluginPath, `${JSON.stringify(plugin, null, 2)}\n`);
}

process.stdout.write(`${JSON.stringify({ artifacts }, null, 2)}\n`);

function requiredOption(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) throw new Error(`Missing required option ${name}`);
  return process.argv[index + 1];
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("--base-url must use HTTPS");
  return value.replace(/\/+$/, "");
}
