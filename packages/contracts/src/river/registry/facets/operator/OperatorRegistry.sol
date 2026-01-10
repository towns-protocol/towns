// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IOperatorRegistry} from "./IOperatorRegistry.sol";

// libraries
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import {RiverRegistryErrors} from "src/river/registry/libraries/RegistryErrors.sol";
import {CustomRevert} from "src/utils/libraries/CustomRevert.sol";

// contracts
import {Facet} from "@towns-protocol/diamond/src/facets/Facet.sol";
import {OwnableBase} from "@towns-protocol/diamond/src/facets/ownable/OwnableBase.sol";
import {RegistryModifiers} from "src/river/registry/libraries/RegistryStorage.sol";

contract OperatorRegistry is IOperatorRegistry, RegistryModifiers, OwnableBase, Facet {
    using EnumerableSet for EnumerableSet.AddressSet;
    using CustomRevert for string;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ADMIN FUNCTIONS                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function __OperatorRegistry_init(
        address[] calldata initialOperators
    ) external onlyInitializing {
        for (uint256 i; i < initialOperators.length; ++i) {
            _approveOperator(initialOperators[i]);
        }
    }

    /// @inheritdoc IOperatorRegistry
    function approveOperator(address operator) external onlyOwner {
        _approveOperator(operator);
    }

    /// @inheritdoc IOperatorRegistry
    function removeOperator(address operator) external onlyOwner {
        if (!isOperator(operator)) {
            RiverRegistryErrors.OPERATOR_NOT_FOUND.revertWith();
        }

        uint256 length = ds.nodes.length();
        // verify that the operator has no nodes attached
        for (uint256 i; i < length; ++i) {
            if (ds.nodeByAddress[ds.nodes.at(i)].operator == operator) {
                RiverRegistryErrors.OUT_OF_BOUNDS.revertWith();
            }
        }

        ds.operators.remove(operator);

        emit OperatorRemoved(operator);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          GETTERS                           */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    /// @inheritdoc IOperatorRegistry
    function getAllOperators() external view returns (address[] memory) {
        return ds.operators.values();
    }

    /// @inheritdoc IOperatorRegistry
    function isOperator(address operator) public view returns (bool) {
        return ds.operators.contains(operator);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          INTERNAL                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function _approveOperator(address operator) internal {
        // Validate operator address
        if (operator == address(0)) RiverRegistryErrors.BAD_ARG.revertWith();

        if (isOperator(operator)) RiverRegistryErrors.ALREADY_EXISTS.revertWith();

        ds.operators.add(operator);

        emit OperatorAdded(operator);
    }
}
