// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IL2StandardBridge {
  /// @notice Sends ETH to the sender's address on the other chain.
  /// @param _minGasLimit Minimum amount of gas that the bridge can be relayed with.
  /// @param _extraData   Extra data to be sent with the transaction. Note that the recipient will
  ///                     not be triggered with this data, but it will be emitted and can be used
  ///                     to identify the transaction.
  function bridgeETH(
    uint32 _minGasLimit,
    bytes calldata _extraData
  ) external payable;

  /// @notice Sends ETH to a receiver's address on the other chain. Note that if ETH is sent to a
  ///         smart contract and the call fails, the ETH will be temporarily locked in the
  ///         StandardBridge on the other chain until the call is replayed. If the call cannot be
  ///         replayed with any amount of gas (call always reverts), then the ETH will be
  ///         permanently locked in the StandardBridge on the other chain. ETH will also
  ///         be locked if the receiver is the other bridge, because finalizeBridgeETH will revert
  ///         in that case.
  /// @param _to          Address of the receiver.
  /// @param _minGasLimit Minimum amount of gas that the bridge can be relayed with.
  /// @param _extraData   Extra data to be sent with the transaction. Note that the recipient will
  ///                     not be triggered with this data, but it will be emitted and can be used
  ///                     to identify the transaction.
  function bridgeETHTo(
    address _to,
    uint32 _minGasLimit,
    bytes calldata _extraData
  ) external payable;

  /// @notice Sends ERC20 tokens to the sender's address on the other chain. Note that if the
  ///         ERC20 token on the other chain does not recognize the local token as the correct
  ///         pair token, the ERC20 bridge will fail and the tokens will be returned to sender on
  ///         this chain.
  /// @param _localToken  Address of the ERC20 on this chain.
  /// @param _remoteToken Address of the corresponding token on the remote chain.
  /// @param _amount      Amount of local tokens to deposit.
  /// @param _minGasLimit Minimum amount of gas that the bridge can be relayed with.
  /// @param _extraData   Extra data to be sent with the transaction. Note that the recipient will
  ///                     not be triggered with this data, but it will be emitted and can be used
  ///                     to identify the transaction.
  function bridgeERC20(
    address _localToken,
    address _remoteToken,
    uint256 _amount,
    uint32 _minGasLimit,
    bytes calldata _extraData
  ) external;

  /// @notice Sends ERC20 tokens to a receiver's address on the other chain. Note that if the
  ///         ERC20 token on the other chain does not recognize the local token as the correct
  ///         pair token, the ERC20 bridge will fail and the tokens will be returned to sender on
  ///         this chain.
  /// @param _localToken  Address of the ERC20 on this chain.
  /// @param _remoteToken Address of the corresponding token on the remote chain.
  /// @param _to          Address of the receiver.
  /// @param _amount      Amount of local tokens to deposit.
  /// @param _minGasLimit Minimum amount of gas that the bridge can be relayed with.
  /// @param _extraData   Extra data to be sent with the transaction. Note that the recipient will
  ///                     not be triggered with this data, but it will be emitted and can be used
  ///                     to identify the transaction.
  function bridgeERC20To(
    address _localToken,
    address _remoteToken,
    address _to,
    uint256 _amount,
    uint32 _minGasLimit,
    bytes calldata _extraData
  ) external;
}
