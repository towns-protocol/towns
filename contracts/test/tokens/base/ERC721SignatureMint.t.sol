// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries
import {Strings} from "openzeppelin-contracts/contracts/utils/Strings.sol";

//contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {MockERC20} from "contracts/test/mocks/MockERC20.sol";
import {ERC721SignatureMint} from "contracts/src/tokens/base/ERC721SignatureMint.sol";
import {ISignatureMintERC721} from "contracts/src/utils/interfaces/ISignatureMintERC721.sol";

contract ERC721SignatureMintTest is TestUtils {
  using Strings for uint256;

  ERC721SignatureMint private _erc721;
  MockERC20 private _mockERC20;

  bytes32 internal typehashMintRequest;
  bytes32 internal nameHash;
  bytes32 internal versionHash;
  bytes32 internal typehashEip712;
  bytes32 internal domainSeparator;

  ISignatureMintERC721.MintRequest private _mintRequest;
  bytes internal _signature;

  string internal constant NAME = "Test";
  string internal constant SYMBOL = "TST";
  uint256 internal royaltyAmount;
  address internal royaltyReceiver;
  address internal saleReceiver;
  uint256 internal signerPrivateKey;
  address internal signer;
  address internal receiver;

  function setUp() public {
    _mockERC20 = new MockERC20("MockERC20", "M20");

    royaltyAmount = 500; // 5%
    royaltyReceiver = _randomAddress();
    saleReceiver = _randomAddress();
    signerPrivateKey = _randomUint256();
    signer = vm.addr(signerPrivateKey);
    receiver = _randomAddress();

    // deploy ERC721SignatureMint
    vm.prank(signer);
    _erc721 = new ERC721SignatureMint(
      NAME,
      SYMBOL,
      royaltyReceiver,
      royaltyAmount,
      saleReceiver
    );

    // mint ERC20 to receiver
    _mockERC20.mint(receiver, 1000);

    // deal eth to receiver
    vm.deal(receiver, 1_000);

    // create typehash for mint request
    // solhint-disable max-line-length
    typehashMintRequest = keccak256(
      "MintRequest(address to,address royaltyReceiver,uint256 royaltyValue,address primarySaleReceiver,string uri,uint256 quantity,uint256 pricePerToken,address currency,uint128 validityStartTimestamp,uint128 validityEndTimestamp,bytes32 uid)"
    );
    // solhint-enable max-line-length

    // create domain separator
    nameHash = keccak256(bytes("SignatureMintERC721"));
    versionHash = keccak256(bytes("1"));
    typehashEip712 = keccak256(
      "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );
    domainSeparator = keccak256(
      abi.encode(
        typehashEip712,
        nameHash,
        versionHash,
        block.chainid,
        address(_erc721)
      )
    );

    // create mint request allowing the receiver to mint 1 token via signature from the signer
    _mintRequest = ISignatureMintERC721.MintRequest({
      to: receiver,
      royaltyReceiver: royaltyReceiver,
      royaltyValue: royaltyAmount,
      primarySaleReceiver: saleReceiver,
      uri: "ipfs://",
      quantity: 1,
      pricePerToken: 0,
      currency: address(0),
      validityStartTimestamp: 1000,
      validityEndTimestamp: 2000,
      uid: bytes32(0)
    });

    // sign mint request with signer's private key
    _signature = signMintRequest(_mintRequest, signerPrivateKey);
  }

  function signMintRequest(
    ERC721SignatureMint.MintRequest memory _request,
    uint256 _privateKey
  ) internal view returns (bytes memory) {
    bytes memory encodedRequest = abi.encode(
      typehashMintRequest,
      _request.to,
      _request.royaltyReceiver,
      _request.royaltyValue,
      _request.primarySaleReceiver,
      keccak256(bytes(_request.uri)),
      _request.quantity,
      _request.pricePerToken,
      _request.currency,
      _request.validityStartTimestamp,
      _request.validityEndTimestamp,
      _request.uid
    );
    bytes32 structHash = keccak256(encodedRequest);
    bytes32 typeDataHash = keccak256(
      abi.encodePacked("\x19\x01", domainSeparator, structHash)
    );

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(_privateKey, typeDataHash);
    bytes memory sig = abi.encodePacked(r, s, v);

    return sig;
  }

  function test_mintWithSignatureNoPricePaid() public {
    // warp to start time
    vm.warp(_mintRequest.validityStartTimestamp);

    uint256 nextTokenId = _erc721.nextTokenId();
    uint256 currentSupply = _erc721.totalSupply();
    uint256 currentBalance = _erc721.balanceOf(receiver);

    // mint token
    vm.prank(_randomAddress());
    _erc721.mintWithSignature(_mintRequest, _signature);

    assertEq(_erc721.nextTokenId(), nextTokenId + _mintRequest.quantity);
    assertEq(_erc721.totalSupply(), currentSupply + _mintRequest.quantity);
    assertEq(
      _erc721.tokenURI(nextTokenId),
      string(abi.encodePacked("ipfs://"))
    );
    assertEq(
      _erc721.balanceOf(receiver),
      currentBalance + _mintRequest.quantity
    );
    assertEq(_erc721.ownerOf(nextTokenId), receiver);
  }

  function test_mintWithSignaturePayWithERC20() public {
    // warp to start time
    vm.warp(_mintRequest.validityStartTimestamp);

    // set price per token and currency to ERC20
    _mintRequest.pricePerToken = 1;
    _mintRequest.currency = address(_mockERC20);

    // sign mint request with signer's private key
    _signature = signMintRequest(_mintRequest, signerPrivateKey);

    // allow ERC721 to spend ERC20 from receiver
    vm.prank(receiver);
    _mockERC20.approve(address(_erc721), 1);

    uint256 nextTokenId = _erc721.nextTokenId();
    uint256 currentSupply = _erc721.totalSupply();
    uint256 currentBalance = _erc721.balanceOf(receiver);

    vm.prank(receiver);
    _erc721.mintWithSignature(_mintRequest, _signature);

    assertEq(_erc721.nextTokenId(), nextTokenId + _mintRequest.quantity);
    assertEq(_erc721.totalSupply(), currentSupply + _mintRequest.quantity);
    assertEq(
      _erc721.tokenURI(nextTokenId),
      string(abi.encodePacked("ipfs://"))
    );
    assertEq(
      _erc721.balanceOf(receiver),
      currentBalance + _mintRequest.quantity
    );
    assertEq(_erc721.ownerOf(nextTokenId), receiver);
  }

  function test_mintWithSignaturePayWithNative() public {
    // warp to start time
    vm.warp(_mintRequest.validityStartTimestamp);

    // set price per token and currency to native
    _mintRequest.pricePerToken = 1;
    _mintRequest.currency = address(NATIVE_TOKEN);

    // sign mint request with signer's private key
    _signature = signMintRequest(_mintRequest, signerPrivateKey);

    uint256 nextTokenId = _erc721.nextTokenId();
    uint256 currentSupply = _erc721.totalSupply();
    uint256 currentBalance = _erc721.balanceOf(receiver);

    vm.prank(receiver);
    _erc721.mintWithSignature{value: _mintRequest.pricePerToken}(
      _mintRequest,
      _signature
    );

    assertEq(_erc721.nextTokenId(), nextTokenId + _mintRequest.quantity);
    assertEq(_erc721.totalSupply(), currentSupply + _mintRequest.quantity);
    assertEq(
      _erc721.tokenURI(nextTokenId),
      string(abi.encodePacked("ipfs://"))
    );
    assertEq(
      _erc721.balanceOf(receiver),
      currentBalance + _mintRequest.quantity
    );
    assertEq(_erc721.ownerOf(nextTokenId), receiver);
  }

  function test_revertMintWithSignatureNoPricePaid() public {
    // warp to start time
    vm.warp(_mintRequest.validityStartTimestamp);

    // set price per token and currency to native
    _mintRequest.pricePerToken = 1;
    _mintRequest.currency = address(NATIVE_TOKEN);

    // sign mint request with signer's private key
    _signature = signMintRequest(_mintRequest, signerPrivateKey);

    // revert mint token
    vm.prank(receiver);
    vm.expectRevert("ERC721SignatureMint: insufficient value");
    _erc721.mintWithSignature{value: 0}(_mintRequest, _signature);
  }

  function test_revertMintWithSignatureQuantityZero() public {
    // warp to start time
    vm.warp(_mintRequest.validityStartTimestamp);

    // set quantity to 0
    _mintRequest.quantity = 0;

    // sign mint request with signer's private key
    _signature = signMintRequest(_mintRequest, signerPrivateKey);

    // revert mint token
    vm.prank(receiver);
    vm.expectRevert("ERC721SignatureMint: quantity must be 1");
    _erc721.mintWithSignature(_mintRequest, _signature);
  }
}
