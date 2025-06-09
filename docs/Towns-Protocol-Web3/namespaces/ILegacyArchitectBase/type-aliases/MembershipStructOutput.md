# Type Alias: MembershipStructOutput

```ts
type MembershipStructOutput = [IMembershipBase.MembershipStructOutput, MembershipRequirementsStructOutput, string[]] & object;
```

Defined in: [packages/generated/dev/typings/IMockLegacyArchitect.sol/ILegacyArchitect.ts:151](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/IMockLegacyArchitect.sol/ILegacyArchitect.ts#L151)

## Type declaration

### permissions

```ts
permissions: string[];
```

### requirements

```ts
requirements: MembershipRequirementsStructOutput;
```

### settings

```ts
settings: IMembershipBase.MembershipStructOutput;
```
