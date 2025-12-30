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
    using EnumerableSet for EnumerableSet.Bytes32Set;
    using EnumerableSet for EnumerableSet.UintSet;
    using CustomRevert for bytes4;
    using SafeTransferLib for address;

    function __EntitlementChecker_init() external onlyInitializing {
        _addInterface(type(IEntitlementChecker).interfaceId);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        MODIFIERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    modifier onlyNodeOperator(address node) {
        EntitlementCheckerStorage.Layout storage $ = EntitlementCheckerStorage.layout();

        if (msg.sender != $.operatorByNode[node]) {
            EntitlementChecker_InvalidNodeOperator.selector.revertWith();
        }
        _;
    }

    modifier onlyRegisteredApprovedOperator() {
        NodeOperatorStorage.Layout storage nodeOperatorLayout = NodeOperatorStorage.layout();

        if (!nodeOperatorLayout.operators.contains(msg.sender)) {
            EntitlementChecker_InvalidOperator.selector.revertWith();
        }
        if (nodeOperatorLayout.statusByOperator[msg.sender] != NodeOperatorStatus.Approved) {
            EntitlementChecker_OperatorNotActive.selector.revertWith();
        }
        _;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IEntitlementChecker
    function registerNode(address node) external onlyRegisteredApprovedOperator {
        EntitlementCheckerStorage.Layout storage $ = EntitlementCheckerStorage.layout();

        if ($.nodes.contains(node)) {
            EntitlementChecker_NodeAlreadyRegistered.selector.revertWith();
        }

        $.nodes.add(node);
        $.operatorByNode[node] = msg.sender;

        emit NodeRegistered(node);
    }

    /// @inheritdoc IEntitlementChecker
    function unregisterNode(address node) external onlyNodeOperator(node) {
        EntitlementCheckerStorage.Layout storage $ = EntitlementCheckerStorage.layout();

        if (!$.nodes.contains(node)) {
            EntitlementChecker_NodeNotRegistered.selector.revertWith();
        }

        $.nodes.remove(node);
        delete $.operatorByNode[node];

        emit NodeUnregistered(node);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         ENTITLEMENT                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IEntitlementChecker
    function requestEntitlementCheck(
        address receiver,
        bytes32 transactionId,
        uint256 roleId,
        address[] memory nodes
    ) external {
        emit EntitlementCheckRequested(receiver, msg.sender, transactionId, roleId, nodes);
    }

    /// @inheritdoc IEntitlementChecker
    function requestEntitlementCheckV2(
        address receiver,
        bytes32 transactionId,
        uint256 requestId,
        bytes memory extraData
    ) external payable {
        address sender = abi.decode(extraData, (address));
        _requestEntitlementCheck(
            receiver,
            transactionId,
            requestId,
            CurrencyTransfer.NATIVE_TOKEN,
            msg.value,
            sender
        );
    }

    /// @inheritdoc IEntitlementChecker
    function requestEntitlementCheck(CheckType checkType, bytes calldata data) external payable {
        if (checkType == CheckType.V1) {
            if (msg.value != 0) EntitlementChecker_InvalidValue.selector.revertWith();
            (address receiver, bytes32 transactionId, uint256 roleId, address[] memory nodes) = abi
                .decode(data, (address, bytes32, uint256, address[]));
            emit EntitlementCheckRequested(receiver, msg.sender, transactionId, roleId, nodes);
        } else if (checkType == CheckType.V2) {
            (
                address receiver,
                bytes32 transactionId,
                uint256 requestId,
                bytes memory extraData
            ) = abi.decode(data, (address, bytes32, uint256, bytes));
            address sender = abi.decode(extraData, (address));
            _requestEntitlementCheck(
                receiver,
                transactionId,
                requestId,
                CurrencyTransfer.NATIVE_TOKEN,
                msg.value,
                sender
            );
        } else if (checkType == CheckType.V3) {
            (
                address receiver,
                bytes32 transactionId,
                uint256 requestId,
                address currency,
                uint256 amount,
                address sender
            ) = abi.decode(data, (address, bytes32, uint256, address, uint256, address));
            _requestEntitlementCheck(receiver, transactionId, requestId, currency, amount, sender);
        } else {
            EntitlementChecker_InvalidCheckType.selector.revertWith();
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IEntitlementChecker
    function isValidNode(address node) external view returns (bool) {
        return EntitlementCheckerStorage.layout().nodes.contains(node);
    }

    /// @inheritdoc IEntitlementChecker
    function getNodeCount() external view returns (uint256) {
        return EntitlementCheckerStorage.layout().nodes.length();
    }

    /// @inheritdoc IEntitlementChecker
    function getNodeAtIndex(uint256 index) external view returns (address) {
        EntitlementCheckerStorage.Layout storage $ = EntitlementCheckerStorage.layout();

        require(index < $.nodes.length(), "Index out of bounds");
        return $.nodes.at(index);
    }

    /// @inheritdoc IEntitlementChecker
    function getRandomNodes(uint256 count) external view returns (address[] memory) {
        return _getRandomNodes(count);
    }

    /// @inheritdoc IEntitlementChecker
    function getNodesByOperator(address operator) external view returns (address[] memory nodes) {
        EntitlementCheckerStorage.Layout storage $ = EntitlementCheckerStorage.layout();
        address[] memory allNodes = $.nodes.values();
        uint256 totalNodeCount = allNodes.length;
        nodes = new address[](totalNodeCount);
        uint256 nodeCount;
        for (uint256 i; i < totalNodeCount; ++i) {
            address node = allNodes[i];
            if ($.operatorByNode[node] == operator) {
                unchecked {
                    nodes[nodeCount++] = node;
                }
            }
        }
        assembly ("memory-safe") {
            mstore(nodes, nodeCount)
        }
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          INTERNAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _requestEntitlementCheck(
        address receiver,
        bytes32 transactionId,
        uint256 requestId,
        address currency,
        uint256 amount,
        address sender
    ) internal {
        address space = msg.sender;

        XChainLib.Layout storage layout = XChainLib.layout();

        layout.requestsBySender[sender].add(transactionId);

        // Only create the request if it doesn't exist yet
        XChainLib.Request storage request = layout.requests[transactionId];
        if (request.caller == address(0)) {
            request.caller = space;
            request.blockNumber = block.number;
            request.value = amount;
            request.receiver = receiver;
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
            receiver,
            space,
            address(this),
            transactionId,
            requestId,
            randomNodes
        );
    }

    function _getRandomNodes(uint256 count) internal view returns (address[] memory randomNodes) {
        EntitlementCheckerStorage.Layout storage $ = EntitlementCheckerStorage.layout();

        uint256 nodeCount = $.nodes.length();

        if (count > nodeCount) EntitlementChecker_InsufficientNumberOfNodes.selector.revertWith();

        randomNodes = new address[](count);
        uint256[] memory indices = new uint256[](nodeCount);

        for (uint256 i; i < nodeCount; ++i) {
            indices[i] = i;
        }

        unchecked {
            for (uint256 i; i < count; ++i) {
                // Adjust random function to generate within range 0 to n-1
                uint256 rand = _pseudoRandom(i, nodeCount);
                randomNodes[i] = $.nodes.at(indices[rand]);
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
