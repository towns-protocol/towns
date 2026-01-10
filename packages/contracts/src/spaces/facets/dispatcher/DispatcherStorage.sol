// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

library DispatcherStorage {
    struct Layout {
        mapping(bytes32 => uint256) transactionNonce;
        mapping(bytes32 => uint256) transactionBalance;
        mapping(bytes32 => bytes) transactionData;
    }

    // keccak256(abi.encode(uint256(keccak256("spaces.facets.dispatcher.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x34516f6fe09a043d57f1ff579a303a7ae85314751c77b4eb1a55837604a86e00;

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }
}
