// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MultiCaller
/// @notice Enables calling multiple methods in a single call to the contract
abstract contract MultiCaller {
  function multicall(
    bytes[] calldata data
  ) external returns (bytes[] memory results) {
    results = new bytes[](data.length);
    for (uint256 i = 0; i < data.length; i++) {
      (bool success, bytes memory result) = address(this).delegatecall(data[i]);

      if (!success) {
        revertFromReturnedData(result);
      }

      results[i] = result;
    }
  }

  /// Courtesy of: https://ethereum.stackexchange.com/a/123588/114815
  /// @dev Bubble up the revert from the returnedData (supports Panic, Error & Custom Errors)
  /// @notice This is needed in order to provide some human-readable revert message from a call
  /// @param returnedData Response of the call
  function revertFromReturnedData(bytes memory returnedData) internal pure {
    if (returnedData.length < 4) {
      // case 1: catch all
      revert("unhandled revert");
    } else {
      bytes4 errorSelector;
      assembly {
        errorSelector := mload(add(returnedData, 0x20))
      }
      if (
        errorSelector == bytes4(0x4e487b71) /* `seth sig "Panic(uint256)"` */
      ) {
        // case 2: Panic(uint256) (Defined since 0.8.0)
        // solhint-disable-next-line max-line-length
        // ref: https://docs.soliditylang.org/en/v0.8.0/control-structures.html#panic-via-assert-and-error-via-require)
        string memory reason = "panicked: 0x__";
        uint errorCode;
        assembly {
          errorCode := mload(add(returnedData, 0x24))
          let reasonWord := mload(add(reason, 0x20))
          // [0..9] is converted to ['0'..'9']
          // [0xa..0xf] is not correctly converted to ['a'..'f']
          // but since panic code doesn't have those cases, we will ignore them for now!
          let e1 := add(and(errorCode, 0xf), 0x30)
          let e2 := shl(8, add(shr(4, and(errorCode, 0xf0)), 0x30))
          reasonWord := or(
            and(
              reasonWord,
              0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0000
            ),
            or(e2, e1)
          )
          mstore(add(reason, 0x20), reasonWord)
        }
        revert(reason);
      } else {
        // case 3: Error(string) (Defined at least since 0.7.0)
        // case 4: Custom errors (Defined since 0.8.0)
        uint len = returnedData.length;
        assembly {
          revert(add(returnedData, 32), len)
        }
      }
    }
  }
}
