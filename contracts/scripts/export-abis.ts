import { mkdir, readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

async function main() {
  const artifactsDir = path.join(process.cwd(), 'artifacts', 'src');
  const abisDir = path.join(process.cwd(), 'abis');
  await mkdir(abisDir, { recursive: true });

  const contractFolders = await readdir(artifactsDir, { withFileTypes: true });
  for (const folder of contractFolders) {
    if (!folder.isDirectory()) continue;

    const artifactName = folder.name.replace('.sol', '');
    const artifactPath = path.join(artifactsDir, folder.name, `${artifactName}.json`);
    const artifact = JSON.parse(await readFile(artifactPath, 'utf8')) as { abi: unknown; contractName?: string };
    const outputName = artifact.contractName ?? artifactName;
    await writeFile(path.join(abisDir, `${outputName}.json`), JSON.stringify(artifact.abi, null, 2), 'utf8');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});