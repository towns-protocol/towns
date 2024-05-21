// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IGuardianBase} from "./IGuardian.sol";

// libraries
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {GuardianStorage} from "./GuardianStorage.sol";

abstract contract GuardianBase is IGuardianBase {
  modifier onlyEOA() {
    if (msg.sender.code.length > 0) {
      revert NotExternalAccount();
    }
    _;
  }

  function _setDefaultCooldown(uint256 cooldown) internal {
    GuardianStorage.layout().defaultCooldown = cooldown;
  }

  /**
   * @notice Enables a guardian
   * @param guardian The guardian address
   */
  function _enableGuardian(address guardian) internal {
    GuardianStorage.Layout storage ds = GuardianStorage.layout();

    if (ds.cooldownByAddress[guardian] == 0) {
      revert AlreadyEnabled();
    }

    ds.cooldownByAddress[guardian] = 0;

    emit GuardianUpdated(guardian, true, 0, block.timestamp);
  }

  /**
   * @notice Disables a guardian
   * @param guardian The guardian address
   */
  function _disableGuardian(address guardian) internal {
    GuardianStorage.Layout storage ds = GuardianStorage.layout();

    if (ds.cooldownByAddress[guardian] != 0) {
      revert AlreadyDisabled();
    }

    ds.cooldownByAddress[guardian] = block.timestamp + ds.defaultCooldown;

    emit GuardianUpdated(
      guardian,
      false,
      block.timestamp + ds.defaultCooldown,
      block.timestamp
    );
  }

  function _guardianCooldown(address guardian) internal view returns (uint256) {
    return GuardianStorage.layout().cooldownByAddress[guardian];
  }

  /**
   * @notice Returns true if the guardian is enabled
   * @param guardian The guardian address
   * @return True if the guardian is enabled
   */
  function _guardianEnabled(address guardian) internal view returns (bool) {
    GuardianStorage.Layout storage ds = GuardianStorage.layout();

    // guardian is enabled if it is not a contract and
    // - it has no cooldown or
    // - it has a cooldown but it has not passed yet
    return
      guardian.code.length == 0 &&
      (ds.cooldownByAddress[guardian] == 0 ||
        block.timestamp < ds.cooldownByAddress[guardian]);
  }
}
