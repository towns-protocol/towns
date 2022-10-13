//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

library Errors {
  error InvalidParameters();
  error NameLengthInvalid();
  error NameContainsInvalidCharacters();
  error SpaceAlreadyRegistered();
  error NotSpaceOwner();
  error NotSpaceManager();
  error EntitlementAlreadyWhitelisted();
  error EntitlementModuleNotSupported();
  error EntitlementNotWhitelisted();
  error DefaultEntitlementModuleNotSet();
  error DefaultPermissionsManagerNotSet();
  error SpaceDoesNotExist();
  error PermissionAlreadyExists();
  error NotAllowed();
}
