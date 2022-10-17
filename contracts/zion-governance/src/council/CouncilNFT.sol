//SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "solmate/tokens/ERC721.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {Strings} from "openzeppelin-contracts/contracts/utils/Strings.sol";
import {Errors} from "./libraries/Errors.sol";
import {Events} from "./libraries/Events.sol";
import {Constants} from "./libraries/Constants.sol";
import {MerkleProof} from "openzeppelin-contracts/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title CouncilNFT
 * @author HNT Labs
 *
 * @notice This is the main NFT contract for the council of Zion
 */
contract CouncilNFT is ERC721, Ownable {
  using Strings for uint256;

  /// @notice the base uri for the nft metadata including image uri
  string public baseURI;

  /// @notice the counter token id for the next mint
  uint256 public currentTokenId;

  /// @notice mapping to track which  users have already minted an nft
  mapping(address => bool) public alreadyMinted;

  // ///@notice the flags dictating the current minting period
  bool public allowlistMint;
  bool public waitlistMint;
  bool public publicMint;

  /// @notice the root of the merkle tree for the allowlist
  bytes32 internal immutable root;

  constructor(
    string memory _name,
    string memory _symbol,
    string memory _baseURI,
    bytes32 _root
  ) ERC721(_name, _symbol) {
    baseURI = _baseURI;
    root = _root;
    allowlistMint = true;
  }

  /// @notice the primary minting method for the allowlist and waitlist minting periods
  /// @param recipient the address that will receive the minted NFT
  /// @param allowance of 1 means user is on the allowlist, @allowance of 0 means user is on the waitlist
  /// @param proof the generated merkle proof that this user is on the allowlist or waitlist
  /// @return tokenId token id of the minted NFT
  function privateMint(
    address recipient,
    uint256 allowance,
    bytes32[] calldata proof
  ) public payable returns (uint256) {
    if (alreadyMinted[recipient]) revert Errors.AlreadyMinted();

    if (allowlistMint == true) {
      require(allowance == 1, "Not allowed to mint yet");
    }

    //Verify user is on the list with the correct allowance
    bytes32 payload = keccak256(abi.encodePacked(recipient, allowance));

    require(
      MerkleProof.verify(proof, root, payload),
      "Invalid merkle tree proof supplied"
    );

    return mintTo(recipient);
  }

  /// @notice the secondary minting method used only when public minting is active
  /// @param recipient the address that will receive the minted NFT
  /// @return tokenId token id of the minted NFT
  function mint(address recipient) public payable returns (uint256) {
    require(alreadyMinted[recipient] == false, "Already minted an NFT");
    require(publicMint == true, "Public minting is not allowed yet");
    return mintTo(recipient);
  }

  /// @notice Verify that the user sent the proper amount of ether to mint
  /// @notice Verify that there are still more NFTs to mint
  /// @notice Mint the NFT to the user
  function mintTo(address recipient) private returns (uint256) {
    if (msg.value != Constants.MINT_PRICE) revert Errors.MintPriceNotPaid();

    uint256 newItemId = ++currentTokenId;
    if (newItemId > Constants.TOTAL_SUPPLY) revert Errors.MaxSupply();

    alreadyMinted[recipient] = true;
    _safeMint(recipient, newItemId);

    emit Events.Minted(recipient);
    return newItemId;
  }

  /// @notice Get the tokenURI for the given tokenId
  /// @param tokenId the id of the token to get the tokenURI for
  /// @return the tokenURI for the given tokenId
  function tokenURI(uint256 tokenId)
    public
    view
    virtual
    override
    returns (string memory)
  {
    if (ownerOf(tokenId) == address(0)) {
      revert Errors.NonExistentTokenURI();
    }
    return
      bytes(baseURI).length > 0
        ? string(abi.encodePacked(baseURI, "councilmetadata"))
        : "";
  }

  /// @notice withdraw the balance from the contract
  /// @param payee the address that will receive the withdrawn ether
  function withdrawPayments(address payable payee) external onlyOwner {
    uint256 balance = address(this).balance;
    /* solhint-disable-next-line avoid-low-level-calls */
    (bool transferTx, ) = payee.call{value: balance}("");
    if (!transferTx) {
      revert Errors.WithdrawTransfer();
    }
  }

  /// @notice starts the waitlist minting period
  function startWaitlistMint() public onlyOwner {
    allowlistMint = false;
    waitlistMint = true;
    publicMint = false;
  }

  /// @notice starts the public minting period
  function startPublicMint() public onlyOwner {
    allowlistMint = false;
    waitlistMint = false;
    publicMint = true;
  }
}
