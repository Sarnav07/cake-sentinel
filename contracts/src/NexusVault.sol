// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NexusVault {
    address public owner;
    address public operator;

    mapping(address => uint256) public balances;
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    event Deposit(address indexed token, uint256 amount);
    event Withdrawal(address indexed token, uint256 amount);
    event TradeRecorded(bytes32 indexed tradeId, int256 profitUSD, uint256 gasUsed);

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner, 'not authorized');
        _;
    }

    constructor(address _operator) {
        owner = msg.sender;
        operator = _operator;
    }

    function deposit(address token, uint256 amount) external {
        require(token != address(0), 'token required');
        require(amount > 0, 'amount required');
        balances[token] += amount;
        totalDeposited += amount;
        emit Deposit(token, amount);
    }

    function withdraw(address token, uint256 amount) external onlyOperator {
        require(balances[token] >= amount, 'insufficient balance');
        balances[token] -= amount;
        totalWithdrawn += amount;
        emit Withdrawal(token, amount);
    }

    function recordTrade(bytes32 tradeId, int256 netProfitUSD, uint256 gasUsed) external onlyOperator {
        emit TradeRecorded(tradeId, netProfitUSD, gasUsed);
    }

    function getBalance(address token) external view returns (uint256) {
        return balances[token];
    }
}