// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {Diamond} from "contracts/src/diamond/Diamond.sol";

contract SpaceFactory is Diamond {
  constructor(Diamond.InitParams memory initParams) Diamond(initParams) {}
}
