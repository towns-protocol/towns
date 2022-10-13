// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {DataTypes} from "../libraries/DataTypes.sol";
import {Errors} from "../libraries/Errors.sol";
import {Events} from "../libraries/Events.sol";
import {Constants} from "../libraries/Constants.sol";
import {IERC165} from "openzeppelin-contracts/contracts/interfaces/IERC165.sol";

library ZionSpaceController {
  function createSpace(
    DataTypes.CreateSpaceData calldata info,
    uint256 spaceId,
    address creator,
    mapping(bytes32 => uint256) storage _spaceIdByHash,
    mapping(uint256 => DataTypes.Space) storage _spaceById
  ) external {
    _validateSpaceName(info.spaceName);

    bytes32 networkHash = keccak256(bytes(info.networkId));

    if (_spaceIdByHash[networkHash] != 0)
      revert Errors.SpaceAlreadyRegistered();

    _spaceIdByHash[networkHash] = spaceId;
    _spaceById[spaceId].spaceId = spaceId;
    _spaceById[spaceId].createdAt = block.timestamp;
    _spaceById[spaceId].name = info.spaceName;
    _spaceById[spaceId].networkId = info.networkId;
    _spaceById[spaceId].creator = creator;
    _spaceById[spaceId].owner = creator;
  }

  /// @notice validates the name of the space
  /// @param name The name of the space
  function _validateSpaceName(string calldata name) internal pure {
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
