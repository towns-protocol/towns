// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {LibClone} from "solady/utils/LibClone.sol";

/// @title Factory for arbitrary code deployment using the "CREATE" and "CREATE2" opcodes
library Factory {
    /// @notice Emitted when deployment fails
    /// @param revertData Nested revert data
    error Factory__FailedDeployment(bytes revertData);

    /// @notice deploy contract code using "CREATE" opcode
    /// @param initCode contract initialization code
    /// @return deployment address of deployed contract
    function deploy(bytes memory initCode) internal returns (address deployment) {
        assembly ("memory-safe") {
            deployment := create(0, add(initCode, 0x20), mload(initCode))
            if iszero(deployment) {
                // revert Factory__FailedDeployment(revertData)
                mstore(0, 0x2b1c2246)
                mstore(0x20, 0x20)
                mstore(0x40, returndatasize())
                returndatacopy(0x60, 0, returndatasize())
                // round up to nearest 32 bytes
                let rounded_len := and(not(0x1f), add(0x1f, returndatasize()))
                revert(0x1c, add(0x44, rounded_len))
            }
        }
    }

    /// @notice deploy contract code using "CREATE2" opcode
    /// @dev reverts if deployment is not successful (likely because salt has already been used)
    /// @param initCode contract initialization code
    /// @param salt input for deterministic address calculation
    /// @return deployment address of deployed contract
    function deploy(bytes memory initCode, bytes32 salt) internal returns (address deployment) {
        assembly ("memory-safe") {
            deployment := create2(0, add(initCode, 0x20), mload(initCode), salt)
            if iszero(deployment) {
                // revert Factory__FailedDeployment(revertData)
                mstore(0, 0x2b1c2246)
                mstore(0x20, 0x20)
                mstore(0x40, returndatasize())
                returndatacopy(0x60, 0, returndatasize())
                // round up to nearest 32 bytes
                let rounded_len := and(not(0x1f), add(0x1f, returndatasize()))
                revert(0x1c, add(0x44, rounded_len))
            }
        }
    }

    /// @notice calculate the _deployMetamorphicContract deployment address for a given salt
    /// @param initCodeHash hash of contract initialization code
    /// @param salt input for deterministic address calculation
    /// @return deployment deployment address
    function calculateDeploymentAddress(
        bytes32 initCodeHash,
        bytes32 salt
    ) internal view returns (address deployment) {
        deployment = LibClone.predictDeterministicAddress(initCodeHash, salt, address(this));
        assembly {
            // clean the upper 96 bits
            deployment := and(deployment, 0xffffffffffffffffffffffffffffffffffffffff)
        }
    }
}
