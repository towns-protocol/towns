// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IAppHooks, IAppHooksBase} from "contracts/src/app/interfaces/IAppHooks.sol";

// structs

// libraries
import {CustomRevert} from "contracts/src/utils/libraries/CustomRevert.sol";
import {ParseBytes} from "contracts/src/utils/libraries/ParseBytes.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";
import {LibCall} from "solady/utils/LibCall.sol";

// contracts
struct HookPermissions {
  bool beforeRegister;
  bool afterRegister;
  bool beforeInstall;
  bool afterInstall;
  bool beforeUninstall;
  bool afterUninstall;
}

library HooksManager {
  // Add gas limit for hook calls
  uint256 private constant HOOK_GAS_LIMIT = 100000;

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
    try self.getHookPermissions() returns (HookPermissions memory permissions) {
      // Hook must implement at least one permission
      return (permissions.beforeRegister ||
        permissions.afterRegister ||
        permissions.beforeInstall ||
        permissions.afterInstall ||
        permissions.beforeUninstall ||
        permissions.afterUninstall);
    } catch {
      // If the call fails (e.g., contract doesn't exist or doesn't implement interface)
      return false;
    }
  }

  function validateHookAddress(IAppHooks self) internal view {
    if (address(self) == address(0)) return;
    if (!isValidHookAddress(self))
      CustomRevert.revertWith(HookAddressNotValid.selector, address(self));
  }

  function validateHookPermissions(
    IAppHooks self,
    HookPermissions memory requiredPermissions
  ) internal view {
    HookPermissions memory hookPermissions = self.getHookPermissions();

    if (
      (requiredPermissions.beforeRegister && !hookPermissions.beforeRegister) ||
      (requiredPermissions.afterRegister && !hookPermissions.afterRegister) ||
      (requiredPermissions.beforeInstall && !hookPermissions.beforeInstall) ||
      (requiredPermissions.afterInstall && !hookPermissions.afterInstall) ||
      (requiredPermissions.beforeUninstall &&
        !hookPermissions.beforeUninstall) ||
      (requiredPermissions.afterUninstall && !hookPermissions.afterUninstall)
    ) {
      CustomRevert.revertWith(HookAddressNotValid.selector, address(self));
    }
  }

  function beforeRegister(IAppHooks self) internal {
    if (address(self) == address(0)) return;

    HookPermissions memory permissions = self.getHookPermissions();
    if (permissions.beforeRegister) {
      callHook(
        self,
        abi.encodeWithSelector(IAppHooks.beforeRegister.selector, msg.sender)
      );
    }
  }

  function afterRegister(IAppHooks self) internal {
    if (address(self) == address(0)) return;

    HookPermissions memory permissions = self.getHookPermissions();
    if (permissions.afterRegister) {
      callHook(
        self,
        abi.encodeWithSelector(IAppHooks.afterRegister.selector, msg.sender)
      );
    }
  }

  function beforeInstall(IAppHooks self) internal {
    if (address(self) == address(0)) return;

    HookPermissions memory permissions = self.getHookPermissions();
    if (permissions.beforeInstall) {
      callHook(
        self,
        abi.encodeWithSelector(IAppHooks.beforeInstall.selector, msg.sender)
      );
    }
  }

  function afterInstall(IAppHooks self) internal {
    if (address(self) == address(0)) return;

    HookPermissions memory permissions = self.getHookPermissions();
    if (permissions.afterInstall) {
      callHook(
        self,
        abi.encodeWithSelector(IAppHooks.afterInstall.selector, msg.sender)
      );
    }
  }

  function beforeUninstall(IAppHooks self) internal {
    if (address(self) == address(0)) return;

    HookPermissions memory permissions = self.getHookPermissions();
    if (permissions.beforeUninstall) {
      callHook(
        self,
        abi.encodeWithSelector(IAppHooks.beforeUninstall.selector, msg.sender)
      );
    }
  }

  function afterUninstall(IAppHooks self) internal {
    if (address(self) == address(0)) return;

    HookPermissions memory permissions = self.getHookPermissions();
    if (permissions.afterUninstall) {
      callHook(
        self,
        abi.encodeWithSelector(IAppHooks.afterUninstall.selector, msg.sender)
      );
    }
  }

  function callHook(
    IAppHooks self,
    bytes memory data
  ) internal returns (bytes memory result) {
    bool success;
    uint256 gasLimit = FixedPointMathLib.min(gasleft() - 2000, HOOK_GAS_LIMIT);

    (success, , result) = LibCall.tryCall(
      address(self),
      0,
      gasLimit,
      type(uint16).max,
      data
    );

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

    bytes4 selector = ParseBytes.parseSelector(data);

    // Length must be at least 32 to contain the selector. Check expected selector and returned selector match.
    if (result.length < 32 || selector != ParseBytes.parseSelector(result)) {
      CustomRevert.revertWith(InvalidHookResponse.selector);
    }

    emit IAppHooksBase.HookExecuted(address(self), selector, success);
  }

  function hasPermission(
    IAppHooks self,
    uint160 flag
  ) internal pure returns (bool) {
    return uint160(address(self)) & flag != 0;
  }
}
