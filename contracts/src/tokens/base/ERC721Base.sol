// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.23;

// interfaces
import {IERC2981} from "openzeppelin-contracts/contracts/interfaces/IERC2981.sol";

// libraries
import {Strings} from "openzeppelin-contracts/contracts/utils/Strings.sol";

// contracts
import {ERC721A} from "ERC721A/ERC721A.sol";
import {Royalty} from "contracts/src/utils/Royalty.sol";
import {Metadata} from "contracts/src/utils/Metadata.sol";
import {MultiCaller} from "contracts/src/utils/MultiCaller.sol";
import {BatchMintMetadata} from "contracts/src/utils/BatchMintMetadata.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {DefaultOperatorFilterer} from "operator-filter-registry/src/DefaultOperatorFilterer.sol";

contract ERC721Base is
  ERC721A,
  Metadata,
  MultiCaller,
  Ownable,
  Royalty,
  BatchMintMetadata,
  DefaultOperatorFilterer
{
  using Strings for uint256;

  // tokenId => tokenURI
  mapping(uint256 => string) private _tokenURIs;

  constructor(
    string memory name_,
    string memory symbol_,
    address royaltyReceiver_,
    uint256 royaltyAmount_
  ) ERC721A(name_, symbol_) {
    _setDefaultRoyaltyInfo(royaltyReceiver_, royaltyAmount_);
  }

  /// @dev See ERC165: https://eips.ethereum.org/EIPS/eip-165
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(Royalty, ERC721A) returns (bool) {
    return
      interfaceId == 0x01ffc9a7 || // ERC165 Interface ID for ERC165
      interfaceId == 0x80ac58cd || // ERC165 Interface ID for ERC721
      interfaceId == 0x5b5e139f || // ERC165 Interface ID for ERC721Metadata
      interfaceId == type(IERC2981).interfaceId; // ERC165 ID for ERC2981
  }

  /// @notice Returns the metadata URI for an NFT
  /// @dev See {BatchMintMetadata} for handling of metadata
  /// @param _tokenId The token ID to query
  function tokenURI(
    uint256 _tokenId
  ) public view virtual override returns (string memory) {
    string memory fullURIForToken = _tokenURIs[_tokenId];

    if (bytes(fullURIForToken).length > 0) {
      return fullURIForToken;
    }

    string memory batchURI = _getBaseURI(_tokenId);
    return string(abi.encodePacked(batchURI, _tokenId.toString()));
  }

  /// @notice Mint an NFT to a recipient
  /// @dev The logic in `_canMint` function determines if the caller can mint
  /// @param _to The recipient of the NFT
  /// @param _tokenURI The token URI to mint
  function mintTo(address _to, string memory _tokenURI) public virtual {
    require(_canMint(), "ERC721Base: caller cannot mint");
    _setTokenURI(_nextTokenId(), _tokenURI);
    _safeMint(_to, 1);
  }

  /// @notice Mint multiple NFTs to a recipient
  /// @dev The logic in `_canMint` function determines if the caller can mint
  /// @param _to The recipient of the NFT
  /// @param _quantity The number of NFTs to mint
  /// @param _baseURI The token URI to mint
  /// @param _data The data to pass to safeMint
  function batchMintTo(
    address _to,
    uint256 _quantity,
    string memory _baseURI,
    bytes memory _data
  ) public virtual {
    require(_canMint(), "ERC721Base: caller cannot mint");
    _batchMintMetadata(_nextTokenId(), _quantity, _baseURI);
    _safeMint(_to, _quantity, _data);
  }

  /// @notice Burn an NFT
  /// @dev ERC721A `_burn` internally checks for token approval
  /// @param _tokenId The token ID to burn
  function burn(uint256 _tokenId) external virtual {
    _burn(_tokenId, true);
  }

  /// @notice Returns whether a given address is the owner, or approved to transfer an NFT.
  function isApprovedOrOwner(
    address _spender,
    uint256 _tokenId
  ) public view virtual returns (bool isApprovedOrOwnerOf) {
    return
      _spender == ownerOf(_tokenId) ||
      _spender == getApproved(_tokenId) ||
      isApprovedForAll(ownerOf(_tokenId), _spender);
  }

  /// @notice Returns the next token ID
  function nextTokenId() public view virtual returns (uint256) {
    return _nextTokenId();
  }

  // =============================================================
  //                           Overrides
  // =============================================================
  /// @dev See {ERC721-setApprovalForAll}.
  function setApprovalForAll(
    address operator,
    bool approved
  ) public virtual override(ERC721A) onlyAllowedOperatorApproval(operator) {
    super.setApprovalForAll(operator, approved);
  }

  /// @dev See {ERC721-approve}.
  function approve(
    address operator,
    uint256 tokenId
  )
    public
    payable
    virtual
    override(ERC721A)
    onlyAllowedOperatorApproval(operator)
  {
    super.approve(operator, tokenId);
  }

  /// @dev See {ERC721-_transferFrom}.
  function transferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public payable virtual override(ERC721A) onlyAllowedOperator(from) {
    super.transferFrom(from, to, tokenId);
  }

  /// @dev See {ERC721-_safeTransferFrom}.
  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId
  ) public payable virtual override(ERC721A) onlyAllowedOperator(from) {
    super.safeTransferFrom(from, to, tokenId);
  }

  /// @dev See {ERC721-_safeTransferFrom}.
  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId,
    bytes memory data
  ) public payable virtual override(ERC721A) onlyAllowedOperator(from) {
    super.safeTransferFrom(from, to, tokenId, data);
  }

  // =============================================================
  //                           Internal
  // =============================================================

  function _setTokenURI(
    uint256 _tokenId,
    string memory _tokenURI
  ) internal virtual {
    require(
      bytes(_tokenURIs[_tokenId]).length == 0,
      "ERC721Base: tokenURI already set"
    );
    _tokenURIs[_tokenId] = _tokenURI;
  }

  function _canSetContractURI() internal view virtual override returns (bool) {
    return _msgSender() == owner();
  }

  function _canMint() internal view virtual returns (bool) {
    return _msgSender() == owner();
  }

  function _canSetRoyaltyInfo() internal view virtual override returns (bool) {
    return _msgSender() == owner();
  }
}
