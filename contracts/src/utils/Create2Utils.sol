// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {LibClone} from "solady/utils/LibClone.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";

library Create2Utils {
  address internal constant CREATE2_FACTORY =
    0x4e59b44847b379578588920cA78FbF26c0B4956C;

  error MissingCreate2Factory();
  error Create2AddressDerivationFailed();
  error Create2CallFailed();

  function create2Deploy(
    bytes32 salt,
    bytes memory bytecode
  ) internal returns (address) {
    if (!isContractDeployed(CREATE2_FACTORY)) {
      CustomRevert.revertWith(MissingCreate2Factory.selector);
    }

    address computed = computeCreate2Address(salt, bytecode);

    if (isContractDeployed(computed)) {
      return computed;
    } else {
      address deployedAt = performCreate2Call(salt, bytecode);
      if (deployedAt != computed) {
        CustomRevert.revertWith(Create2AddressDerivationFailed.selector);
      }
      return deployedAt;
    }
  }

  function isContractDeployed(
    address addr
  ) internal view returns (bool isContract) {
    assembly ("memory-safe") {
      isContract := gt(extcodesize(addr), 0)
    }
  }

  function computeCreate2Address(
    bytes32 salt,
    bytes memory bytecode
  ) internal pure returns (address) {
    return
      LibClone.predictDeterministicAddress(
        keccak256(bytecode),
        salt,
        CREATE2_FACTORY
      );
  }

  function performCreate2Call(
    bytes32 salt,
    bytes memory bytecode
  ) internal returns (address deployedAt) {
    bytes memory data = abi.encodePacked(salt, bytecode);

    assembly ("memory-safe") {
      // If call failed, revert with empty data
      if iszero(
        call(
          gas(), // Forward all available gas
          CREATE2_FACTORY, // Address of the CREATE2 factory
          0, // No ETH value
          add(data, 0x20), // Pointer to data (skip length prefix)
          mload(data), // Data size
          0, // Output location
          0x20 // Output size (32 bytes)
        )
      ) {
        // Inline revert with empty data
        revert(0, 0)
      }
      deployedAt := shr(96, mload(0))
    }

    if (deployedAt == address(0)) {
      CustomRevert.revertWith(Create2CallFailed.selector);
    }
  }
}
