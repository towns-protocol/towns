// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IRiverBase} from "contracts/src/tokens/interfaces/IRiverBase.sol";

// libraries

// contracts

interface IRiver is IRiverBase {
  function createInflation(address to) external;
}
