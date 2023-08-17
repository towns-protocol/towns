// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces

// libraries

// contracts
interface ITownOwnerBase {
  struct Town {
    string name;
    string uri;
    uint256 tokenId;
    string networkId;
    uint256 createdAt;
  }

  error TownOwner__OnlyFactoryAllowed();
}

interface ITownOwner is ITownOwnerBase {
  function setFactory(address factory) external;

  function nextTokenId() external view returns (uint256);

  function mintTown(
    string memory name,
    string memory uri,
    string memory networkId,
    address townAddress
  ) external returns (uint256 tokenId);

  function getTownInfo(address townAddress) external view returns (Town memory);
}
