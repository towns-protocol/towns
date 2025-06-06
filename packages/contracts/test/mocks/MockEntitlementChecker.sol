// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {INodeOperator} from "src/base/registry/facets/operator/INodeOperator.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

// contracts

import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {EntitlementChecker} from "src/base/registry/facets/checker/EntitlementChecker.sol";
import {NodeOperatorFacet} from "src/base/registry/facets/operator/NodeOperatorFacet.sol";
import {NodeOperatorStatus, NodeOperatorStorage} from "src/base/registry/facets/operator/NodeOperatorStorage.sol";
import {XChain} from "src/base/registry/facets/xchain/XChain.sol";

contract MockEntitlementChecker is OwnableBase, NodeOperatorFacet, EntitlementChecker, XChain {
    using EnumerableSet for EnumerableSet.AddressSet;

    // =============================================================
    //                           Constructor
    // =============================================================
    // Constructor is used for tests that deploy contract directly
    // since owner is not set in this case.
    // Regular deployment scripts pass empty array to the constructor.
    constructor(address[] memory approvedOperators) {
        _transferOwnership(msg.sender);
        _addInterface(type(INodeOperator).interfaceId);
        _mint(msg.sender, 1);

        NodeOperatorStorage.Layout storage ds = NodeOperatorStorage.layout();

        for (uint256 i = 0; i < approvedOperators.length; ++i) {
            ds.operators.add(approvedOperators[i]);
            ds.statusByOperator[approvedOperators[i]] = NodeOperatorStatus.Approved;
            ds.claimerByOperator[approvedOperators[i]] = msg.sender;
            ds.operatorsByClaimer[msg.sender].add(approvedOperators[i]);

            emit OperatorRegistered(approvedOperators[i]);
        }
    }
}
