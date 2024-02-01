// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";
import {INodeOperator} from "./INodeOperator.sol";

contract NodeOperatorFacet is INodeOperator, ERC721A {
  function __NodeOperator_init() external onlyInitializing {
    __ERC721A_init_unchained("Operator", "OPR");
  }

  /// @inheritdoc INodeOperator
  function registerOperator(address operator) external {
    if (operator == address(0)) revert NodeOperator__InvalidAddress();
    if (_balanceOf(operator) > 0) revert NodeOperator__AlreadyOperator();
    _mint(operator, 1);
  }

  // =============================================================
  //                           Overrides
  // =============================================================
  function _beforeTokenTransfers(
    address from,
    address,
    uint256,
    uint256
  ) internal pure override {
    if (from != address(0)) revert NodeOperator__NotTransferable();
  }
}
