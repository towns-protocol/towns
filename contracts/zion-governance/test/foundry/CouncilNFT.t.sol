// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "murky/Merkle.sol";
import "forge-std/Test.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {MerkleHelper} from "./utils/MerkleHelper.sol";
import {CouncilNFT} from "../../contracts/council/CouncilNFT.sol";

contract NFTTest is Test, MerkleHelper {
    using stdStorage for StdStorage;
    using Strings for uint256;

    CouncilNFT private nft;
    Merkle private merkle;

    uint256 private NFT_PRICE = 0.08 ether;
    uint256 private NFT_SUPPLY = 2500;

    bytes32[] private allowlistData;

    function setUp() public {
        //initialize the test data
        _initPositionsAllowances();
        allowlistData = _generateAllowlistData();

        //generate a merkle root from the allowlisted users test data
        merkle = new Merkle();
        bytes32 root = merkle.getRoot(allowlistData);

        //deploy the nft
        nft = new CouncilNFT("Zion", "zion", "baseUri", root);
    }

    /// if public minting has not started, normal mints should fail
    function testFailPublicMintingNotOpen() public {
        nft.mint(address(1));
    }

    /// if no eth is sent, the mint should fail
    function testFailNoMintPricePaid() public {
        nft.startPublicMint();
        nft.mint(address(1));
    }

    /// if wrong eth is sent, the mint should fail
    function testFailWrongMintPricePaid() public {
        nft.startPublicMint();
        nft.mint(address(1));
        nft.mint{value: 5 ether}(address(1));
    }

    /// if public minting is opened and the correct amount is sent, the mint should succeed
    function testMintPricePaid() public {
        nft.startPublicMint();
        nft.mint{value: NFT_PRICE}(address(1));
    }

    /// if a user mints an nft, the uri should exist for that token id
    function testUriMatches() public {
        nft.startPublicMint();
        nft.mint{value: NFT_PRICE}(address(1));

        assertEq(
            nft.tokenURI(1),
            string(abi.encodePacked("baseUri", "councilmetadata"))
        );
    }

    /// if user is waitlisted only (allowance = 0), minting should fail if in allowlist minting period
    function testFailAllowlistMintOnlyWaitlisted() public {
        address testingAddress = waitlist1;

        uint256 position = userPositionMap[testingAddress];
        uint256 allowance = userAllowanceMap[testingAddress];

        bytes32[] memory proof = merkle.getProof(allowlistData, position);
        nft.privateMint{value: NFT_PRICE}(testingAddress, allowance, proof);
    }

    /// if the proof generation is invalid, the test should fail
    function testFailAllowlistMintBadProof() public {
        address testingAddress = waitlist1;

        uint256 position = userPositionMap[waitlist1];
        uint256 allowance = 55; //random number

        bytes32[] memory proof = merkle.getProof(allowlistData, position);
        nft.privateMint{value: NFT_PRICE}(testingAddress, allowance, proof);
    }

    /// if the minting period is in the waitlist, waitlisted users should be able to mint
    function testWaitlistMintWaitlisted() public {
        nft.startWaitlistMint();

        address testingAddress = waitlist1;

        uint256 position = userPositionMap[testingAddress];
        uint256 allowance = userAllowanceMap[testingAddress];

        bytes32[] memory proof = merkle.getProof(allowlistData, position);
        nft.privateMint{value: NFT_PRICE}(testingAddress, allowance, proof);
    }

    //if the minting period is in the waitlist, allowlisted users should *still* be able to mint
    function testWaitlistMintAllowlisted() public {
        nft.startWaitlistMint();

        address testingAddress = allowlist1;

        uint256 position = userPositionMap[testingAddress];
        uint256 allowance = userAllowanceMap[testingAddress];

        bytes32[] memory proof = merkle.getProof(allowlistData, position);
        nft.privateMint{value: NFT_PRICE}(testingAddress, allowance, proof);
    }

    /// if the user is on the allowlist, they should be able to mint immediately
    function testAllowlistMint() public {
        address testingAddress = allowlist1;

        uint256 position = userPositionMap[testingAddress];
        uint256 allowance = userAllowanceMap[testingAddress];

        bytes32[] memory proof = merkle.getProof(allowlistData, position);
        nft.privateMint{value: NFT_PRICE}(testingAddress, allowance, proof);
    }

    /// if the total supply has been minted, further mints should fail
    function testFailMaxSupplyReached() public {
        uint256 slot = stdstore
            .target(address(nft))
            .sig("currentTokenId()")
            .find();
        bytes32 loc = bytes32(slot);
        bytes32 mockedCurrentTokenId = bytes32(abi.encode(NFT_SUPPLY));
        vm.store(address(nft), loc, mockedCurrentTokenId);

        nft.startPublicMint();
        nft.mint{value: NFT_PRICE}(address(1));
    }

    //if trying to mint to the zero address, minting should fail
    function testFailMintToZeroAddress() public {
        nft.mint{value: NFT_PRICE}(address(0));
    }

    //if a user successfully mints, verify that they become the owner of the nft
    function testNewMintOwnerRegistered() public {
        nft.startPublicMint();
        nft.mint{value: NFT_PRICE}(address(1));
        uint256 slotOfNewOwner = stdstore
            .target(address(nft))
            .sig(nft.ownerOf.selector)
            .with_key(1)
            .find();

        uint160 ownerOfTokenIdOne = uint160(
            uint256(
                (vm.load(address(nft), bytes32(abi.encode(slotOfNewOwner))))
            )
        );
        assertEq(address(ownerOfTokenIdOne), address(1));
    }

    /// if a user mints, they should not be able to mint again
    function testFailSecondMint() public {
        nft.startPublicMint();

        nft.mint{value: NFT_PRICE}(address(1));
        uint256 slotBalance = stdstore
            .target(address(nft))
            .sig(nft.balanceOf.selector)
            .with_key(address(1))
            .find();

        uint256 balanceFirstMint = uint256(
            vm.load(address(nft), bytes32(slotBalance))
        );
        assertEq(balanceFirstMint, 1);

        //This should fail
        nft.mint{value: NFT_PRICE}(address(1));
    }

    /// if a contract implements the erc721received function, it should be able to be minted to
    function testSafeContractReceiver() public {
        nft.startPublicMint();

        Receiver receiver = new Receiver();
        nft.mint{value: NFT_PRICE}(address(receiver));
        uint256 slotBalance = stdstore
            .target(address(nft))
            .sig(nft.balanceOf.selector)
            .with_key(address(receiver))
            .find();

        uint256 balance = uint256(vm.load(address(nft), bytes32(slotBalance)));
        assertEq(balance, 1);
    }

    /// contracts should not be able to receive this NFT if they dont implement erc721 received
    function testFailUnSafeContractReceiver() public {
        nft.startPublicMint();

        vm.etch(address(1), bytes("mock code"));
        nft.mint{value: NFT_PRICE}(address(1));
    }

    /// if there is a balance, the owner should be able to withdraw it
    function testWithdrawalWorksAsOwner() public {
        nft.startPublicMint();

        // Mint an NFT, sending eth to the contract
        Receiver receiver = new Receiver();
        address payable payee = payable(address(0x55));
        uint256 priorPayeeBalance = payee.balance;
        nft.mint{value: NFT_PRICE}(address(receiver));

        // Check that the balance of the contract is correct
        assertEq(address(nft).balance, NFT_PRICE);
        uint256 nftBalance = address(nft).balance;

        // Withdraw the balance and assert it was transferred
        nft.withdrawPayments(payee);
        assertEq(payee.balance, priorPayeeBalance + nftBalance);
    }

    /// if there is a balance, a non-owner should not be able to withdraw from it
    function testWithdrawalFailsAsNotOwner() public {
        nft.startPublicMint();

        // Mint an NFT, sending eth to the contract
        Receiver receiver = new Receiver();
        nft.mint{value: NFT_PRICE}(address(receiver));
        // Check that the balance of the contract is correct
        assertEq(address(nft).balance, NFT_PRICE);

        // Confirm that a non-owner cannot withdraw
        vm.expectRevert("Ownable: caller is not the owner");
        vm.startPrank(address(0x55));
        nft.withdrawPayments(payable(address(0x55)));
        vm.stopPrank();
    }
}

/// a contract that can be used to test the erc721 received function
contract Receiver is IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 id,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
