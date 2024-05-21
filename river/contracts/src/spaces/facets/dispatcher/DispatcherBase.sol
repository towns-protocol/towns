// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IDispatcherBase} from "./IDispatcher.sol";

// libraries

// contracts
import {DispatcherStorage} from "./DispatcherStorage.sol";

abstract contract DispatcherBase is IDispatcherBase {
  function _captureData(bytes32 transactionId, bytes memory data) internal {
    DispatcherStorage.Layout storage ds = DispatcherStorage.layout();
    ds.transactionData[transactionId] = data;
  }

  function _getCapturedData(
    bytes32 transactionId
  ) internal view returns (bytes memory) {
    DispatcherStorage.Layout storage ds = DispatcherStorage.layout();
    return ds.transactionData[transactionId];
  }

  function _captureValue(bytes32 transactionId, uint256 value) internal {
    if (value == 0) revert Dispatcher__InvalidValue();
    if (msg.value != value) revert Dispatcher__InvalidValue();

    DispatcherStorage.Layout storage ds = DispatcherStorage.layout();
    ds.transactionBalance[transactionId] += value;
  }

  function _releaseCapturedValue(
    bytes32 transactionId,
    uint256 value
  ) internal {
    DispatcherStorage.Layout storage ds = DispatcherStorage.layout();
    ds.transactionBalance[transactionId] -= value;
  }

  function _getCapturedValue(
    bytes32 transactionId
  ) internal view returns (uint256) {
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

  function _makeDispatchId(
    bytes32 keyHash,
    uint256 inputSeed
  ) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(keyHash, inputSeed));
  }
}
