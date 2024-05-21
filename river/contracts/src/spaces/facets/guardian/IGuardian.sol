// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces

// libraries

// contracts

interface IGuardianBase {
  error GuardianEnabled();

  error AlreadyEnabled();
  error AlreadyDisabled();
  error NotExternalAccount();

  event GuardianUpdated(
    address indexed caller,
    bool indexed enabled,
    uint256 cooldown,
    uint256 timestamp
  );
}

interface IGuardian is IGuardianBase {
  function enableGuardian() external;

  function disableGuardian() external;

  function guardianCooldown(address guardian) external view returns (uint256);

  function isGuardianEnabled(address guardian) external view returns (bool);
}
