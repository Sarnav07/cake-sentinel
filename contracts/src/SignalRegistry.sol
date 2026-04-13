// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SignalRegistry {
    struct Signal {
        bytes32 id;
        address publisher;
        string strategyId;
        address poolAddress;
        uint8 direction;
        uint256 expectedProfitBps;
        uint256 confidence;
        uint256 timestamp;
        bool executed;
        int256 actualProfitUSD;
    }

    mapping(bytes32 => Signal) public signals;
    bytes32[] public signalIds;

    event SignalPublished(bytes32 indexed id, address indexed publisher, string strategyId);
    event SignalExecuted(bytes32 indexed id, int256 actualProfitUSD);

    function publishSignal(
        bytes32 id,
        string calldata strategyId,
        address pool,
        uint8 direction,
        uint256 expectedProfitBps,
        uint256 confidence
    ) external {
        require(signals[id].publisher == address(0), 'signal exists');
        signals[id] = Signal({
            id: id,
            publisher: msg.sender,
            strategyId: strategyId,
            poolAddress: pool,
            direction: direction,
            expectedProfitBps: expectedProfitBps,
            confidence: confidence,
            timestamp: block.timestamp,
            executed: false,
            actualProfitUSD: 0
        });
        signalIds.push(id);
        emit SignalPublished(id, msg.sender, strategyId);
    }

    function markExecuted(bytes32 id, int256 actualProfitUSD) external {
        Signal storage signal = signals[id];
        require(signal.publisher != address(0), 'signal missing');
        signal.executed = true;
        signal.actualProfitUSD = actualProfitUSD;
        emit SignalExecuted(id, actualProfitUSD);
    }

    function getSignal(bytes32 id) external view returns (Signal memory) {
        return signals[id];
    }

    function getSignalCount() external view returns (uint256) {
        return signalIds.length;
    }

    function getSignalsByPublisher(address publisher) external view returns (bytes32[] memory) {
        uint256 count;
        for (uint256 i = 0; i < signalIds.length; i++) {
            if (signals[signalIds[i]].publisher == publisher) {
                count++;
            }
        }

        bytes32[] memory result = new bytes32[](count);
        uint256 index;
        for (uint256 i = 0; i < signalIds.length; i++) {
            if (signals[signalIds[i]].publisher == publisher) {
                result[index++] = signalIds[i];
            }
        }
        return result;
    }
}