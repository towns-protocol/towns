// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {DataTypes} from "../libraries/DataTypes.sol";
import {Errors} from "../libraries/Errors.sol";
import {Events} from "../libraries/Events.sol";
import {Constants} from "../libraries/Constants.sol";
import {IERC165} from "openzeppelin-contracts/contracts/interfaces/IERC165.sol";

library CreationLogic {
  function createSpace(
    DataTypes.CreateSpaceData calldata info,
    uint256 spaceId,
    address creator,
    mapping(bytes32 => uint256) storage _spaceIdByHash,
    mapping(uint256 => DataTypes.Space) storage _spaceById
  ) external {
    _validateName(info.spaceName);

    bytes32 networkHash = keccak256(bytes(info.spaceNetworkId));

    if (_spaceIdByHash[networkHash] != 0)
      revert Errors.SpaceAlreadyRegistered();

    _spaceIdByHash[networkHash] = spaceId;
    _spaceById[spaceId].spaceId = spaceId;
    _spaceById[spaceId].createdAt = block.timestamp;
    _spaceById[spaceId].name = info.spaceName;
    _spaceById[spaceId].networkId = info.spaceNetworkId;
    _spaceById[spaceId].creator = creator;
    _spaceById[spaceId].owner = creator;
  }

  function createChannel(
    DataTypes.CreateChannelData calldata info,
    uint256 spaceId,
    uint256 channelId,
    address creator,
    mapping(uint256 => mapping(bytes32 => uint256))
      storage _channelIdBySpaceIdByHash,
    mapping(uint256 => mapping(uint256 => DataTypes.Channel))
      storage _channelBySpaceIdByChannelId
  ) external {
    _validateName(info.channelName);

    bytes32 networkHash = keccak256(bytes(info.channelNetworkId));

    if (_channelIdBySpaceIdByHash[spaceId][networkHash] != 0) {
      revert Errors.SpaceAlreadyRegistered();
    }

    _channelIdBySpaceIdByHash[spaceId][networkHash] = channelId;

    _channelBySpaceIdByChannelId[spaceId][channelId].channelId = channelId;
    _channelBySpaceIdByChannelId[spaceId][channelId].createdAt = block
      .timestamp;
    _channelBySpaceIdByChannelId[spaceId][channelId].networkId = info
      .channelNetworkId;
    _channelBySpaceIdByChannelId[spaceId][channelId].name = info.channelName;
    _channelBySpaceIdByChannelId[spaceId][channelId].creator = creator;
  }

  /// @notice validates the name of the space
  /// @param name The name of the space
  function _validateName(string calldata name) internal pure {
    bytes memory byteName = bytes(name);

    if (
      byteName.length < Constants.MIN_NAME_LENGTH ||
      byteName.length > Constants.MAX_NAME_LENGTH
    ) revert Errors.NameLengthInvalid();

    uint256 byteNameLength = byteName.length;
    for (uint256 i = 0; i < byteNameLength; ) {
      if (
        (byteName[i] < "0" ||
          byteName[i] > "z" ||
          (byteName[i] > "9" && byteName[i] < "a")) &&
        byteName[i] != "." &&
        byteName[i] != "-" &&
        byteName[i] != "_"
      ) revert Errors.NameContainsInvalidCharacters();
      unchecked {
        ++i;
      }
    }
  }
}
