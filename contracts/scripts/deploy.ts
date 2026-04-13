import { ethers } from 'hardhat';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  const vault = await ethers.deployContract('NexusVault', [deployer.address]);
  const registry = await ethers.deployContract('SignalRegistry');
  const leaderboard = await ethers.deployContract('AgentLeaderboard');

  await Promise.all([vault.waitForDeployment(), registry.waitForDeployment(), leaderboard.waitForDeployment()]);

  const output = {
    NexusVault: await vault.getAddress(),
    SignalRegistry: await registry.getAddress(),
    AgentLeaderboard: await leaderboard.getAddress(),
  };

  await mkdir(path.join(process.cwd(), 'deployments'), { recursive: true });
  await writeFile(path.join(process.cwd(), 'deployments', 'bsc-testnet.json'), JSON.stringify(output, null, 2), 'utf8');
  console.log(output);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});