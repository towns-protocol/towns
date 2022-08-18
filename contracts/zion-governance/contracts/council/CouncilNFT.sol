// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "solmate/tokens/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "murky/Merkle.sol";

/// @notice thrown when an incorrect amount of ETH is sent to mint
error MintPriceNotPaid();
/// @notice thrown when the max supply is reached
error MaxSupply();
/// @notice thrown when a token is not minted
error NonExistentTokenURI();
/// @notice thrown when the withdraw payment transaction fails
error WithdrawTransfer();

/// @notice thrown when user tries to mint more than 1 token with same wallet
error AlreadyMinted();

contract CouncilNFT is ERC721, Ownable {
    using Strings for uint256;

    /// @notice emitted when an NFT is minted
    /// @param recipient the address that receives the NFT
    event Minted(address indexed recipient);

    /// @notice the base uri for the nft metadata including image uri
    string public baseURI;

    /// @notice the counter token id for the next mint
    uint256 public currentTokenId;

    /// @notice the total supply of the collection
    uint256 public constant TOTAL_SUPPLY = 2500;

    /// @notice the mint price for an individual nft
    uint256 public constant MINT_PRICE = 0.08 ether;

    /// @notice mapping to track which  users have already minted an nft
    mapping(address => bool) public alreadyMinted;

    ///@notice the flags dictating the current minting period
    bool public allowlistMint = false;
    bool public waitlistMint = false;
    bool public publicMint = false;

    /// @notice the root of the merkle tree for the allowlist
    bytes32 internal immutable root;

    /// the merkle tree for the allowlist
    Merkle internal merkle;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseURI,
        bytes32 _root
    ) ERC721(_name, _symbol) {
        baseURI = _baseURI;
        root = _root;
        merkle = new Merkle();
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
        if (alreadyMinted[recipient]) revert AlreadyMinted();

        if (allowlistMint == true) {
            require(allowance == 1, "Not allowed to mint yet");
        }

        //Verify user is on the list with the correct allowance
        string memory senderPacked = string(abi.encodePacked(recipient));
        bytes32 payload = keccak256(
            abi.encodePacked(senderPacked, Strings.toString(allowance))
        );
        require(
            merkle.verifyProof(root, proof, payload) == true,
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
    /// @notice Verify that their are still more NFTs to mint
    /// @notice Mint the NFT to the user
    function mintTo(address recipient) private returns (uint256) {
        if (msg.value != MINT_PRICE) {
            revert MintPriceNotPaid();
        }
        uint256 newItemId = ++currentTokenId;
        if (newItemId > TOTAL_SUPPLY) {
            revert MaxSupply();
        }
        alreadyMinted[recipient] = true;
        _safeMint(recipient, newItemId);

        emit Minted(recipient);
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
            revert NonExistentTokenURI();
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
        (bool transferTx, ) = payee.call{value: balance}("");
        if (!transferTx) {
            revert WithdrawTransfer();
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
