# Type Alias: MembershipOldStructOutput

```ts
type MembershipOldStructOutput = [MembershipStructOutput, MembershipRequirementsOldStructOutput, string[]] & object;
```

Defined in: [packages/generated/dev/typings/ICreateSpace.ts:191](https://github.com/towns-protocol/towns/blob/0db1fd0ac7258e8db8cedfb6183e8eade8284fa1/packages/generated/dev/typings/ICreateSpace.ts#L191)

## Type declaration

### permissions

```ts
permissions: string[];
```

### requirements

```ts
requirements: MembershipRequirementsOldStructOutput;
```

### settings

```ts
settings: MembershipStructOutput;
```
