//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

library Errors {
  error NameLengthInvalid();
  error NameContainsInvalidCharacters();
  error SpaceAlreadyRegistered();
  error NotSpaceOwner();
  error EntitlementAlreadyRegistered();
  error EntitlementModuleNotSupported();
  error DefaultEntitlementModuleNotSet();
}
