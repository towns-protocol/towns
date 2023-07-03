// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

// interfaces

// libraries

// contracts
import {ERC20Base} from "contracts/src/tokens/base/ERC20Base.sol";

contract MockERC20 is ERC20Base {
  constructor(
    string memory name,
    string memory symbol
  ) ERC20Base(name, symbol) {}

  function mint(address account, uint256 amount) public {
    _mint(account, amount);
  }
}
