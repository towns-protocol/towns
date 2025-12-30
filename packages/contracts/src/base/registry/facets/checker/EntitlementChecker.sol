// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IEntitlementGatedBase} from "../../../../spaces/facets/gated/IEntitlementGated.sol";
import {IEntitlementChecker} from "./IEntitlementChecker.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";
import {CurrencyTransfer} from "../../../../utils/libraries/CurrencyTransfer.sol";
import {NodeOperatorStatus, NodeOperatorStorage} from "../operator/NodeOperatorStorage.sol";
import {XChainLib} from "../xchain/XChainLib.sol";
import {EntitlementCheckerStorage} from "./EntitlementCheckerStorage.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";

contract EntitlementChecker is IEntitlementChecker, Facet {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using CustomRevert for bytes4;
    using SafeTransferLib for address;

    // =============================================================
    //                           Initializer
    // =============================================================

    function __EntitlementChecker_init() external onlyInitializing {
        _addInterface(type(IEntitlementChecker).interfaceId);
    }

    // =============================================================
    //                           Modifiers
    // =============================================================
    modifier onlyNodeOperator(address node, address operator) {
        EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage.layout();

        if (layout.operatorByNode[node] != operator) {
            EntitlementChecker_InvalidNodeOperator.selector.revertWith();
        }
        _;
    }

    modifier onlyRegisteredApprovedOperator() {
        NodeOperatorStorage.Layout storage nodeOperatorLayout = NodeOperatorStorage.layout();

        if (!nodeOperatorLayout.operators.contains(msg.sender)) {
            EntitlementChecker_InvalidOperator.selector.revertWith();
        }
        _;

        if (nodeOperatorLayout.statusByOperator[msg.sender] != NodeOperatorStatus.Approved) {
            EntitlementChecker_OperatorNotActive.selector.revertWith();
        }
    }

    // =============================================================
    //                           External
    // =============================================================

    /// @inheritdoc IEntitlementChecker
    function registerNode(address node) external onlyRegisteredApprovedOperator {
        EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage.layout();

        if (layout.nodes.contains(node)) {
            EntitlementChecker_NodeAlreadyRegistered.selector.revertWith();
        }

        layout.nodes.add(node);
        layout.operatorByNode[node] = msg.sender;

        emit NodeRegistered(node);
    }

    /// @inheritdoc IEntitlementChecker
    function unregisterNode(address node) external onlyNodeOperator(node, msg.sender) {
        EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage.layout();

        if (!layout.nodes.contains(node)) {
            EntitlementChecker_NodeNotRegistered.selector.revertWith();
        }

        layout.nodes.remove(node);
        delete layout.operatorByNode[node];

        emit NodeUnregistered(node);
    }

    /// @inheritdoc IEntitlementChecker
    function isValidNode(address node) external view returns (bool) {
        EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage.layout();
        return layout.nodes.contains(node);
    }

    /// @inheritdoc IEntitlementChecker
    function getNodeCount() external view returns (uint256) {
        EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage.layout();
        return layout.nodes.length();
    }

    /// @inheritdoc IEntitlementChecker
    function getNodeAtIndex(uint256 index) external view returns (address) {
        EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage.layout();

        require(index < layout.nodes.length(), "Index out of bounds");
        return layout.nodes.at(index);
    }

    /// @inheritdoc IEntitlementChecker
    function getRandomNodes(uint256 count) external view returns (address[] memory) {
        return _getRandomNodes(count);
    }

    /// @inheritdoc IEntitlementChecker
    function requestEntitlementCheck(
        address walletAddress,
        bytes32 transactionId,
        uint256 roleId,
        address[] memory nodes
    ) external {
        emit EntitlementCheckRequested(walletAddress, msg.sender, transactionId, roleId, nodes);
    }

    /// @inheritdoc IEntitlementChecker
    function requestEntitlementCheckV2(
        address walletAddress,
        bytes32 transactionId,
        uint256 requestId,
        bytes memory extraData
    ) external payable {
        address senderAddress = abi.decode(extraData, (address));
        _requestEntitlementCheck(
            walletAddress,
            transactionId,
            requestId,
            CurrencyTransfer.NATIVE_TOKEN,
            msg.value,
            senderAddress
        );
    }

    /// @inheritdoc IEntitlementChecker
    function requestEntitlementCheck(CheckType checkType, bytes calldata data) external payable {
        if (checkType == CheckType.V1) {
            if (msg.value != 0) EntitlementChecker_InvalidValue.selector.revertWith();
            (
                address walletAddress,
                bytes32 transactionId,
                uint256 roleId,
                address[] memory nodes
            ) = abi.decode(data, (address, bytes32, uint256, address[]));
            emit EntitlementCheckRequested(walletAddress, msg.sender, transactionId, roleId, nodes);
        } else if (checkType == CheckType.V2) {
            (
                address walletAddress,
                bytes32 transactionId,
                uint256 requestId,
                bytes memory extraData
            ) = abi.decode(data, (address, bytes32, uint256, bytes));
            address senderAddress = abi.decode(extraData, (address));
            _requestEntitlementCheck(
                walletAddress,
                transactionId,
                requestId,
                CurrencyTransfer.NATIVE_TOKEN,
                msg.value,
                senderAddress
            );
        } else if (checkType == CheckType.V3) {
            (
                address walletAddress,
                bytes32 transactionId,
                uint256 requestId,
                address currency,
                uint256 amount,
                address senderAddress
            ) = abi.decode(data, (address, bytes32, uint256, address, uint256, address));
            _requestEntitlementCheck(
                walletAddress,
                transactionId,
                requestId,
                currency,
                amount,
                senderAddress
            );
        } else {
            EntitlementChecker_InvalidCheckType.selector.revertWith();
        }
    }

    // =============================================================
    //                           Internal
    // =============================================================

    function _requestEntitlementCheck(
        address walletAddress,
        bytes32 transactionId,
        uint256 requestId,
        address currency,
        uint256 amount,
        address senderAddress
    ) internal {
        address space = msg.sender;

        XChainLib.Layout storage layout = XChainLib.layout();

        layout.requestsBySender[senderAddress].add(transactionId);

        // Only create the request if it doesn't exist yet
        XChainLib.Request storage request = layout.requests[transactionId];
        if (request.caller == address(0)) {
            request.caller = space;
            request.blockNumber = block.number;
            request.value = amount;
            request.receiver = walletAddress;
            request.currency = currency;

            if (currency == CurrencyTransfer.NATIVE_TOKEN) {
                if (amount != msg.value) EntitlementChecker_InvalidValue.selector.revertWith();
            } else {
                // ERC20: reject any ETH sent
                if (msg.value != 0) EntitlementChecker_InvalidValue.selector.revertWith();
                // ERC20: pull tokens from Space
                if (amount != 0) currency.safeTransferFrom(space, address(this), amount);
            }
        } else {
            // Request already exists from a previous requestId on this transactionId.
            // Escrow was established on the first request - reject any additional ETH
            // to prevent funds being sent but not tracked.
            if (msg.value != 0) EntitlementChecker_InvalidValue.selector.revertWith();
        }

        address[] memory randomNodes = _getRandomNodes(5);

        XChainLib.Check storage check = layout.checks[transactionId];

        if (!check.requestIds.add(requestId)) {
            EntitlementChecker_DuplicateRequestId.selector.revertWith();
        }

        for (uint256 i; i < randomNodes.length; ++i) {
            check.nodes[requestId].add(randomNodes[i]);
            check.votes[requestId].push(
                IEntitlementGatedBase.NodeVote({
                    node: randomNodes[i],
                    vote: IEntitlementGatedBase.NodeVoteStatus.NOT_VOTED
                })
            );
        }

        emit EntitlementCheckRequestedV2(
            walletAddress,
            space,
            address(this),
            transactionId,
            requestId,
            randomNodes
        );
    }

    /// @inheritdoc IEntitlementChecker
    function getNodesByOperator(address operator) external view returns (address[] memory nodes) {
        EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage.layout();
        uint256 totalNodeCount = layout.nodes.length();
        nodes = new address[](totalNodeCount);
        uint256 nodeCount;
        for (uint256 i; i < totalNodeCount; ++i) {
            address node = layout.nodes.at(i);
            if (layout.operatorByNode[node] == operator) {
                unchecked {
                    nodes[nodeCount++] = node;
                }
            }
        }
        assembly ("memory-safe") {
            mstore(nodes, nodeCount) // Update the length of the array
        }
    }

    // =============================================================
    //                           Internal
    // =============================================================
    function _getRandomNodes(uint256 count) internal view returns (address[] memory randomNodes) {
        EntitlementCheckerStorage.Layout storage layout = EntitlementCheckerStorage.layout();

        uint256 nodeCount = layout.nodes.length();

        if (count > nodeCount) {
            EntitlementChecker_InsufficientNumberOfNodes.selector.revertWith();
        }

        randomNodes = new address[](count);
        uint256[] memory indices = new uint256[](nodeCount);

        for (uint256 i; i < nodeCount; ++i) {
            indices[i] = i;
        }

        unchecked {
            for (uint256 i; i < count; ++i) {
                // Adjust random function to generate within range 0 to n-1
                uint256 rand = _pseudoRandom(i, nodeCount);
                randomNodes[i] = layout.nodes.at(indices[rand]);
                // Move the last element to the used slot and reduce the pool size
                indices[rand] = indices[--nodeCount];
            }
        }
    }

    // Generate a pseudo-random index based on a seed and the node count
    function _pseudoRandom(uint256 seed, uint256 nodeCount) internal view returns (uint256) {
        return
            uint256(keccak256(abi.encode(block.prevrandao, block.timestamp, seed, msg.sender))) %
            nodeCount;
    }
}
