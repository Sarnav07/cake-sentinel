import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('contracts', () => {
  it('deploys NexusVault and records balances', async () => {
    const [deployer, operator] = await ethers.getSigners();
    const vault = await ethers.deployContract('NexusVault', [operator.address], deployer);
    await vault.waitForDeployment();

    await vault.connect(deployer).deposit(operator.address, 1000);
    expect(await vault.getBalance(operator.address)).to.equal(1000n);
  });

  it('publishes and marks a signal executed', async () => {
    const [publisher] = await ethers.getSigners();
    const registry = await ethers.deployContract('SignalRegistry', [], publisher);
    await registry.waitForDeployment();

    const signalId = ethers.id('signal-1');
    await registry.publishSignal(signalId, 'arb-v1', ethers.ZeroAddress, 0, 50, 80);
    expect(await registry.getSignalCount()).to.equal(1n);
    await registry.markExecuted(signalId, 2500);
    const signal = await registry.getSignal(signalId);
    expect(signal.executed).to.equal(true);
  });

  it('tracks leaderboard stats', async () => {
    const [agent] = await ethers.getSigners();
    const leaderboard = await ethers.deployContract('AgentLeaderboard', [], agent);
    await leaderboard.waitForDeployment();

    await leaderboard.registerAgent('risk-bot');
    await leaderboard.updateStats(agent.address, true, 1000, 10);
    expect(await leaderboard.getWinRate(agent.address)).to.equal(100n);
  });
});