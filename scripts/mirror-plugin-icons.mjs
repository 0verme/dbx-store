import { readFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile("catalog/index.json", "utf8"));

for (const plugin of catalog.plugins) {
  const expectedUrl = `https://dl.dbxio.com/plugins/${plugin.id}/${plugin.latestVersion}/icon.svg`;
  if (plugin.icon !== expectedUrl) throw new Error(`Unexpected catalog icon URL for ${plugin.id}: ${plugin.icon}`);
  const version = plugin.versions.find((entry) => entry.version === plugin.latestVersion);
  const artifact = version?.artifacts[0];
  if (!artifact) throw new Error(`Missing latest artifact for ${plugin.id}@${plugin.latestVersion}`);
  process.stdout.write(`${plugin.id}\t${plugin.latestVersion}\t${artifact.url}\tplugins/${plugin.id}/${plugin.latestVersion}/icon.svg\n`);
}
