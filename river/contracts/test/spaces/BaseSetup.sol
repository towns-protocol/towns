// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {TestUtils} from "contracts/test/utils/TestUtils.sol";

import {SimpleAccountFactory} from "account-abstraction/samples/SimpleAccountFactory.sol";
import {SimpleAccount} from "account-abstraction/samples/SimpleAccount.sol";

// interfaces
import {IArchitectBase} from "contracts/src/factory/facets/architect/IArchitect.sol";
import {IEntitlementChecker} from "contracts/src/base/registry/facets/checker/IEntitlementChecker.sol";
import {IImplementationRegistry} from "contracts/src/factory/facets/registry/IImplementationRegistry.sol";
import {IWalletLink} from "contracts/src/factory/facets/wallet-link/IWalletLink.sol";
import {ISpaceOwner} from "contracts/src/spaces/facets/owner/ISpaceOwner.sol";
import {IMainnetDelegation} from "contracts/src/base/registry/facets/mainnet/IMainnetDelegation.sol";
import {INodeOperator} from "contracts/src/base/registry/facets/operator/INodeOperator.sol";
import {IEntryPoint} from "account-abstraction/interfaces/IEntryPoint.sol";
import {ICreateSpace} from "contracts/src/factory/facets/create/ICreateSpace.sol";

// libraries
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

// contracts
import {EIP712Facet} from "@river-build/diamond/src/utils/cryptography/signature/EIP712Facet.sol";
import {NodeOperatorStatus} from "contracts/src/base/registry/facets/operator/NodeOperatorStorage.sol";
import {MockMessenger} from "contracts/test/mocks/MockMessenger.sol";

// deployments
import {Architect} from "contracts/src/factory/facets/architect/Architect.sol";
import {SpaceHelper} from "contracts/test/spaces/SpaceHelper.sol";
import {RuleEntitlement} from "contracts/src/spaces/entitlements/rule/RuleEntitlement.sol";

import {SpaceOwner} from "contracts/src/spaces/facets/owner/SpaceOwner.sol";
import {ISpaceDelegation} from "contracts/src/base/registry/facets/delegation/ISpaceDelegation.sol";

// deployments
import {DeploySpaceFactory} from "contracts/scripts/deployments/diamonds/DeploySpaceFactory.s.sol";
import {DeployTownsBase} from "contracts/scripts/deployments/utils/DeployTownsBase.s.sol";
import {DeployProxyBatchDelegation} from "contracts/scripts/deployments/utils/DeployProxyBatchDelegation.s.sol";
import {DeployBaseRegistry} from "contracts/scripts/deployments/diamonds/DeployBaseRegistry.s.sol";
import {DeployRiverAirdrop} from "contracts/scripts/deployments/diamonds/DeployRiverAirdrop.s.sol";

/*
 * @notice - This is the base setup to start testing the entire suite of contracts
 * @dev - This contract is inherited by all other test contracts, it will create one diamond contract which represent the factory contract that creates all spaces
 */
contract BaseSetup is TestUtils, SpaceHelper {
  uint256 internal constant FREE_ALLOCATION = 1_000;
  string public constant LINKED_WALLET_MESSAGE = "Link your external wallet";
  bytes32 private constant _LINKED_WALLET_TYPEHASH =
    0x6bb89d031fcd292ecd4c0e6855878b7165cebc3a2f35bc6bbac48c088dd8325c;
  bytes32 private constant _TYPE_HASH =
    keccak256(
      "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

  DeployBaseRegistry internal deployBaseRegistry = new DeployBaseRegistry();
  DeploySpaceFactory internal deploySpaceFactory = new DeploySpaceFactory();
  DeployTownsBase internal deployTokenBase = new DeployTownsBase();
  DeployProxyBatchDelegation internal deployProxyBatchDelegation =
    new DeployProxyBatchDelegation();
  DeployRiverAirdrop internal deployRiverAirdrop = new DeployRiverAirdrop();

  address[] internal operators;
  address[] internal nodes;

  address internal deployer;
  address internal founder;
  address internal space;
  address internal everyoneSpace;
  address internal spaceFactory;

  address internal userEntitlement;
  address internal ruleEntitlement;
  address internal legacyRuleEntitlement;

  address internal spaceOwner;

  address internal baseRegistry;
  address internal townsToken;
  address internal bridge;
  address internal association;
  address internal vault;

  address internal mainnetProxyDelegation;
  address internal claimers;
  address internal mainnetRiverToken;

  address internal pricingModule;
  address internal fixedPricingModule;
  address internal tieredPricingModule;

  address internal riverAirdrop;

  SimpleAccountFactory internal simpleAccountFactory;

  IEntitlementChecker internal entitlementChecker;
  IImplementationRegistry internal implementationRegistry;
  IWalletLink internal walletLink;
  INodeOperator internal nodeOperator;
  EIP712Facet eip712Facet;

  MockMessenger internal messenger;

  // @notice - This function is called before each test function
  // @dev - It will create a new diamond contract and set the spaceFactory variable to the address of the "diamond" variable
  function setUp() public virtual {
    deployer = getDeployer();

    operators = _createAccounts(10);

    // Simple Account Factory
    simpleAccountFactory = new SimpleAccountFactory(
      IEntryPoint(_randomAddress())
    );

    // River Token
    townsToken = deployTokenBase.deploy(deployer);

    // Base Registry
    deployBaseRegistry.setDependencies({riverToken_: townsToken});
    baseRegistry = deployBaseRegistry.deploy(deployer);
    entitlementChecker = IEntitlementChecker(baseRegistry);
    nodeOperator = INodeOperator(baseRegistry);

    // Mainnet
    messenger = MockMessenger(deployBaseRegistry.messenger());
    deployProxyBatchDelegation.setDependencies({
      mainnetDelegation_: baseRegistry,
      messenger_: address(messenger)
    });
    mainnetProxyDelegation = deployProxyBatchDelegation.deploy(deployer);
    mainnetRiverToken = deployProxyBatchDelegation.townsToken();
    vault = deployProxyBatchDelegation.vault();
    claimers = deployProxyBatchDelegation.claimers();

    // Space Factory Diamond
    spaceFactory = deploySpaceFactory.deploy(deployer);
    userEntitlement = deploySpaceFactory.userEntitlement();
    ruleEntitlement = deploySpaceFactory.ruleEntitlement();
    legacyRuleEntitlement = deploySpaceFactory.legacyRuleEntitlement();
    spaceOwner = deploySpaceFactory.spaceOwner();
    pricingModule = deploySpaceFactory.tieredLogPricingV3();
    fixedPricingModule = deploySpaceFactory.fixedPricing();
    walletLink = IWalletLink(spaceFactory);
    implementationRegistry = IImplementationRegistry(spaceFactory);
    eip712Facet = EIP712Facet(spaceFactory);

    // River Airdrop
    deployRiverAirdrop.setBaseRegistry(baseRegistry);
    deployRiverAirdrop.setSpaceFactory(spaceFactory);
    riverAirdrop = deployRiverAirdrop.deploy(deployer);

    // Base Registry Diamond
    bridge = deployTokenBase.bridgeBase();

    // POST DEPLOY
    vm.startPrank(deployer);
    ISpaceOwner(spaceOwner).setFactory(spaceFactory);
    IImplementationRegistry(spaceFactory).addImplementation(baseRegistry);
    IImplementationRegistry(spaceFactory).addImplementation(riverAirdrop);
    ISpaceDelegation(baseRegistry).setRiverToken(townsToken);
    ISpaceDelegation(baseRegistry).setMainnetDelegation(baseRegistry);
    IMainnetDelegation(baseRegistry).setProxyDelegation(mainnetProxyDelegation);
    ISpaceDelegation(baseRegistry).setSpaceFactory(spaceFactory);
    MockMessenger(messenger).setXDomainMessageSender(mainnetProxyDelegation);
    vm.stopPrank();

    // create a new space
    founder = _randomAddress();

    // Create the arguments necessary for creating a space
    IArchitectBase.SpaceInfo memory spaceInfo = _createSpaceInfo(
      "BaseSetupSpace"
    );
    spaceInfo.membership.settings.pricingModule = pricingModule;

    IArchitectBase.SpaceInfo
      memory everyoneSpaceInfo = _createEveryoneSpaceInfo(
        "BaseSetupEveryoneSpace"
      );
    everyoneSpaceInfo.membership.settings.pricingModule = fixedPricingModule;
    everyoneSpaceInfo.membership.settings.freeAllocation = FREE_ALLOCATION;

    vm.startPrank(founder);
    // create a dummy space so the next one starts at 1
    ICreateSpace(spaceFactory).createSpace(spaceInfo);
    space = ICreateSpace(spaceFactory).createSpace(spaceInfo);
    everyoneSpace = ICreateSpace(spaceFactory).createSpace(everyoneSpaceInfo);
    vm.stopPrank();
  }

  function _registerOperators() internal {
    for (uint256 i = 0; i < operators.length; i++) {
      vm.prank(operators[i]);
      nodeOperator.registerOperator(operators[i]);
      vm.prank(deployer);
      nodeOperator.setOperatorStatus(operators[i], NodeOperatorStatus.Approved);
    }
  }

  function _registerNodes() internal {
    nodes = new address[](operators.length);

    for (uint256 i = 0; i < operators.length; i++) {
      nodes[i] = _randomAddress();
      vm.startPrank(operators[i]);
      entitlementChecker.registerNode(nodes[i]);
      vm.stopPrank();
    }
  }

  function _signWalletLink(
    uint256 privateKey,
    address newWallet,
    uint256 nonce
  ) internal view returns (bytes memory) {
    (
      ,
      string memory name,
      string memory version,
      uint256 chainId,
      address verifyingContract,
      ,

    ) = eip712Facet.eip712Domain();

    bytes32 linkedWalletHash = _getLinkedWalletTypedDataHash(
      LINKED_WALLET_MESSAGE,
      newWallet,
      nonce
    );
    bytes32 typeDataHash = MessageHashUtils.toTypedDataHash(
      _getDomainSeparator(name, version, chainId, verifyingContract),
      linkedWalletHash
    );

    (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, typeDataHash);

    return abi.encodePacked(r, s, v);
  }

  // https://eips.ethereum.org/EIPS/eip-5267
  function _getDomainSeparator(
    string memory name,
    string memory version,
    uint256 chainId,
    address verifyingContract
  ) public pure returns (bytes32) {
    bytes32 nameHash = keccak256(abi.encodePacked(name));
    bytes32 versionHash = keccak256(abi.encodePacked(version));

    return
      keccak256(
        abi.encode(
          _TYPE_HASH,
          nameHash,
          versionHash,
          chainId,
          verifyingContract
        )
      );
  }

  function _getLinkedWalletTypedDataHash(
    string memory message,
    address addr,
    uint256 nonce
  ) internal pure returns (bytes32) {
    // https://eips.ethereum.org/EIPS/eip-712
    // ATTENTION: "The dynamic values bytes and string are encoded as a keccak256 hash of their contents."
    // in this case, the message is a string, so it is keccak256 hashed
    return
      keccak256(
        abi.encode(
          _LINKED_WALLET_TYPEHASH,
          keccak256(bytes(message)),
          addr,
          nonce
        )
      );
  }

  function _createSimpleAccount(
    address owner
  ) internal returns (SimpleAccount) {
    return simpleAccountFactory.createAccount(owner, _randomUint256());
  }
}
