// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppHooks} from "contracts/src/app/interfaces/IAppHooks.sol";

// structs

// libraries
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {ParseBytes} from "contracts/src/utils/libraries/ParseBytes.sol";

// contracts
struct HookPermissions {
  bool beforeInitialize;
  bool afterInitialize;
  bool beforeRegister;
  bool afterRegister;
}

library HookManager {
  /// @notice Thrown if the address will not lead to the specified hook calls being called
  /// @param hooks The address of the hooks contract
  error HookAddressNotValid(address hooks);

  /// @notice Hook did not return its selector
  error InvalidHookResponse();

  /// @notice Additional context for ERC-7751 wrapped error when a hook call fails
  error HookCallFailed();

  /// @notice The hook's delta changed the swap from exactIn to exactOut or vice versa
  error HookDeltaExceedsSwapAmount();

  /// @notice Checks if a hook address is valid by verifying it implements the IAppHooks interface and has at least one permission enabled
  /// @param self The IAppHooks contract to validate
  /// @return bool True if the hook address is valid and has at least one permission enabled, false otherwise
  /// @dev This function attempts to call getHookPermissions() and verifies the hook has at least one permission flag set to true.
  /// If the call fails (e.g. contract doesn't exist or doesn't implement interface), returns false.
  function isValidHookAddress(IAppHooks self) internal view returns (bool) {
    // Zero address is considered valid as it represents no hooks
    if (address(self) == address(0)) return true;

    try self.getHookPermissions() returns (HookPermissions memory permissions) {
      // Hook must implement at least one permission
      return (permissions.beforeInitialize ||
        permissions.afterInitialize ||
        permissions.beforeRegister ||
        permissions.afterRegister);
    } catch {
      // If the call fails (e.g., contract doesn't exist or doesn't implement interface)
      return false;
    }
  }

  function validateHookPermissions(
    IAppHooks self,
    HookPermissions memory requiredPermissions
  ) internal view {
    HookPermissions memory hookPermissions = self.getHookPermissions();

    if (
      (requiredPermissions.beforeInitialize &&
        !hookPermissions.beforeInitialize) ||
      (requiredPermissions.afterInitialize &&
        !hookPermissions.afterInitialize) ||
      (requiredPermissions.beforeRegister && !hookPermissions.beforeRegister) ||
      (requiredPermissions.afterRegister && !hookPermissions.afterRegister)
    ) {
      CustomRevert.revertWith(HookAddressNotValid.selector, address(self));
    }
  }

  function beforeInitialize(IAppHooks self) internal {
    if (address(self) == address(0)) return;
    HookPermissions memory permissions = self.getHookPermissions();
    if (permissions.beforeInitialize) {
      callHook(
        self,
        abi.encodeWithSelector(IAppHooks.beforeInitialize.selector, msg.sender)
      );
    }
  }

  function afterInitialize(IAppHooks self) internal {
    if (address(self) == address(0)) return;
    HookPermissions memory permissions = self.getHookPermissions();
    if (permissions.afterInitialize) {
      callHook(
        self,
        abi.encodeWithSelector(IAppHooks.afterInitialize.selector, msg.sender)
      );
    }
  }

  function beforeRegister(IAppHooks self) internal {
    HookPermissions memory permissions = self.getHookPermissions();
    if (permissions.beforeRegister) {
      callHook(
        self,
        abi.encodeWithSelector(IAppHooks.beforeRegister.selector, msg.sender)
      );
    }
  }

  function afterRegister(IAppHooks self) internal {
    HookPermissions memory permissions = self.getHookPermissions();
    if (permissions.afterRegister) {
      callHook(
        self,
        abi.encodeWithSelector(IAppHooks.afterRegister.selector, msg.sender)
      );
    }
  }

  function callHook(
    IAppHooks self,
    bytes memory data
  ) internal returns (bytes memory result) {
    bool success;
    assembly ("memory-safe") {
      success := call(gas(), self, 0, add(data, 0x20), mload(data), 0, 0)
    }

    // Revert with FailedHookCall, containing any error message to bubble up
    if (!success)
      CustomRevert.bubbleUpAndRevertWith(
        address(self),
        bytes4(data),
        HookCallFailed.selector
      );

    // The call was successful, fetch the returned data
    assembly ("memory-safe") {
      // allocate result byte array from the free memory pointer
      result := mload(0x40)
      // store new free memory pointer at the end of the array padded to 32 bytes
      mstore(0x40, add(result, and(add(returndatasize(), 0x3f), not(0x1f))))
      // store length in memory
      mstore(result, returndatasize())
      // copy return data to result
      returndatacopy(add(result, 0x20), 0, returndatasize())
    }

    // Length must be at least 32 to contain the selector. Check expected selector and returned selector match.
    if (
      result.length < 32 ||
      ParseBytes.parseSelector(result) != ParseBytes.parseSelector(data)
    ) {
      CustomRevert.revertWith(InvalidHookResponse.selector);
    }
  }

  function hasPermission(
    IAppHooks self,
    uint160 flag
  ) internal pure returns (bool) {
    return uint160(address(self)) & flag != 0;
  }
}
