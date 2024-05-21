// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// interfaces

// libraries

// contracts
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";

interface IRoyalty is IERC2981 {
  struct RoyaltyInfo {
    address receiver;
    uint256 amount;
  }

  /// @dev Emitted when the default royalty is set.
  event DefaultRoyalty(address indexed _receiver, uint256 _amount);

  /// @dev Emitted when the royalty recipient for tokenId is set.
  event RoyaltyForToken(
    uint256 indexed _tokenId,
    address indexed _receiver,
    uint256 _amount
  );

  /// @dev Returns the royalty recipient and fraction
  function getDefaultRoyaltyInfo()
    external
    view
    returns (RoyaltyInfo memory _royalty);

  /// @dev Lets a module admin update the royalty fraction and recipient
  function setDefaultRoyaltyInfo(address _recipient, uint256 _amount) external;

  /// @dev Let's a module admin set the royalty fraction for a particular token id
  function setRoyaltyInfoForToken(
    uint256 _tokenId,
    address _recipient,
    uint256 _amount
  ) external;

  /// @dev Returns the royalty recipient for a particular token id
  function getRoyaltyInfoForToken(
    uint256 _tokenId
  ) external view returns (RoyaltyInfo memory _royalty);
}
