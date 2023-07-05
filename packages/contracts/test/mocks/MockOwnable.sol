// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries

// contracts
import {Ownable} from "contracts/src/diamond/facets/ownable/Ownable.sol";

contract MockOwnable is Ownable {
  function init() external {
    __Ownable_init();
  }
}
