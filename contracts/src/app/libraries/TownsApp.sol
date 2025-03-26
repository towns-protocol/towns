// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ITownsApp} from "../interfaces/ITownsApp.sol";

// libraries
import {Validator} from "contracts/src/utils/Validator.sol";
import {AppErrors} from "./AppErrors.sol";
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
// contracts

library TownsApp {
  using Validator for *;
  using CustomRevert for bytes4;

  function isValidApp(ITownsApp self, address owner) internal view {
    address app = address(self);
    app.checkAddress();

    if (msg.sender != owner) AppErrors.CallerNotOwner.selector.revertWith();

    if (app == owner)
      CustomRevert.revertWith(AppErrors.InvalidAppAddress.selector);

    if (app == address(this))
      CustomRevert.revertWith(AppErrors.InvalidAppAddress.selector);

    ITownsApp.Metadata memory metadata = self.metadata();
    metadata.name.checkMaxLength(32);
    metadata.symbol.checkMaxLength(6);
  }
}
