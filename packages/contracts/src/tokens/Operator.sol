// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.9;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721Base} from "contracts/src/tokens/base/ERC721Base.sol";

/**
 * @title Operator
 * @dev Operator contract WIP
 */
contract Operator is ERC721Base, AccessControl {
  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  bytes32 public constant TRANSFER_ROLE = keccak256("TRANSFER_ROLE");

  constructor(
    string memory name_,
    string memory symbol_,
    address royaltyReceiver_,
    uint256 royaltyAmount_
  ) ERC721Base(name_, symbol_, royaltyReceiver_, royaltyAmount_) {
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(MINTER_ROLE, _msgSender());
    _grantRole(TRANSFER_ROLE, _msgSender());
  }

  function mintTo(address _to) public {
    super.mintTo(_to, "ipfs://operator-image");
  }

  function _canMint() internal view override returns (bool) {
    return hasRole(MINTER_ROLE, _msgSender());
  }

  function _beforeTokenTransfers(
    address from,
    address to,
    uint256 tokenId,
    uint256 batchSize
  ) internal override onlyRole(TRANSFER_ROLE) {
    super._beforeTokenTransfers(from, to, tokenId, batchSize);
  }

  function supportsInterface(
    bytes4 interfaceId
  ) public view override(ERC721Base, AccessControl) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
