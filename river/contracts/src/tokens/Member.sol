// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

//interfaces

//libraries
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

//contracts
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

// @notice TEST CONTRACT, DO NOT USE IN PRODUCTION
contract Member is ERC721, Ownable {
  /// @notice emitted when an NFT is minted
  /// @param recipient the address that receives the NFT
  event Minted(address indexed recipient, uint256 tokenId, uint256 timestamp);

  /// @notice emitted when the mint state is changed
  /// @param caller the address that called the function
  /// @param prevState the previous mint state
  /// @param newState the new mint state
  /// @param timestamp the timestamp of the state change
  event MintStateChanged(
    address indexed caller,
    MintState indexed prevState,
    MintState indexed newState,
    uint256 timestamp
  );

  /// @notice thrown when user tries to mint more than 1 token with same wallet
  error AlreadyMinted();

  /// @notice thrown when an incorrect amount of ETH is sent to mint
  error MintPriceNotPaid();

  /// @notice thrown when the max supply is reached
  error MaxSupplyReached();

  /// @notice thrown when a token is not minted
  error NonExistentTokenURI();

  /// @notice thrown when the withdraw payment transaction fails
  error WithdrawTransfer();

  /// @notice thrown when the user is not allowed to perform the action
  error NotAllowed();

  /// @notice thrown when the mint state is invalid
  error InvalidMintState();

  /// @notice thrown when the address is invalid
  error InvalidAddress();

  /// @notice thrown when the proof is invalid
  error InvalidProof();

  /// @notice the current minting state
  enum MintState {
    Allowlist,
    Waitlist,
    Public
  }

  // =============================================================
  //                           CONSTANTS
  // =============================================================

  /// @notice the total supply of the collection
  uint256 public constant TOTAL_SUPPLY = 2500;

  /// @notice the mint price for an individual nft
  uint256 public constant MINT_PRICE = 0.08 ether;

  // =============================================================
  //                           STORAGE
  // =============================================================

  /// @notice the base uri
  string public baseURI;

  /// @notice mapping to track if a wallet has already minted
  mapping(address => bool) public _hasMinted;

  /// @notice the root of the merkle tree for the allowlist
  bytes32 internal immutable _merkleRoot;

  /// @notice the current minting state
  MintState internal _mintState;

  // @notice the counter token id for the next mint
  uint256 public currentTokenId;

  // =============================================================
  //                          CONSTRUCTOR
  // =============================================================

  constructor(
    string memory name_,
    string memory symbol_,
    string memory baseURI_,
    bytes32 merkleRoot_
  ) ERC721(name_, symbol_) Ownable(msg.sender) {
    baseURI = baseURI_;
    _merkleRoot = merkleRoot_;
    _mintState = MintState.Allowlist;
  }

  // =============================================================
  //                        MINT OPERATIONS
  // =============================================================
  function privateMint(
    address recipient,
    uint256 allowance,
    bytes32[] calldata proof
  ) external payable returns (uint256) {
    _validateInvalidAddress(recipient);
    _validateMintPrice();
    _validateMaxSupply();
    _validateMinted(recipient);
    _validateAllowlist(allowance);

    bytes32 payload = keccak256(abi.encodePacked(recipient, allowance));

    if (!MerkleProof.verify(proof, _merkleRoot, payload)) {
      revert InvalidProof();
    }

    return _mintTo(recipient);
  }

  function publicMint(address recipient) external payable returns (uint256) {
    _validateInvalidAddress(recipient);
    _validateMintPrice();
    _validateMaxSupply();
    _validateMinted(recipient);
    _validateState(MintState.Public);
    return _mintTo(recipient);
  }

  // =============================================================
  //                        BASE URI OPERATIONS
  // =============================================================

  function setBaseURI(string memory baseURI_) external onlyOwner {
    baseURI = baseURI_;
  }

  function _baseURI() internal view override returns (string memory) {
    return baseURI;
  }

  /// @notice Get the tokenURI for the given tokenId
  /// @param tokenId the id of the token to get the tokenURI for
  /// @return the tokenURI for the given tokenId
  function tokenURI(
    uint256 tokenId
  ) public view virtual override returns (string memory) {
    if (ownerOf(tokenId) == address(0)) {
      revert NonExistentTokenURI();
    }
    return
      bytes(baseURI).length > 0
        ? string(abi.encodePacked(baseURI, "councilmetadata"))
        : "";
  }

  // =============================================================
  //                       MINT STATE OPERATIONS
  // =============================================================

  function startWaitlistMint() external onlyOwner {
    _validateState(MintState.Allowlist);
    _setState(MintState.Waitlist);
  }

  function startPublicMint() external onlyOwner {
    _validateState(MintState.Waitlist);
    _setState(MintState.Public);
  }

  // =============================================================
  //                       ADMIN OPERATIONS
  // =============================================================

  /// @notice withdraw the balance from the contract
  /// @param payee the address that will receive the withdrawn ether
  function withdrawPayments(address payable payee) external onlyOwner {
    uint256 balance = address(this).balance;
    (bool transferTx, ) = payee.call{value: balance}("");
    if (!transferTx) {
      revert WithdrawTransfer();
    }
  }

  // =============================================================
  //                       INTERNAL OPERATIONS
  // =============================================================
  function _mintTo(address recipient) internal returns (uint256) {
    _hasMinted[recipient] = true;
    uint256 tokenId = currentTokenId;
    currentTokenId++;
    _safeMint(recipient, tokenId);
    emit Minted(recipient, tokenId, block.timestamp);
    return tokenId;
  }

  function _setState(MintState _state) internal {
    MintState prevState = _mintState;
    _mintState = _state;
    emit MintStateChanged(msg.sender, prevState, _state, block.timestamp);
  }

  function _validateInvalidAddress(address recipient) internal pure {
    if (recipient == address(0)) {
      revert InvalidAddress();
    }
  }

  function _validateMaxSupply() internal view {
    if (currentTokenId >= TOTAL_SUPPLY) {
      revert MaxSupplyReached();
    }
  }

  function _validateState(MintState _state) internal view {
    if (_mintState != _state) {
      revert InvalidMintState();
    }
  }

  function _validateAllowlist(uint256 allowance) internal view {
    if (_mintState == MintState.Allowlist && allowance != 1) {
      revert NotAllowed();
    }
  }

  function _validateMinted(address recipient) internal view {
    if (_hasMinted[recipient]) {
      revert AlreadyMinted();
    }
  }

  function _validateMintPrice() internal view {
    if (msg.value != MINT_PRICE) {
      revert MintPriceNotPaid();
    }
  }
}
