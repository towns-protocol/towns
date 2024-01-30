// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {EIP712} from "contracts/src/diamond/utils/cryptography/EIP712.sol";

contract TownOwnerInit is EIP712 {
  function __TownOwnerInit_init(
    string memory name,
    string memory version
  ) external onlyInitializing {
    __EIP712_init(name, version);
  }
}
