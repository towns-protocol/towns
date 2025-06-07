# Interface: RoleEntitlements

Defined in: [packages/web3/src/types/ContractTypes.ts:153](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/ContractTypes.ts#L153)

Role details for a channel from multiple contract sources

## Properties

### name

```ts
name: string;
```

Defined in: [packages/web3/src/types/ContractTypes.ts:157](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/ContractTypes.ts#L157)

The name of the role.

***

### permissions

```ts
permissions: Permission[];
```

Defined in: [packages/web3/src/types/ContractTypes.ts:159](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/ContractTypes.ts#L159)

The permissions that this role has.

#### See

[Permission](../variables/Permission.md)

***

### roleId

```ts
roleId: number;
```

Defined in: [packages/web3/src/types/ContractTypes.ts:155](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/ContractTypes.ts#L155)

The id of the role.

***

### ruleData

```ts
ruleData: VersionedRuleData;
```

Defined in: [packages/web3/src/types/ContractTypes.ts:163](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/ContractTypes.ts#L163)

**`Internal`**

The River struct that represents the rule data of the role [VersionedRuleData](../type-aliases/VersionedRuleData.md).

***

### users

```ts
users: string[];
```

Defined in: [packages/web3/src/types/ContractTypes.ts:161](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/web3/src/types/ContractTypes.ts#L161)

The userIds that are in this role.
