// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IPrepayBase} from "./IPrepay.sol";

// libraries
import {PrepayStorage} from "./PrepayStorage.sol";

// contracts

abstract contract PrepayBase is IPrepayBase {
  function _prepay(address membership, uint256 supply) internal {
    PrepayStorage.Layout storage ds = PrepayStorage.layout();
    ds.supplyByAddress[membership] = supply;
    emit PrepayBase__Prepaid(membership, supply);
  }

  function _getPrepaidSupply(
    address membership
  ) internal view returns (uint256) {
    return PrepayStorage.layout().supplyByAddress[membership];
  }
}
