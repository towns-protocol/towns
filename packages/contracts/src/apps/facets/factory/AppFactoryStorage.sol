// SPDX-License-Identifier: MIT
pragma solidity ^0.8.33;

// interfaces

// libraries
import {EnumerableSetLib} from "solady/utils/EnumerableSetLib.sol";

// contracts

library AppFactoryStorage {
    using EnumerableSetLib for EnumerableSetLib.Bytes32Set;

    struct Layout {
        address entryPoint;
        EnumerableSetLib.Bytes32Set beaconIds;
        mapping(bytes32 beaconId => address beacon) beacons;
    }

    // keccak256(abi.encode(uint256(keccak256("app.factory.storage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0xca64e2f4a307cd87bb6e650a2b64b61bb8e05eb19e155e37ac786fdc5c4f0500;

    function getLayout() internal pure returns (Layout storage $) {
        assembly {
            $.slot := STORAGE_SLOT
        }
    }
}
