// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgentLeaderboard {
    struct AgentStats {
        address agentAddress;
        string name;
        uint256 totalSignals;
        uint256 winningSignals;
        int256 totalProfitUSD;
        uint256 totalGasUSD;
        uint256 lastUpdated;
        bool isActive;
    }

    mapping(address => AgentStats) public agentStats;
    address[] public registeredAgents;

    event AgentRegistered(address indexed agent, string name);
    event StatsUpdated(address indexed agent, int256 newTotalProfit, uint256 winRate);

    function registerAgent(string calldata name) external {
        AgentStats storage stats = agentStats[msg.sender];
        require(!stats.isActive, 'already registered');
        agentStats[msg.sender] = AgentStats({
            agentAddress: msg.sender,
            name: name,
            totalSignals: 0,
            winningSignals: 0,
            totalProfitUSD: 0,
            totalGasUSD: 0,
            lastUpdated: block.timestamp,
            isActive: true
        });
        registeredAgents.push(msg.sender);
        emit AgentRegistered(msg.sender, name);
    }

    function updateStats(address agent, bool won, int256 profitUSD, uint256 gasUSD) external {
        AgentStats storage stats = agentStats[agent];
        require(stats.isActive, 'agent missing');
        stats.totalSignals += 1;
        if (won) {
            stats.winningSignals += 1;
        }
        stats.totalProfitUSD += profitUSD;
        stats.totalGasUSD += gasUSD;
        stats.lastUpdated = block.timestamp;

        uint256 winRate = getWinRate(agent);
        emit StatsUpdated(agent, stats.totalProfitUSD, winRate);
    }

    function getLeaderboard() external view returns (AgentStats[] memory) {
        AgentStats[] memory leaderboard = new AgentStats[](registeredAgents.length);
        for (uint256 i = 0; i < registeredAgents.length; i++) {
            leaderboard[i] = agentStats[registeredAgents[i]];
        }
        return leaderboard;
    }

    function getRank(address agent) external view returns (uint256) {
        uint256 rank = 1;
        int256 targetProfit = agentStats[agent].totalProfitUSD;
        for (uint256 i = 0; i < registeredAgents.length; i++) {
            if (agentStats[registeredAgents[i]].totalProfitUSD > targetProfit) {
                rank++;
            }
        }
        return rank;
    }

    function getWinRate(address agent) public view returns (uint256) {
        AgentStats storage stats = agentStats[agent];
        if (stats.totalSignals == 0) {
            return 0;
        }
        return (stats.winningSignals * 100) / stats.totalSignals;
    }
}