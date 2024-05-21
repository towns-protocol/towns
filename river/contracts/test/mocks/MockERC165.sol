// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces

// libraries

// contracts
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract MockERC165 is Ownable, ERC165 {
  constructor() Ownable(msg.sender) {}

  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC165) returns (bool) {
    return interfaceId == 0x00000000;
  }
}
