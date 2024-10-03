// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {Vm} from "forge-std/Test.sol";
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {DeployDiamond} from "contracts/scripts/deployments/utils/DeployDiamond.s.sol";
import {DeployMerkleAirdrop} from "contracts/scripts/deployments/facets/DeployMerkleAirdrop.s.sol";
import {DeployMockERC20} from "contracts/scripts/deployments/utils/DeployMockERC20.s.sol";
import {DeployEIP712Facet} from "contracts/scripts/deployments/facets/DeployEIP712Facet.s.sol";

//interfaces
import {IDiamond} from "contracts/src/diamond/Diamond.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IMerkleAirdropBase} from "contracts/src/utils/airdrop/merkle/IMerkleAirdrop.sol";

//libraries
import {MerkleTree} from "contracts/test/utils/MerkleTree.sol";

//contracts
import {MerkleAirdrop} from "contracts/src/utils/airdrop/merkle/MerkleAirdrop.sol";
import {MockERC20} from "contracts/test/mocks/MockERC20.sol";
import {EIP712Facet} from "contracts/src/diamond/utils/cryptography/signature/EIP712Facet.sol";
contract MerkleAirdropTest is TestUtils, IMerkleAirdropBase {
  uint256 internal constant TOTAL_TOKEN_AMOUNT = 1000;

  DeployDiamond diamondHelper = new DeployDiamond();
  DeployMerkleAirdrop airdropHelper = new DeployMerkleAirdrop();
  DeployMockERC20 tokenHelper = new DeployMockERC20();
  DeployEIP712Facet eip712Helper = new DeployEIP712Facet();
  MerkleTree internal merkleTree = new MerkleTree();

  MerkleAirdrop internal merkleAirdrop;
  MockERC20 internal token;
  EIP712Facet internal eip712Facet;

  mapping(address => uint256) internal treeIndex;
  address[] internal accounts;
  uint256[] internal amounts;

  bytes32[][] internal tree;
  bytes32 internal root;

  Vm.Wallet internal bob = vm.createWallet("bob");
  Vm.Wallet internal alice = vm.createWallet("alice");

  function setUp() public {
    // Create the Merkle tree with accounts and amounts
    _createTree();

    // Get the deployer address
    address deployer = getDeployer();

    // Deploy the mock ERC20 token
    address tokenAddress = tokenHelper.deploy(deployer);

    // Deploy the MerkleAirdrop contract
    address airdropAddress = airdropHelper.deploy(deployer);

    // Deploy the EIP712 facet
    address eip712Address = eip712Helper.deploy(deployer);

    // Add the EIP712 facet to the diamond
    diamondHelper.addFacet(
      eip712Helper.makeCut(eip712Address, IDiamond.FacetCutAction.Add),
      eip712Address,
      eip712Helper.makeInitData("MerkleAirdrop", "1.0.0")
    );

    // Add the MerkleAirdrop facet to the diamond
    diamondHelper.addFacet(
      airdropHelper.makeCut(airdropAddress, IDiamond.FacetCutAction.Add),
      airdropAddress,
      airdropHelper.makeInitData(root, tokenAddress)
    );

    // Deploy the diamond contract with the MerkleAirdrop facet
    address diamond = diamondHelper.deploy(deployer);

    // Initialize the MerkleAirdrop and token contracts
    merkleAirdrop = MerkleAirdrop(diamond);
    eip712Facet = EIP712Facet(diamond);

    // Mint tokens to the diamond
    token = MockERC20(tokenAddress);
    token.mint(diamond, TOTAL_TOKEN_AMOUNT);
  }

  modifier givenWalletHasClaimed(Vm.Wallet memory _wallet, uint256 _amount) {
    bytes memory signature = _signClaim(
      _wallet,
      _wallet.addr,
      _amount,
      address(0)
    );
    bytes32[] memory proof = merkleTree.getProof(tree, treeIndex[_wallet.addr]);

    vm.prank(_randomAddress());
    vm.expectEmit(address(merkleAirdrop));
    emit Claimed(_wallet.addr, _amount, _wallet.addr);
    merkleAirdrop.claim(_wallet.addr, _amount, proof, signature, address(0));
    _;
  }

  modifier givenWalletHasClaimedWithReceiver(
    Vm.Wallet memory _wallet,
    uint256 _amount,
    address _receiver
  ) {
    bytes memory signature = _signClaim(
      _wallet,
      _wallet.addr,
      _amount,
      _receiver
    );
    bytes32[] memory proof = merkleTree.getProof(tree, treeIndex[_wallet.addr]);

    vm.prank(_randomAddress());
    vm.expectEmit(address(merkleAirdrop));
    emit Claimed(_wallet.addr, _amount, _receiver);
    merkleAirdrop.claim(_wallet.addr, _amount, proof, signature, _receiver);
    _;
  }

  function test_getToken() external view {
    IERC20 _token = merkleAirdrop.getToken();
    assertEq(address(_token), address(token));
  }

  function test_getMerkleRoot() external view {
    bytes32 _root = merkleAirdrop.getMerkleRoot();
    assertEq(_root, root);
  }

  function test_claim() external givenWalletHasClaimed(bob, 100) {
    assertEq(token.balanceOf(bob.addr), 100);
  }

  function test_claimWithReceiver()
    external
    givenWalletHasClaimedWithReceiver(bob, 100, alice.addr)
  {
    assertEq(token.balanceOf(alice.addr), 100);
  }

  function test_revertWhen_alreadyClaimed()
    external
    givenWalletHasClaimed(bob, 100)
  {
    bytes32[] memory proof = merkleTree.getProof(tree, treeIndex[bob.addr]);
    bytes memory signature = _signClaim(bob, bob.addr, 100, address(0));

    vm.prank(bob.addr);
    vm.expectRevert(MerkleAirdrop__AlreadyClaimed.selector);
    merkleAirdrop.claim(bob.addr, 100, proof, signature, address(0));
  }

  function test_revertWhen_invalidSignature() external {
    bytes32[] memory proof = merkleTree.getProof(tree, treeIndex[bob.addr]);
    bytes memory signature = _signClaim(alice, bob.addr, 100, address(0));

    vm.expectRevert(MerkleAirdrop__InvalidSignature.selector);
    merkleAirdrop.claim(bob.addr, 100, proof, signature, address(0));
  }

  function test_revertWhen_invalidProof() external {
    bytes32[] memory proof = merkleTree.getProof(tree, treeIndex[alice.addr]);
    bytes memory signature = _signClaim(bob, bob.addr, 100, address(0));

    vm.expectRevert(MerkleAirdrop__InvalidProof.selector);
    merkleAirdrop.claim(bob.addr, 100, proof, signature, address(0));
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _createTree() internal {
    treeIndex[bob.addr] = 0;
    accounts.push(bob.addr);
    amounts.push(100);

    treeIndex[alice.addr] = 1;
    accounts.push(alice.addr);
    amounts.push(200);

    (root, tree) = merkleTree.constructTree(accounts, amounts);
  }

  function _signClaim(
    Vm.Wallet memory _wallet,
    address _account,
    uint256 _amount,
    address _receiver
  ) internal view returns (bytes memory) {
    bytes32 typeDataHash = merkleAirdrop.getMessageHash(
      _account,
      _amount,
      _receiver
    );
    (uint8 v, bytes32 r, bytes32 s) = vm.sign(_wallet.privateKey, typeDataHash);
    return abi.encodePacked(r, s, v);
  }
}
