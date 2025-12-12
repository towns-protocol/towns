// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

library PrepayStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.prepay.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x097b4f25b64e012d0cf55f67e9b34fe5d57f15b11b95baa4ddd136b424967c00;

    struct Layout {
        uint256 seats;
    }

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }

    function addPrepay(uint256 seats) internal {
        layout().seats += seats;
    }

    function reducePrepay(uint256 seats) internal {
        layout().seats -= seats;
    }

    function getPrepaidSeats() internal view returns (uint256) {
        return layout().seats;
    }
}
