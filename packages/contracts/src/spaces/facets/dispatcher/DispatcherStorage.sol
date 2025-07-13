// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

library DispatcherStorage {
    // keccak256(abi.encode(uint256(keccak256("spaces.facets.dispatcher.storage")) - 1)) &
    // ~bytes32(uint256(0xff))
    bytes32 internal constant STORAGE_SLOT =
        0x34516f6fe09a043d57f1ff579a303a7ae85314751c77b4eb1a55837604a86e00;

    struct Layout {
        mapping(bytes32 => uint256) transactionNonce;
        mapping(bytes32 => uint256) transactionBalance;
        mapping(bytes32 => bytes) transactionData;
    }

    function layout() internal pure returns (Layout storage l) {
        assembly {
            l.slot := STORAGE_SLOT
        }
    }

    /// @dev A reference to a bytes value in storage to allow assignment and deletion
    struct BytesWrapper {
        bytes inner;
    }

    /// @dev Returns the storage reference for the transaction data at the given transaction ID
    function transactionDataRef(
        bytes32 transactionId
    ) internal pure returns (BytesWrapper storage ref) {
        assembly ("memory-safe") {
            mstore(0, transactionId)
            mstore(0x20, add(STORAGE_SLOT, 2)) // transactionData mapping slot
            ref.slot := keccak256(0, 0x40)
        }
    }
}
