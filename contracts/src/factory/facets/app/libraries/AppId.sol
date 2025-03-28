// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {ISpaceApp} from "../interface/ISpaceApp.sol";

// libraries

// contracts

using AppIdLib for AppKey global;

type AppId is bytes32;

struct AppKey {
  address space;
  ISpaceApp app;
}

library AppIdLib {
  function toId(AppKey memory appKey) internal pure returns (AppId appId) {
    assembly ("memory-safe") {
      // 0x40 represents the total size of the AppKey struct (2 slots of 32 bytes each)
      appId := keccak256(appKey, 0x40)
    }
  }
}
