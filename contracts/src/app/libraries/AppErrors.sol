// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

library AppErrors {
  error InvalidPermission();
  error CallerNotOwner();
  error InvalidStatus();
  error InvalidStatusTransition();
  error InvalidAppAddress();
  error AlreadyRegistered();
  error NoStatusChange();
  error RegistrationDoesNotExist();
}
