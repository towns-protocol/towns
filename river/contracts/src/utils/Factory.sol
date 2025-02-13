// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {LibClone} from "solady/utils/LibClone.sol";

/**
 * @title Factory for arbitrary code deployment using the "CREATE" and "CREATE2" opcodes
 */
library Factory {
  error Factory__FailedDeployment();

  /**
   * @notice deploy contract code using "CREATE" opcode
   * @param initCode contract initialization code
   * @return deployment address of deployed contract
   */
  function deploy(bytes memory initCode) internal returns (address deployment) {
    assembly ("memory-safe") {
      let encoded_data := add(0x20, initCode)
      let encoded_size := mload(initCode)
      deployment := create(0, encoded_data, encoded_size)
      if iszero(deployment) {
        mstore(0, 0xef35ca19) // revert Factory__FailedDeployment()
        revert(0x1c, 0x04)
      }
    }
  }

  /**
   * @notice deploy contract code using "CREATE2" opcode
   * @dev reverts if deployment is not successful (likely because salt has already been used)
   * @param initCode contract initialization code
   * @param salt input for deterministic address calculation
   * @return deployment address of deployed contract
   */
  function deploy(
    bytes memory initCode,
    bytes32 salt
  ) internal returns (address deployment) {
    assembly ("memory-safe") {
      let encoded_data := add(0x20, initCode)
      let encoded_size := mload(initCode)
      deployment := create2(0, encoded_data, encoded_size, salt)
      if iszero(deployment) {
        mstore(0, 0xef35ca19) // revert Factory__FailedDeployment()
        revert(0x1c, 0x04)
      }
    }
  }

  /**
   * @notice calculate the _deployMetamorphicContract deployment address for a given salt
   * @param initCodeHash hash of contract initialization code
   * @param salt input for deterministic address calculation
   * @return deployment deployment address
   */
  function calculateDeploymentAddress(
    bytes32 initCodeHash,
    bytes32 salt
  ) internal view returns (address deployment) {
    deployment = LibClone.predictDeterministicAddress(
      initCodeHash,
      salt,
      address(this)
    );
    assembly {
      // clean the upper 96 bits
      deployment := and(deployment, 0xffffffffffffffffffffffffffffffffffffffff)
    }
  }
}
