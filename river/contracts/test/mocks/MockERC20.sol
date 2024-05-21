// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces

// libraries

// contracts
import {ERC20} from "contracts/src/diamond/facets/token/ERC20/ERC20.sol";
import {IntrospectionFacet} from "contracts/src/diamond/facets/introspection/IntrospectionFacet.sol";

contract MockERC20 is ERC20, IntrospectionFacet {
  constructor(string memory name, string memory symbol) {
    __ERC20_init_unchained(name, symbol, 18);
  }

  function mint(address account, uint256 amount) public {
    _mint(account, amount);
  }
}
