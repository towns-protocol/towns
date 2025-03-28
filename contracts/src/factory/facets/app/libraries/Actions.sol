// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceApp} from "../interface/ISpaceApp.sol";

// libraries
import {AppKey} from "./AppId.sol";
import {CustomRevert} from "../../../../utils/libraries/CustomRevert.sol";

// contracts

library Actions {
  using Actions for ISpaceApp;
  using CustomRevert for bytes4;

  uint160 internal constant ON_REGISTER_FLAG = uint160(1 << 0);

  error ActionCallFailed();
  error InvalidActionResponse();

  /// @notice modifier to prevent calling an app if they initiated the action
  modifier noSelfCall(ISpaceApp self) {
    if (msg.sender != address(self)) {
      _;
    }
  }

  function callOnRegister(
    ISpaceApp self,
    AppKey memory key
  ) internal noSelfCall(self) {
    if (self.hasAction(ON_REGISTER_FLAG)) {
      self.callAction(abi.encodeCall(ISpaceApp.onRegister, (msg.sender, key)));
    }
  }

  function callAction(
    ISpaceApp self,
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
        ActionCallFailed.selector
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
    if (result.length < 32 || parseSelector(result) != parseSelector(data)) {
      InvalidActionResponse.selector.revertWith();
    }
  }

  // validations
  function isValidAction(ISpaceApp self) internal view returns (bool) {
    if (address(self) == address(0)) return false;
    if (self.getExecutor() == address(0)) return false;
    if (self.getPermissions().length == 0) return false;
    return true;
  }

  function hasAction(
    ISpaceApp self,
    uint160 flag
  ) internal pure returns (bool) {
    return uint160(address(self)) & flag != 0;
  }

  function parseSelector(
    bytes memory result
  ) internal pure returns (bytes4 selector) {
    // equivalent: (selector,) = abi.decode(result, (bytes4, int256));
    assembly ("memory-safe") {
      selector := mload(add(result, 0x20))
    }
  }
}
