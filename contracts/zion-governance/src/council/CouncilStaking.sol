//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import {console} from "forge-std/console.sol";

// Libs
import {Events} from "./libraries/Events.sol";
import {DataTypes} from "./libraries/DataTypes.sol";
import {Errors} from "./libraries/Errors.sol";

// Contracts
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import {IERC721} from "openzeppelin-contracts/contracts/interfaces/IERC721.sol";

/// @title CouncilStaking
/// @author HNT Labs
/// @notice This is the staking contract for the council NFT
contract CouncilStaking is Ownable, ReentrancyGuard {
  IERC721 public immutable councilNFT;

  constructor(IERC721 _councilNFT) {
    councilNFT = _councilNFT;
  }

  uint256 public totalSupply;
  uint256 private pointsPerHour = 100000;

  mapping(address => DataTypes.Staker) internal _stakerByAddress;
  mapping(uint256 => address) internal _stakerAddressByTokenId;

  function stakeToken(uint256 _tokenId) external nonReentrant {
    // If wallet has other tokens staked, calculate the rewards before adding the new token
    if (_stakerByAddress[msg.sender].amountStaked > 0) {
      uint256 points = _calculatePoints(msg.sender);
      _stakerByAddress[msg.sender].unclaimedPoints += points;
    }

    // Wallet must own the token being staked
    if (councilNFT.ownerOf(_tokenId) != msg.sender)
      revert Errors.NotTokenOwner();

    // Transfer the token from the wallet to the staking contract
    councilNFT.transferFrom(msg.sender, address(this), _tokenId);

    // Create instance of StakedToken
    DataTypes.StakedToken memory stakedToken = DataTypes.StakedToken(
      msg.sender,
      _tokenId
    );

    // Add the token to the stakedTokens array
    _stakerByAddress[msg.sender].stakedTokens.push(stakedToken);

    // Increment the amount staked for this wallet
    _stakerByAddress[msg.sender].amountStaked++;

    // Update the mapping of the tokenId to the staker's address
    _stakerAddressByTokenId[_tokenId] = msg.sender;

    // Update the timeOfLastUpdate for the staker
    _stakerByAddress[msg.sender].timeOfLastUpdate = block.timestamp;

    // Update our total supply
    totalSupply++;

    // Emit staked event
    emit Events.Staked(msg.sender, _tokenId);
  }

  function withdrawToken(uint256 _tokenId) external nonReentrant {
    // Make sure the user has at least one token staked before withdrawing
    if (_stakerByAddress[msg.sender].amountStaked == 0)
      revert Errors.NoStakedTokens();

    // Wallet must own the token being withdrawn
    if (_stakerAddressByTokenId[_tokenId] != msg.sender)
      revert Errors.NotTokenOwner();

    // Update the points for this user, as the amount of points decreases with less tokens
    uint256 points = _calculatePoints(msg.sender);
    _stakerByAddress[msg.sender].unclaimedPoints += points;

    // Find the index of this token id in the stakedTokens array
    uint256 index = 0;
    uint256 len = _stakerByAddress[msg.sender].stakedTokens.length;

    for (uint256 i = 0; i < len; i++) {
      if (
        _stakerByAddress[msg.sender].stakedTokens[i].tokenId == _tokenId &&
        _stakerByAddress[msg.sender].stakedTokens[i].staker != address(0)
      ) {
        index = i;
        break;
      }
    }

    // Set the tokens's staker to be address 0 to mark no longer staked
    _stakerByAddress[msg.sender].stakedTokens[index] = _stakerByAddress[
      msg.sender
    ].stakedTokens[len - 1];
    _stakerByAddress[msg.sender].stakedTokens.pop();
    // _stakerByAddress[msg.sender].stakedTokens[index].staker = address(0);

    // Decrement the amount staked for this wallet
    _stakerByAddress[msg.sender].amountStaked--;

    // Update the mapping of the tokenId to be address(0) to indicate the token is no longer staked
    _stakerAddressByTokenId[_tokenId] = address(0);

    // Transfer token back to owner
    councilNFT.transferFrom(address(this), msg.sender, _tokenId);

    // Update the timeOfLastUpdate of the staker
    _stakerByAddress[msg.sender].timeOfLastUpdate = block.timestamp;

    // Decrement totalSupply
    totalSupply--;

    // Emit unstaked event
    emit Events.Withdraw(msg.sender, _tokenId);
  }

  /// @notice Claim accrued points
  function claimPoints() external {
    uint256 points = _calculatePoints(msg.sender) +
      _stakerByAddress[msg.sender].unclaimedPoints;
    if (points == 0) revert Errors.NoPointsToClaim();

    _stakerByAddress[msg.sender].timeOfLastUpdate = block.timestamp;
    _stakerByAddress[msg.sender].unclaimedPoints = 0;

    emit Events.PointsClaimed(msg.sender, points);
  }

  //
  // View
  //

  function getStakerByAddress(address _staker)
    external
    view
    returns (DataTypes.Staker memory)
  {
    return _stakerByAddress[_staker];
  }

  function getStakerAddressByTokenId(uint256 _tokenId)
    external
    view
    returns (address)
  {
    return _stakerAddressByTokenId[_tokenId];
  }

  function getStakedTokensByAddress(address _user)
    public
    view
    returns (DataTypes.StakedToken[] memory)
  {
    // Check if user has staked
    if (_stakerByAddress[msg.sender].amountStaked > 0) {
      // Returns all the tokens in the stakedToken Array for this user are not -1
      DataTypes.StakedToken[]
        memory _stakedTokens = new DataTypes.StakedToken[](
          _stakerByAddress[_user].amountStaked
        );
      uint256 _index = 0;

      for (
        uint256 j = 0;
        j < _stakerByAddress[_user].stakedTokens.length;
        j++
      ) {
        if (_stakerByAddress[_user].stakedTokens[j].staker != (address(0))) {
          _stakedTokens[_index] = _stakerByAddress[_user].stakedTokens[j];
          _index++;
        }
      }

      return _stakedTokens;
    } else {
      return new DataTypes.StakedToken[](0);
    }
  }

  function getAvailablePoints(address _staker) public view returns (uint256) {
    uint256 points = _calculatePoints(_staker) +
      _stakerByAddress[msg.sender].unclaimedPoints;
    return points;
  }

  //
  // Internal
  //

  function _calculatePoints(address _staker)
    internal
    view
    returns (uint256 _rewards)
  {
    return (((
      ((block.timestamp - _stakerByAddress[_staker].timeOfLastUpdate) *
        _stakerByAddress[_staker].amountStaked)
    ) * pointsPerHour) / 3600);
  }
}
