// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

// interfaces

// libraries
import {ERC721AStorage} from "./ERC721AStorage.sol";

// contracts

library ERC721AService {
  function setName(string memory name) internal {
    ERC721AStorage.layout()._name = name;
  }

  function setSymbol(string memory symbol) internal {
    ERC721AStorage.layout()._symbol = symbol;
  }
}
