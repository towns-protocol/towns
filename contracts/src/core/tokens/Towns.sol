// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.19;

//contracts
import {ERC20Base} from "contracts/src/core/base/ERC20Base.sol";

contract Towns is ERC20Base {
  constructor(
    string memory name,
    string memory symbol
  ) ERC20Base(name, symbol) {}
}
