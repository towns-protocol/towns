// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// utils
import {TestUtils} from "@towns-protocol/diamond/test/TestUtils.sol";
import {EIP712Utils} from "@towns-protocol/diamond/test/facets/signature/EIP712Utils.sol";
import {SimpleAccount} from "account-abstraction/samples/SimpleAccount.sol";
import {SimpleAccountFactory} from "account-abstraction/samples/SimpleAccountFactory.sol";

// interfaces
import {IEntryPoint} from "account-abstraction/interfaces/IEntryPoint.sol";
import {IEntitlementChecker} from "src/base/registry/facets/checker/IEntitlementChecker.sol";
import {IMainnetDelegation} from "src/base/registry/facets/mainnet/IMainnetDelegation.sol";
import {INodeOperator} from "src/base/registry/facets/operator/INodeOperator.sol";
import {ISpaceDelegation} from "src/base/registry/facets/delegation/ISpaceDelegation.sol";
import {IArchitectBase} from "src/factory/facets/architect/IArchitect.sol";
import {ICreateSpace} from "src/factory/facets/create/ICreateSpace.sol";
import {IImplementationRegistry} from "src/factory/facets/registry/IImplementationRegistry.sol";
import {IWalletLink} from "src/factory/facets/wallet-link/IWalletLink.sol";
import {ISpaceOwner} from "src/spaces/facets/owner/ISpaceOwner.sol";
import {ITowns} from "src/tokens/towns/mainnet/ITowns.sol";
import {IAppRegistry, IAppRegistryBase} from "src/apps/facets/registry/IAppRegistry.sol";
import {IAppAccount} from "src/spaces/facets/account/IAppAccount.sol";
import {ITownsApp} from "src/apps/ITownsApp.sol";

// libraries
import {NodeOperatorStatus} from "src/base/registry/facets/operator/NodeOperatorStorage.sol";
import {TownsLib} from "src/tokens/towns/base/TownsLib.sol";

// contracts
import {EIP712Facet} from "@towns-protocol/diamond/src/utils/cryptography/EIP712Facet.sol";
import {MockMessenger} from "test/mocks/MockMessenger.sol";

// deployments
import {SpaceHelper} from "test/spaces/SpaceHelper.sol";
import {DeployAppRegistry} from "scripts/deployments/diamonds/DeployAppRegistry.s.sol";
import {DeployBaseRegistry} from "scripts/deployments/diamonds/DeployBaseRegistry.s.sol";
import {DeployRiverAirdrop} from "scripts/deployments/diamonds/DeployRiverAirdrop.s.sol";
import {DeploySpaceFactory} from "scripts/deployments/diamonds/DeploySpaceFactory.s.sol";
import {DeployProxyBatchDelegation} from "scripts/deployments/utils/DeployProxyBatchDelegation.s.sol";
import {DeployTownsBase} from "scripts/deployments/utils/DeployTownsBase.s.sol";

/*
 * @notice - This is the base setup to start testing the entire suite of contracts
* @dev - This contract is inherited by all other test contracts, it will create one diamond contract
which represent the factory contract that creates all spaces
 */
contract BaseSetup is TestUtils, EIP712Utils, SpaceHelper {
    uint256 internal constant FREE_ALLOCATION = 1000;
    string public constant LINKED_WALLET_MESSAGE = "Link your external wallet";
    bytes32 private constant _LINKED_WALLET_TYPEHASH =
        0x6bb89d031fcd292ecd4c0e6855878b7165cebc3a2f35bc6bbac48c088dd8325c;

    DeployBaseRegistry internal deployBaseRegistry;
    DeploySpaceFactory internal deploySpaceFactory;
    DeployTownsBase internal deployTokenBase;
    DeployProxyBatchDelegation internal deployProxyBatchDelegation;
    DeployRiverAirdrop internal deployRiverAirdrop;
    DeployAppRegistry internal deployAppRegistry;

    address[] internal operators;
    address[] internal nodes;

    address internal deployer;

    uint256 internal founderPrivateKey;
    address internal founder;
    address internal space;
    address internal everyoneSpace;
    address internal spaceFactory;
    address internal spaceDiamond;

    address internal appDeveloper;
    address internal appClient;

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
    address internal appRegistry;
    SimpleAccountFactory internal simpleAccountFactory;

    IEntitlementChecker internal entitlementChecker;
    IImplementationRegistry internal implementationRegistry;
    IWalletLink internal walletLink;
    INodeOperator internal nodeOperator;
    EIP712Facet eip712Facet;

    MockMessenger internal messenger;

    // @notice - This function is called before each test function
    // @dev - It will create a new diamond contract and set the spaceFactory variable to the address
    // of the "diamond" variable
    function setUp() public virtual {
        vm.pauseGasMetering();
        deployer = getDeployer();

        operators = _createAccounts(10);

        // Simple Account Factory
        simpleAccountFactory = new SimpleAccountFactory(IEntryPoint(_randomAddress()));

        deployBaseRegistry = new DeployBaseRegistry();
        deploySpaceFactory = new DeploySpaceFactory();
        deployTokenBase = new DeployTownsBase();
        deployProxyBatchDelegation = new DeployProxyBatchDelegation();
        deployRiverAirdrop = new DeployRiverAirdrop();
        deployAppRegistry = new DeployAppRegistry();

        // River Token
        townsToken = deployTokenBase.deploy(deployer);

        // Base Registry
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

        // Mint initial supply
        vm.prank(vault);
        ITowns(mainnetRiverToken).mintInitialSupply(vault);

        // Space Factory Diamond
        spaceFactory = deploySpaceFactory.deploy(deployer);
        userEntitlement = deploySpaceFactory.userEntitlement();
        ruleEntitlement = deploySpaceFactory.ruleEntitlement();
        legacyRuleEntitlement = deploySpaceFactory.legacyRuleEntitlement();
        spaceOwner = deploySpaceFactory.spaceOwner();
        pricingModule = deploySpaceFactory.tieredLogPricingV3();
        tieredPricingModule = deploySpaceFactory.tieredLogPricingV3();
        fixedPricingModule = deploySpaceFactory.fixedPricing();
        walletLink = IWalletLink(spaceFactory);
        implementationRegistry = IImplementationRegistry(spaceFactory);
        eip712Facet = EIP712Facet(spaceFactory);
        spaceDiamond = deploySpaceFactory.spaceImpl();

        // River Airdrop
        deployRiverAirdrop.setBaseRegistry(baseRegistry);
        deployRiverAirdrop.setSpaceFactory(spaceFactory);
        riverAirdrop = deployRiverAirdrop.deploy(deployer);

        // App Registry
        deployAppRegistry.setSpaceFactory(spaceFactory);
        appRegistry = deployAppRegistry.deploy(deployer);

        // Base Registry Diamond
        bridge = TownsLib.L2_STANDARD_BRIDGE;

        // POST DEPLOY
        vm.startPrank(deployer);
        ISpaceOwner(spaceOwner).setFactory(spaceFactory);
        IImplementationRegistry(spaceFactory).addImplementation(baseRegistry);
        IImplementationRegistry(spaceFactory).addImplementation(riverAirdrop);
        IImplementationRegistry(spaceFactory).addImplementation(appRegistry);
        IMainnetDelegation(baseRegistry).setProxyDelegation(mainnetProxyDelegation);
        ISpaceDelegation(baseRegistry).setSpaceFactory(spaceFactory);
        MockMessenger(messenger).setXDomainMessageSender(mainnetProxyDelegation);
        vm.stopPrank();

        // create a new space
        founderPrivateKey = boundPrivateKey(_randomUint256());
        founder = vm.addr(founderPrivateKey);
        vm.label(founder, "founder");

        appDeveloper = makeAddr("appDeveloper");
        appClient = makeAddr("appClient");

        // Create the arguments necessary for creating a space
        IArchitectBase.SpaceInfo memory spaceInfo = _createSpaceInfo("BaseSetupSpace");
        spaceInfo.membership.settings.pricingModule = pricingModule;

        IArchitectBase.SpaceInfo memory everyoneSpaceInfo = _createEveryoneSpaceInfo(
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

        vm.label(spaceFactory, "SpaceFactory");
        vm.label(space, "Space");
        vm.label(everyoneSpace, "EveryoneSpace");

        vm.resumeGasMetering();
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
        bytes32 linkedWalletHash = _getLinkedWalletTypedDataHash(
            LINKED_WALLET_MESSAGE,
            newWallet,
            nonce
        );
        (uint8 v, bytes32 r, bytes32 s) = signIntent(
            privateKey,
            address(eip712Facet),
            linkedWalletHash
        );

        return abi.encodePacked(r, s, v);
    }

    function _getLinkedWalletTypedDataHash(
        string memory message,
        address addr,
        uint256 nonce
    ) internal pure returns (bytes32) {
        // https://eips.ethereum.org/EIPS/eip-712
        // ATTENTION: "The dynamic values bytes and string are encoded as a keccak256 hash of their
        // contents."
        // in this case, the message is a string, so it is keccak256 hashed
        return
            keccak256(abi.encode(_LINKED_WALLET_TYPEHASH, keccak256(bytes(message)), addr, nonce));
    }

    function _createSimpleAccount(address owner) internal returns (SimpleAccount) {
        return simpleAccountFactory.createAccount(owner, _randomUint256());
    }

    function _createTestApp(bytes32[] memory permissions) internal returns (address app) {
        IAppRegistryBase.AppParams memory appParams = IAppRegistryBase.AppParams({
            name: "Test App",
            permissions: permissions,
            client: appClient,
            installPrice: 0,
            accessDuration: 0
        });

        vm.prank(appDeveloper);
        (app, ) = IAppRegistry(appRegistry).createApp(appParams);
    }

    function _installAppOnEveryoneSpace(address app) internal {
        uint256 totalRequired = IAppRegistry(appRegistry).getAppPrice(app);
        vm.deal(address(founder), totalRequired);

        vm.prank(founder);
        IAppRegistry(appRegistry).installApp{value: totalRequired}({
            app: ITownsApp(app),
            account: IAppAccount(everyoneSpace),
            data: ""
        });
    }

    function _uninstallAppOnEveryoneSpace(address app) internal {
        vm.prank(founder);
        IAppRegistry(appRegistry).uninstallApp(ITownsApp(app), IAppAccount(everyoneSpace), "");
    }
}
