// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IERC165} from "openzeppelin-contracts/contracts/utils/introspection/IERC165.sol";

// libraries

// contracts
import {IntrospectionBase} from "./IntrospectionBase.sol";
import {Facet} from "../Facet.sol";

contract IntrospectionFacet is IntrospectionBase, IERC165, Facet {
  function __Introspection_init() external virtual onlyInitializing {
    _addInterface(type(IERC165).interfaceId);
  }

  /// @inheritdoc IERC165
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override returns (bool) {
    return _supportsInterface(interfaceId);
  }
}
