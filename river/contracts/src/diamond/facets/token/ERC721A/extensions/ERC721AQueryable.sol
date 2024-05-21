// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// interfaces
import {IERC721AQueryable} from "./IERC721AQueryable.sol";

// libraries

// contracts
import {ERC721ABase} from "../ERC721ABase.sol";

contract ERC721AQueryable is ERC721ABase, IERC721AQueryable {
  /// @inheritdoc IERC721AQueryable
  function explicitOwnershipOf(
    uint256 tokenId
  ) public view override returns (TokenOwnership memory) {
    TokenOwnership memory ownership;

    if (tokenId < _startTokenId() || tokenId >= _nextTokenId()) {
      return ownership;
    }

    ownership = _ownershipAt(tokenId);
    if (ownership.burned) {
      return ownership;
    }

    return _ownershipOf(tokenId);
  }

  /// @inheritdoc IERC721AQueryable
  function explicitOwnershipsOf(
    uint256[] calldata tokenIds
  ) external view override returns (TokenOwnership[] memory) {
    unchecked {
      uint256 tokenIdsLen = tokenIds.length;
      TokenOwnership[] memory ownerships = new TokenOwnership[](tokenIdsLen);
      for (uint256 i; i < tokenIdsLen; ++i) {
        ownerships[i] = explicitOwnershipOf(tokenIds[i]);
      }
      return ownerships;
    }
  }

  /// @inheritdoc IERC721AQueryable
  function tokensOfOwnerIn(
    address owner,
    uint256 start,
    uint256 stop
  ) external view virtual override returns (uint256[] memory) {
    unchecked {
      if (start >= stop) revert InvalidQueryRange();
      uint256 tokenIdsIdx;
      uint256 stopLimit = _nextTokenId();
      // Set `start = max(start, _startTokenId())
      if (start < _startTokenId()) {
        start = _startTokenId();
      }
      // Set `stop = min(stop, _nextTokenId())
      if (stop > stopLimit) {
        stop = stopLimit;
      }
      uint256 tokenIdsMaxLen = _balanceOf(owner);
      // Set `tokenIdsMaxLength = min(balanceOf(owner), stop - start)`,
      // to cater for cases where `balanceOf(owner)` is too large.
      if (start < stop) {
        uint256 rangeLen = stop - start;
        if (rangeLen < tokenIdsMaxLen) {
          tokenIdsMaxLen = rangeLen;
        }
      } else {
        tokenIdsMaxLen = 0;
      }

      uint256[] memory tokenIds = new uint256[](tokenIdsMaxLen);
      if (tokenIdsMaxLen == 0) {
        return tokenIds;
      }

      // We need to call `explicitOwnershipOf(start)`,
      // because the slot at `start` may not be initialized
      TokenOwnership memory ownership = explicitOwnershipOf(start);
      address currOwnershipAddr;
      // If starting slot exists (i.e. not burned), initialize `currOwnershipAddr`
      if (!ownership.burned) {
        currOwnershipAddr = ownership.addr;
      }

      for (uint256 i = start; i != stop && tokenIdsIdx != tokenIdsMaxLen; ++i) {
        ownership = _ownershipAt(i);
        if (ownership.burned) {
          continue;
        }
        if (ownership.addr != address(0)) {
          currOwnershipAddr = ownership.addr;
        }
        if (currOwnershipAddr == owner) {
          tokenIds[tokenIdsIdx++] = i;
        }
      }
      // Downsize array
      assembly {
        mstore(tokenIds, tokenIdsIdx)
      }
      return tokenIds;
    }
  }

  /// @inheritdoc IERC721AQueryable
  function tokensOfOwner(
    address owner
  ) external view virtual override returns (uint256[] memory) {
    unchecked {
      uint256 tokenIdsIdx;
      address currOwnershipAddr;
      uint256 tokenIdsLen = _balanceOf(owner);
      uint256[] memory tokenIds = new uint256[](tokenIdsLen);
      TokenOwnership memory ownership;
      for (uint256 i = _startTokenId(); tokenIdsIdx != tokenIdsLen; ++i) {
        ownership = _ownershipAt(i);
        if (ownership.burned) {
          continue;
        }
        if (ownership.addr != address(0)) {
          currOwnershipAddr = ownership.addr;
        }
        if (currOwnershipAddr == owner) {
          tokenIds[tokenIdsIdx++] = i;
        }
      }
      return tokenIds;
    }
  }
}
