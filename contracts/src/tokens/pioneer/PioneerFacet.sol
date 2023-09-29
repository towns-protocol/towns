// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// interfaces
import {IPioneer} from "./IPioneer.sol";

// libraries

// contracts
import {PioneerBase} from "./PioneerBase.sol";
import {ERC721A} from "contracts/src/diamond/facets/token/ERC721A/ERC721A.sol";
import {OwnableBase} from "contracts/src/diamond/facets/ownable/OwnableBase.sol";

contract PioneerFacet is IPioneer, PioneerBase, OwnableBase, ERC721A {
  modifier onlyAllowed() {
    if (!_isAllowed(msg.sender)) revert NotAllowed();
    _;
  }

  function __Pioneer_init(
    string memory name,
    string memory symbol,
    string memory baseURI,
    uint256 reward,
    address owner
  ) external onlyInitializing {
    _setBaseURI(baseURI);
    _setAllowed(owner, true);
    _setMintReward(reward);
    __ERC721A_init_unchained(name, symbol);
  }

  /// @inheritdoc IPioneer
  function mintTo(address to) external onlyAllowed returns (uint256 tokenId) {
    if (to == address(0)) revert NotAllowed();
    if (_balanceOf(to) > 0) revert AlreadyMinted();

    uint256 reward = _getMintReward();

    if (reward > address(this).balance) revert InsufficientBalance();

    tokenId = _nextTokenId();

    _safeMint(to, 1);

    if (reward > 0) {
      _sendReward(to, reward);
    }
  }

  /// @inheritdoc IPioneer
  function withdraw(address to) external onlyOwner {
    _sendReward(to, address(this).balance);
  }

  /// @inheritdoc IPioneer
  function setAllowed(address user, bool allow) external onlyOwner {
    _setAllowed(user, allow);
    emit SetAllowed(user, allow);
  }

  /// @inheritdoc IPioneer
  function setBaseURI(string memory baseURI) external onlyOwner {
    _setBaseURI(baseURI);
  }

  /// @inheritdoc IPioneer
  function setMintReward(uint256 newMintReward) external onlyOwner {
    _setMintReward(newMintReward);
  }

  /// @inheritdoc IPioneer
  function getMintReward() external view returns (uint256) {
    return _getMintReward();
  }
}
