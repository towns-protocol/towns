// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IERC165} from "./IERC165.sol";

// libraries

// contracts
import {IntrospectionBase} from "./IntrospectionBase.sol";

abstract contract ERC165 is IntrospectionBase, IERC165 {
  /// @inheritdoc IERC165
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override returns (bool) {
    return _supportsInterface(interfaceId);
  }
}
