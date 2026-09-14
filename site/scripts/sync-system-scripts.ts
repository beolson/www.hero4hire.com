import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const sourceDirectory = path.resolve(
  import.meta.dirname,
  "../../docs/systemscripts",
);
const publicDirectory = path.resolve(import.meta.dirname, "../public/scripts");

async function copyScripts(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const sourcePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await copyScripts(sourcePath);
      continue;
    }

    if (!entry.isFile() || path.extname(entry.name) !== ".sh") continue;

    const destinationPath = path.join(
      publicDirectory,
      path.relative(sourceDirectory, sourcePath),
    );
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await cp(sourcePath, destinationPath);
  }
}

await rm(publicDirectory, { force: true, recursive: true });
await copyScripts(sourceDirectory);
