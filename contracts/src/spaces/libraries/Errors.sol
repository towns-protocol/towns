//SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.20;

library Errors {
  error InvalidParameters();
  error NameLengthInvalid();
  error NameContainsInvalidCharacters();
  error SpaceAlreadyRegistered();
  error ChannelAlreadyRegistered();
  error NotSpaceOwner();
  error NotSpaceManager();
  error EntitlementNotFound();
  error AddressNotFound();
  error QuantityNotFound();
  error EntitlementAlreadyWhitelisted();
  error EntitlementModuleNotSupported();
  error EntitlementNotWhitelisted();
  error EntitlementAlreadyExists();
  error DefaultEntitlementModuleNotSet();
  error SpaceNFTNotSet();
  error RoleIsAssignedToEntitlement();
  error DefaultPermissionsManagerNotSet();
  error SpaceDoesNotExist();
  error ChannelDoesNotExist();
  error PermissionAlreadyExists();
  error NotAllowed();
  error MissingOwnerPermission();
  error RoleDoesNotExist();
  error RoleAlreadyExists();
  error AddRoleFailed();
}
