// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.19;

// utils
import {BaseSetup} from "../../spaces/BaseSetup.sol";

//interfaces
import {IMembership} from "../../../src/spaces/facets/membership/IMembership.sol";
import {IArchitectBase} from "../../../src/factory/facets/architect/IArchitect.sol";
import {ICreateSpace} from "src/factory/facets/create/ICreateSpace.sol";
import {IERC721AQueryable} from "src/diamond/facets/token/ERC721A/extensions/IERC721AQueryable.sol";
import {IModularAccount} from "@erc6900/reference-implementation/interfaces/IModularAccount.sol";
import {ISubscriptionModuleBase} from "../../../src/apps/modules/subcription/ISubscriptionModule.sol";

//libraries
import {ValidationConfig} from "@erc6900/reference-implementation/interfaces/IModularAccount.sol";
import {ValidationConfigLib} from "@erc6900/reference-implementation/libraries/ValidationConfigLib.sol";

//contracts
import {AccountFactory} from "modular-account/src/factory/AccountFactory.sol";
import {ExecutionInstallDelegate} from "modular-account/src/helpers/ExecutionInstallDelegate.sol";
import {ModularAccount} from "modular-account/src/account/ModularAccount.sol";
import {SemiModularAccountBytecode} from "modular-account/src/account/SemiModularAccountBytecode.sol";

// modules
import {DeploySubscriptionModule} from "../../../scripts/deployments/facets/DeploySubscriptionModule.s.sol";
import {SubscriptionModule} from "../../../src/apps/modules/subcription/SubscriptionModule.sol";
import {SingleSignerValidationModule} from "modular-account/src/modules/validation/SingleSignerValidationModule.sol";

contract ModulesBase is BaseSetup, ISubscriptionModuleBase {
    struct SubscriptionParams {
        address account;
        address space;
        uint256 tokenId;
        uint256 renewalPrice;
        uint256 expirationTime;
        uint32 entityId;
    }

    AccountFactory accountFactory;
    ExecutionInstallDelegate executionInstallDelegate;
    SubscriptionModule subscriptionModule;

    uint32 nextEntityId = 1;
    address owner = makeAddr("owner");
    address processor = makeAddr("processor");

    function setUp() public override {
        super.setUp();

        executionInstallDelegate = new ExecutionInstallDelegate();
        subscriptionModule = SubscriptionModule(DeploySubscriptionModule.deploy());

        SingleSignerValidationModule singleSignerValidationModule = new SingleSignerValidationModule();

        ModularAccount accountImpl = new ModularAccount(entryPoint, executionInstallDelegate);

        SemiModularAccountBytecode semiModularAccountBytecode = new SemiModularAccountBytecode(
            entryPoint,
            executionInstallDelegate
        );

        accountFactory = new AccountFactory(
            entryPoint,
            accountImpl,
            semiModularAccountBytecode,
            address(singleSignerValidationModule),
            address(singleSignerValidationModule),
            owner
        );
    }

    function _createAccount(
        address user,
        uint256 balance
    ) internal returns (ModularAccount account) {
        uint32 entityId = nextEntityId++;
        account = accountFactory.createAccount(user, 0, entityId);
        vm.deal(address(account), balance);
    }

    function _createSpace(uint256 price, uint64 duration) internal returns (address space) {
        IArchitectBase.SpaceInfo memory spaceInfo = _createEveryoneSpaceInfo("ModulesSpace");
        spaceInfo.membership.settings.pricingModule = fixedPricingModule;
        spaceInfo.membership.settings.freeAllocation = 0;
        if (price > 0) {
            spaceInfo.membership.settings.pricingModule = fixedPricingModule;
            spaceInfo.membership.settings.price = price;
        } else {
            spaceInfo.membership.settings.pricingModule = pricingModule;
        }

        if (duration > 0) spaceInfo.membership.settings.duration = duration;

        vm.prank(owner);
        space = ICreateSpace(spaceFactory).createSpace(spaceInfo);
    }

    function _joinSpace(address account, address space) internal returns (uint256 tokenId) {
        uint256 price = IMembership(space).getMembershipPrice();

        hoax(account, price);
        IMembership(space).joinSpace{value: price}(account);
        tokenId = IERC721AQueryable(space).tokensOfOwner(account)[0];
    }

    function _createSubscriptionParams(
        address account,
        address space,
        uint256 tokenId
    ) internal view returns (SubscriptionParams memory params) {
        IMembership membershipFacet = IMembership(space);

        return
            SubscriptionParams({
                account: account,
                space: space,
                tokenId: tokenId,
                renewalPrice: membershipFacet.getMembershipRenewalPrice(tokenId),
                expirationTime: membershipFacet.expiresAt(tokenId),
                entityId: nextEntityId
            });
    }

    function _installSubscriptionModule(
        ModularAccount account,
        SubscriptionParams memory params
    ) internal returns (uint32 entityId) {
        ValidationConfig validationConfig = ValidationConfigLib.pack(
            address(subscriptionModule),
            params.entityId,
            false,
            false,
            false
        );

        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = IModularAccount.execute.selector;

        bytes[] memory hooks = new bytes[](0);

        bytes memory installData = abi.encode(
            params.entityId,
            params.space,
            params.tokenId,
            params.renewalPrice,
            params.expirationTime
        );

        vm.prank(address(entryPoint));
        account.installValidation(validationConfig, selectors, installData, hooks);

        return params.entityId;
    }

    function _createSubscription(
        address user,
        uint64 duration,
        uint256 price
    )
        internal
        returns (
            ModularAccount account,
            uint256 tokenId,
            uint32 entityId,
            SubscriptionParams memory params
        )
    {
        account = _createAccount(user, 1 ether);
        address space = _createSpace(price, duration);
        tokenId = _joinSpace(address(account), space);
        params = _createSubscriptionParams(address(account), space, tokenId);
        entityId = _installSubscriptionModule(account, params);
        nextEntityId++;

        return (account, tokenId, entityId, params);
    }

    function _processRenewalAs(address caller, address account, uint32 entityId) internal {
        RenewalParams memory renewalParams = RenewalParams({account: account, entityId: entityId});

        vm.prank(caller);
        subscriptionModule.processRenewal(renewalParams);
    }

    function _warpToExpiration(address space, uint256 tokenId) internal {
        uint256 expiresAt = IMembership(space).expiresAt(tokenId);
        vm.warp(expiresAt - subscriptionModule.RENEWAL_BUFFER());
    }
}
