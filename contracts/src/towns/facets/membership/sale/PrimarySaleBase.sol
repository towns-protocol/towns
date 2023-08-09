// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IPrimarySaleBase} from "./IPrimarySale.sol";

// libraries
import {PrimarySaleStorage} from "./PrimarySaleStorage.sol";

// contracts

contract PrimarySaleBase is IPrimarySaleBase {
  function _primarySaleRecipient() internal view returns (address) {
    return PrimarySaleStorage.layout().primarySaleRecipient;
  }

  function _setPrimarySaleRecipient(address recipient) internal {
    if (recipient == address(0)) revert PrimarySaleRecipient__InvalidAddress();

    PrimarySaleStorage.layout().primarySaleRecipient = recipient;
    emit PrimarySaleRecipientUpdated(recipient);
  }
}
