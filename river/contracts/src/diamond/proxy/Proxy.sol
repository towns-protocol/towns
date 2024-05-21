// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IProxy} from "./IProxy.sol";

// libraries
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

// contracts

abstract contract Proxy is IProxy {
  fallback() external payable {
    _fallback();
  }

  function _fallback() internal {
    address facet = _getImplementation();

    if (facet.code.length == 0) revert Proxy__ImplementationIsNotContract();

    // solhint-disable-next-line no-inline-assembly
    assembly {
      calldatacopy(0, 0, calldatasize())
      let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
      returndatacopy(0, 0, returndatasize())

      switch result
      case 0 {
        revert(0, returndatasize())
      }
      default {
        return(0, returndatasize())
      }
    }
  }

  function _getImplementation() internal virtual returns (address);
}
