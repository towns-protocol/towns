// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPrepayBase} from "./IPrepay.sol";

// libraries
import {PrepayStorage} from "./PrepayStorage.sol";

// contracts

abstract contract PrepayBase is IPrepayBase {
  function _addPrepay(uint256 supply) internal {
    PrepayStorage.Layout storage ds = PrepayStorage.layout();
    ds.supply += supply;
    emit Prepay__Prepaid(supply);
  }

  function _reducePrepay(uint256 supply) internal {
    PrepayStorage.Layout storage ds = PrepayStorage.layout();
    ds.supply -= supply;
  }

  function _getPrepaidSupply() internal view returns (uint256) {
    return PrepayStorage.layout().supply;
  }
}
