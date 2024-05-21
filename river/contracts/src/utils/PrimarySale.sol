// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces
import {IPrimarySale} from "contracts/src/utils/interfaces/IPrimarySale.sol";

abstract contract PrimarySale is IPrimarySale {
  /// @dev The address that receives the primary sales value.
  address private recipient;

  /// @inheritdoc IPrimarySale
  function primarySaleRecipient() public view override returns (address) {
    return recipient;
  }

  /// @inheritdoc IPrimarySale
  function setPrimarySaleRecipient(address _recipient) external override {
    if (!_canSetPrimarySaleRecipient()) {
      revert("PrimarySale: Not authorized");
    }

    _setPrimarySaleRecipient(_recipient);
  }

  function _setPrimarySaleRecipient(address _recipient) internal {
    recipient = _recipient;
    emit PrimarySaleRecipientUpdated(_recipient);
  }

  function _canSetPrimarySaleRecipient() internal view virtual returns (bool);
}
