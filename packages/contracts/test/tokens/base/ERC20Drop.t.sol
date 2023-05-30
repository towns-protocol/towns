// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

//interfaces

//libraries

//contracts
import {TestUtils} from "contracts/test/utils/TestUtils.sol";
import {MockERC20} from "contracts/test/mocks/MockERC20.sol";
import {ERC20Drop} from "contracts/src/tokens/base/ERC20Drop.sol";

contract ERC20DropTest is TestUtils {
  string internal constant NAME = "Test";
  string internal constant SYMBOL = "TST";

  ERC20Drop internal _erc20Drop;
  MockERC20 internal _mockERC20;

  address internal deployer;

  uint256 internal recipientPrivateKey;
  address internal receiver;

  // permit variables
  bytes32 internal typeHashEIP712;
  bytes32 internal domainSeparator;

  bytes32 internal permitTypeHash;
  bytes32 internal permitNameHash;
  bytes32 internal permitVersionHash;

  function setUp() public {
    deployer = _randomAddress();

    recipientPrivateKey = _randomUint256();
    receiver = vm.addr(recipientPrivateKey);

    vm.prank(deployer);
    _erc20Drop = new ERC20Drop(NAME, SYMBOL, deployer);
    _mockERC20 = new MockERC20("MockERC20", "M20");

    // setup permit variables
    typeHashEIP712 = keccak256(
      "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    permitTypeHash = keccak256(
      "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
    );
    permitNameHash = keccak256(bytes(NAME));
    permitVersionHash = keccak256("1");
  }

  function test_claimForFree() public {
    uint256 amountToClaim = 1;

    uint256 totalSupply = _erc20Drop.totalSupply();
    uint256 receiverBalance = _erc20Drop.balanceOf(receiver);

    // create a merkle tree with a single recipient and values that will be checked in the claim
    // Here I can say only my whitelist addresses can claim tokens and I can set the limit per wallet, price per token and currency
    address[] memory recipients = new address[](1);
    recipients[0] = receiver;

    uint256 merkleLimitPerWallet = 2;
    uint256 merklePricePerToken = 0;
    address merkleCurrency = address(0);

    (bytes32 root, bytes32[][] memory tree) = _constructTree({
      members: recipients,
      limitPerWallet: merkleLimitPerWallet,
      pricePerToken: merklePricePerToken,
      currency: merkleCurrency
    });

    // create my set of conditions
    ERC20Drop.ClaimCondition[]
      memory conditions = new ERC20Drop.ClaimCondition[](2);

    // first condition, only my whitelist addresses can claim tokens
    conditions[0].startTimestamp = 1;
    conditions[0].maxClaimableSupply = 2;
    conditions[0].merkleRoot = root;

    // second condition, anyone can claim tokens, but only 1 token per wallet
    conditions[1].startTimestamp = 2;
    conditions[1].maxClaimableSupply = 1;
    conditions[1].limitPerWallet = 1;

    // set the conditions
    vm.prank(deployer);
    _erc20Drop.setClaimConditions(conditions, false);

    // claim tokens
    ERC20Drop.AllowlistProof memory proof;
    proof.proof = _getProof(tree, 0);
    proof.limitPerWallet = merkleLimitPerWallet;

    vm.prank(receiver);
    _erc20Drop.claim(receiver, amountToClaim, address(0), 0, proof, "");

    assertEq(_erc20Drop.totalSupply(), totalSupply + amountToClaim);
    assertEq(_erc20Drop.balanceOf(receiver), receiverBalance + amountToClaim);
  }

  function test_claimWithERC20() public {
    address claimer = _randomAddress();
    uint256 amountToClaim = 10 ether;

    uint256 totalSupply = _erc20Drop.totalSupply();
    uint256 receiverBalance = _erc20Drop.balanceOf(receiver);

    bytes32[] memory proofs = new bytes32[](0);
    ERC20Drop.AllowlistProof memory alp;
    alp.proof = proofs;

    // create my set of conditions
    ERC20Drop.ClaimCondition[]
      memory conditions = new ERC20Drop.ClaimCondition[](1);
    conditions[0].maxClaimableSupply = 100 ether;
    conditions[0].limitPerWallet = 100 ether;
    conditions[0].pricePerToken = 1 ether;
    conditions[0].currency = address(_mockERC20);

    uint256 totalPrice = (conditions[0].pricePerToken * amountToClaim) /
      1 ether;

    // set the conditions
    vm.prank(deployer);
    _erc20Drop.setClaimConditions(conditions, false);

    // mint erc20 to claimer, and approve with ERC20Drop
    _mockERC20.mint(claimer, 100 ether);

    vm.prank(claimer);
    _mockERC20.approve(address(_erc20Drop), totalPrice);

    // claim tokens and send them to receiver
    vm.prank(claimer);
    _erc20Drop.claim(
      receiver,
      amountToClaim,
      address(_mockERC20),
      1 ether,
      alp,
      ""
    );

    assertEq(_erc20Drop.totalSupply(), totalSupply + amountToClaim);
    assertEq(_erc20Drop.balanceOf(receiver), receiverBalance + amountToClaim);
    assertEq(_mockERC20.balanceOf(claimer), 100 ether - totalPrice);
  }

  function test_claimWithNativeToken() public {
    address claimer = _randomAddress();
    uint256 amountToClaim = 10 ether;

    uint256 totalSupply = _erc20Drop.totalSupply();
    uint256 receiverBalance = _erc20Drop.balanceOf(receiver);

    bytes32[] memory proofs = new bytes32[](0);
    ERC20Drop.AllowlistProof memory alp;
    alp.proof = proofs;

    // create my set of conditions
    ERC20Drop.ClaimCondition[]
      memory conditions = new ERC20Drop.ClaimCondition[](1);
    conditions[0].maxClaimableSupply = 100 ether;
    conditions[0].limitPerWallet = 100 ether;
    conditions[0].pricePerToken = 1 ether;
    conditions[0].currency = address(NATIVE_TOKEN);

    uint256 totalPrice = (conditions[0].pricePerToken * amountToClaim) /
      1 ether;

    // set the conditions
    vm.prank(deployer);
    _erc20Drop.setClaimConditions(conditions, false);

    vm.deal(claimer, totalPrice);

    // claim tokens and send them to receiver
    vm.prank(claimer);
    _erc20Drop.claim{value: totalPrice}(
      receiver,
      amountToClaim,
      address(NATIVE_TOKEN),
      1 ether,
      alp,
      ""
    );

    assertEq(_erc20Drop.totalSupply(), totalSupply + amountToClaim);
    assertEq(_erc20Drop.balanceOf(receiver), receiverBalance + amountToClaim);
    assertEq(claimer.balance, 0);
  }

  // =============================================================
  //                           Burn
  // =============================================================
  function test_burn() public {
    address claimer = _randomAddress();
    uint256 amountToClaim = 10 ether;

    bytes32[] memory proofs = new bytes32[](0);
    ERC20Drop.AllowlistProof memory alp;
    alp.proof = proofs;

    // create my set of conditions
    ERC20Drop.ClaimCondition[]
      memory conditions = new ERC20Drop.ClaimCondition[](1);
    conditions[0].maxClaimableSupply = 100 ether;
    conditions[0].limitPerWallet = 100 ether;

    // set the conditions
    vm.prank(deployer);
    _erc20Drop.setClaimConditions(conditions, false);

    // claim tokens and send them to receiver
    vm.prank(claimer);
    _erc20Drop.claim(receiver, amountToClaim, address(0), 0, alp, "");

    // burn tokens
    uint256 totalSupply = _erc20Drop.totalSupply();
    uint256 receiverBalance = _erc20Drop.balanceOf(receiver);

    vm.prank(receiver);
    _erc20Drop.burn(amountToClaim);

    assertEq(_erc20Drop.totalSupply(), totalSupply - amountToClaim);
    assertEq(_erc20Drop.balanceOf(receiver), receiverBalance - amountToClaim);
  }

  function test_burnNothing() public {
    vm.expectRevert("ERC20Base: not enough balance");
    vm.prank(receiver);
    _erc20Drop.burn(1);
  }

  // =============================================================
  //                           Permit
  // =============================================================

  function test_permit() public {
    address owner = receiver;
    address spender = _randomAddress();
    uint256 value = 1 ether;
    uint256 deadline = block.timestamp + 1000;

    uint256 nonce = _erc20Drop.nonces(owner);

    domainSeparator = keccak256(
      abi.encode(
        typeHashEIP712,
        permitNameHash,
        permitVersionHash,
        block.chainid,
        address(_erc20Drop)
      )
    );

    bytes32 structHash = keccak256(
      abi.encode(permitTypeHash, owner, spender, value, nonce, deadline)
    );

    bytes32 typedDataHash = keccak256(
      abi.encodePacked("\x19\x01", domainSeparator, structHash)
    );

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(
      recipientPrivateKey,
      typedDataHash
    );

    // call permit to approve value to spender
    _erc20Drop.permit(owner, spender, value, deadline, v, r, s);

    // check allowance
    uint256 allowance = _erc20Drop.allowance(owner, spender);
    assertEq(allowance, value);
    assertEq(_erc20Drop.nonces(owner), nonce + 1);
  }

  function test_revertPermitIncorrectKey() public {
    uint256 wrongPrivateKey = _randomUint256();

    // generate signature
    address owner = receiver;
    address spender = _randomAddress();
    uint256 value = 1 ether;
    uint256 deadline = block.timestamp + 1000;

    uint256 nonce = _erc20Drop.nonces(owner);

    domainSeparator = keccak256(
      abi.encode(
        typeHashEIP712,
        permitNameHash,
        permitVersionHash,
        block.chainid,
        address(_erc20Drop)
      )
    );

    bytes32 structHash = keccak256(
      abi.encode(permitTypeHash, owner, spender, value, nonce, deadline)
    );

    bytes32 typedDataHash = keccak256(
      abi.encodePacked("\x19\x01", domainSeparator, structHash)
    );

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, typedDataHash);

    // call permit to approve value to spender
    vm.expectRevert("ERC20Permit: invalid signature");
    _erc20Drop.permit(owner, spender, value, deadline, v, r, s);
  }

  function test_revertUsedNonce() public {
    address owner = receiver;
    address spender = _randomAddress();
    uint256 value = 1 ether;
    uint256 deadline = block.timestamp + 1000;

    uint256 nonce = _erc20Drop.nonces(owner);

    domainSeparator = keccak256(
      abi.encode(
        typeHashEIP712,
        permitNameHash,
        permitVersionHash,
        block.chainid,
        address(_erc20Drop)
      )
    );

    bytes32 structHash = keccak256(
      abi.encode(permitTypeHash, owner, spender, value, nonce, deadline)
    );

    bytes32 typedDataHash = keccak256(
      abi.encodePacked("\x19\x01", domainSeparator, structHash)
    );

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(
      recipientPrivateKey,
      typedDataHash
    );

    // call permit to approve value to spender
    _erc20Drop.permit(owner, spender, value, deadline, v, r, s);

    // check allowance
    uint256 allowance = _erc20Drop.allowance(owner, spender);
    assertEq(allowance, value);
    assertEq(_erc20Drop.nonces(owner), nonce + 1);

    // call permit again with same nonce
    vm.expectRevert("ERC20Permit: invalid signature");
    _erc20Drop.permit(owner, spender, value, deadline, v, r, s);
  }

  function test_revertExpiredDeadline() public {
    address owner = receiver;
    address spender = _randomAddress();
    uint256 value = 1 ether;
    uint256 deadline = block.timestamp + 1000;

    uint256 nonce = _erc20Drop.nonces(owner);

    domainSeparator = keccak256(
      abi.encode(
        typeHashEIP712,
        permitNameHash,
        permitVersionHash,
        block.chainid,
        address(_erc20Drop)
      )
    );

    bytes32 structHash = keccak256(
      abi.encode(permitTypeHash, owner, spender, value, nonce, deadline)
    );

    bytes32 typedDataHash = keccak256(
      abi.encodePacked("\x19\x01", domainSeparator, structHash)
    );

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(
      recipientPrivateKey,
      typedDataHash
    );

    vm.warp(deadline + 1);
    vm.expectRevert("ERC20Permit: expired deadline");
    _erc20Drop.permit(owner, spender, value, deadline, v, r, s);
  }

  // =============================================================
  //                           Internal
  // =============================================================
  function _constructTree(
    address[] memory members,
    uint256 limitPerWallet,
    uint256 pricePerToken,
    address currency
  ) internal pure returns (bytes32 root, bytes32[][] memory tree) {
    require(members.length != 0, "members must not be empty");
    uint256 height = 0;
    {
      uint256 n = members.length;
      while (n != 0) {
        n = n == 1 ? 0 : (n + 1) / 2;
        ++height;
      }
    }
    tree = new bytes32[][](height);
    bytes32[] memory nodes = tree[0] = new bytes32[](members.length);
    for (uint256 i = 0; i < members.length; ++i) {
      nodes[i] = keccak256(
        abi.encodePacked(members[i], limitPerWallet, pricePerToken, currency)
      );
    }
    for (uint256 h = 1; h < height; ++h) {
      uint256 nHashes = (nodes.length + 1) / 2;
      bytes32[] memory hashes = new bytes32[](nHashes);
      for (uint256 i = 0; i < nodes.length; i += 2) {
        bytes32 a = nodes[i];

        bytes32 b = i + 1 < nodes.length ? nodes[i + 1] : bytes32(0);

        hashes[i / 2] = keccak256(a > b ? abi.encode(b, a) : abi.encode(a, b));
      }
      tree[h] = nodes = hashes;
    }
    root = tree[height - 1][0];
  }

  function _getProof(
    bytes32[][] memory tree,
    uint256 memberIndex
  ) internal pure returns (bytes32[] memory proof) {
    uint256 leafIndex = memberIndex;
    uint256 height = tree.length;
    proof = new bytes32[](height - 1);
    for (uint256 h = 0; h < proof.length; ++h) {
      uint256 siblingIndex = leafIndex % 2 == 0 ? leafIndex + 1 : leafIndex - 1;
      if (siblingIndex < tree[h].length) {
        proof[h] = tree[h][siblingIndex];
      }
      leafIndex /= 2;
    }
  }
}
