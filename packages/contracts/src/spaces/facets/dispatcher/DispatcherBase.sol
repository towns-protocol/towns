// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDispatcherBase} from "./IDispatcher.sol";

// libraries
import {StoragePointer} from "@towns-protocol/diamond/src/libraries/StoragePointer.sol";
import {CustomRevert} from "../../../utils/libraries/CustomRevert.sol";

// contracts
import {DispatcherStorage} from "./DispatcherStorage.sol";

abstract contract DispatcherBase is IDispatcherBase {
    using CustomRevert for bytes4;
    using StoragePointer for mapping(bytes32 => bytes);

    function _deleteCapturedData(bytes32 transactionId) internal {
        DispatcherStorage.Layout storage ds = DispatcherStorage.layout();
        delete ds.transactionData.get(transactionId).value;
    }

    function _getCapturedData(bytes32 transactionId) internal view returns (bytes storage) {
        DispatcherStorage.Layout storage ds = DispatcherStorage.layout();
        return ds.transactionData.get(transactionId).value;
    }

    function _captureValue(bytes32 transactionId, uint256 value) internal {
        DispatcherStorage.Layout storage ds = DispatcherStorage.layout();
        ds.transactionBalance[transactionId] += value;
    }

    function _releaseCapturedValue(bytes32 transactionId, uint256 value) internal {
        DispatcherStorage.Layout storage ds = DispatcherStorage.layout();
        ds.transactionBalance[transactionId] -= value;
    }

    function _getCapturedValue(bytes32 transactionId) internal view returns (uint256) {
        DispatcherStorage.Layout storage ds = DispatcherStorage.layout();
        return ds.transactionBalance[transactionId];
    }

    function _dispatchNonce(bytes32 keyHash) internal view returns (uint256) {
        DispatcherStorage.Layout storage ds = DispatcherStorage.layout();
        return ds.transactionNonce[keyHash];
    }

    function _useDispatchNonce(bytes32 keyHash) internal returns (uint256) {
        DispatcherStorage.Layout storage ds = DispatcherStorage.layout();
        return ds.transactionNonce[keyHash]++;
    }

    function _makeDispatchInputSeed(
        bytes32 keyHash,
        address requester,
        uint256 nonce
    ) internal pure returns (uint256) {
        return uint256(keccak256(abi.encode(keyHash, requester, nonce)));
    }

    function _makeDispatchId(bytes32 keyHash, uint256 inputSeed) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(keyHash, inputSeed));
    }

    /// @notice Registers a transaction and captures payment
    /// @param sender The address initiating the transaction
    /// @param data The encoded transaction data
    /// @param capturedAmount The amount captured (ETH or ERC20)
    /// @return transactionId The unique identifier for this transaction
    function _registerTransaction(
        address sender,
        bytes memory data,
        uint256 capturedAmount
    ) internal returns (bytes32 transactionId) {
        bytes32 keyHash = keccak256(abi.encodePacked(sender, block.number));

        transactionId = _makeDispatchId(
            keyHash,
            _makeDispatchInputSeed(keyHash, sender, _useDispatchNonce(keyHash))
        );

        DispatcherStorage.Layout storage ds = DispatcherStorage.layout();
        StoragePointer.Bytes storage capturedDataRef = ds.transactionData.get(transactionId);

        // revert if the transaction already exists
        if (capturedDataRef.value.length > 0) {
            Dispatcher__TransactionAlreadyExists.selector.revertWith();
        }
        capturedDataRef.value = data;

        // Capture payment amount
        if (capturedAmount != 0) _captureValue(transactionId, capturedAmount);
    }
}
