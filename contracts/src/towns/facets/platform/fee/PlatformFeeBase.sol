// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

// interfaces
import {IPlatformFeeBase} from "./IPlatformFee.sol";

// libraries
import {PlatformFeeStorage} from "./PlatformFeeStorage.sol";

// contracts

abstract contract PlatformFeeBase is IPlatformFeeBase {
  using PlatformFeeStorage for PlatformFeeStorage.Layout;

  function _getPlatformFee()
    internal
    view
    returns (address recipient, uint16 basisPoints, uint256 flatFee)
  {
    PlatformFeeStorage.Layout storage ds = PlatformFeeStorage.layout();

    recipient = ds.recipient;
    basisPoints = ds.basisPoints;
    flatFee = ds.flatFee;
  }

  function _getPlatformFeeDenominator()
    internal
    pure
    virtual
    returns (uint256)
  {
    return 10_000;
  }

  function _setPlatformFeeRecipient(address recipient) internal {
    if (recipient == address(0)) revert InvalidPlatformFeeRecipient();

    PlatformFeeStorage.layout().recipient = recipient;
  }

  function _setPlatformFee(uint16 basisPoints, uint256 flatFee) internal {
    if (basisPoints > _getPlatformFeeDenominator()) revert InvalidPlatformFee();
    PlatformFeeStorage.Layout storage ds = PlatformFeeStorage.layout();
    ds.basisPoints = basisPoints;
    ds.flatFee = flatFee;
  }
}
