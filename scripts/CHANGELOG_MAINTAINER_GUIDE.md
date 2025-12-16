# Changelog Maintainer Guide

## Overview

The Bot SDK changelog is automatically generated from git commits, but **migration guides for breaking changes must be manually added and verified**.

## Why Manual Verification?

Automated tools cannot:

- Understand the context of code changes
- Provide accurate "before/after" examples
- Know the correct migration path
- Test that migration instructions actually work

**Wrong migration instructions are worse than no instructions.** Developers will waste time debugging code that was "fixed" incorrectly.

## How to Add a Migration Guide

### 1. Identify Breaking Changes

After a release, run the changelog generator:

```bash
bun run changelog
```

Review the `### 🔴 Breaking Changes` section. Any entry without a migration guide will show:

```markdown
**Migration guide needed:** Please review the commit to see what changed.
```

### 2. Research the Change

For each breaking change:

1. **Find the commit:**
   - Click the "View commit →" link in the changelog
   - Or: `git show <commit-hash>`

2. **Review the actual code changes:**

   ```bash
   git diff <commit-hash>^ <commit-hash>
   ```

3. **Check affected files:**
   - Look at `packages/bot/src/` changes
   - Look at `packages/sdk/src/` changes
   - Check tests for usage examples

4. **Find real examples:**
   - Look at how tests were updated
   - Check example bots if available
   - Ask the original author if unclear

### 3. Write the Migration Guide

Open `scripts/changelog-migration-guides.ts` and add an entry:

```typescript
export const MIGRATION_GUIDES: Record<string, string> = {
  "Exact commit message here": `**What changed:**

[Clear, concise description of what changed and why]

**How to migrate:**

[Step-by-step instructions]

\`\`\`typescript
// Before (copy from actual old code)
const result = await bot.oldMethod()

// After (copy from actual new code)
const result = await bot.newMethod()
\`\`\`

**Verification:**
- Tested on: 2025-12-12
- Verified by: Your Name
- Commit: abc123def
`,
};
```

### 4. Test the Migration

**Critical:** Test your migration instructions!

1. Create a test bot with the "before" code
2. Update dependencies
3. Apply your "after" code
4. Verify the bot works

### 5. Regenerate Changelog

```bash
bun run changelog
```

Review the output in `packages/docs/build/bots/changelog.mdx` to ensure your guide appears correctly.

### 6. Commit

```bash
git add scripts/changelog-migration-guides.ts
git add packages/docs/build/bots/changelog.mdx
git commit -m "docs: add migration guide for [breaking change]"
```

## Migration Guide Template

```typescript
'Breaking change title': `**What changed:**

[Description]

**How to migrate:**

[Instructions]

\`\`\`typescript
// Before
[actual old code]

// After
[actual new code]
\`\`\`

**Verification:**
- Tested on: [date]
- Verified by: [name]
- Commit: [hash]
`,
```

## Examples of Good Migration Guides

### Example 1: Method Renamed

```typescript
'Rename sendMessage to sendChannelMessage': `**What changed:**

The \`sendMessage\` method has been renamed to \`sendChannelMessage\` for clarity.

**How to migrate:**

Find and replace all occurrences:

\`\`\`typescript
// Before
await bot.sendMessage(channelId, 'Hello')

// After
await bot.sendChannelMessage(channelId, 'Hello')
\`\`\`

**Verification:**
- Tested on: 2025-12-12
- Verified by: Engineering Team
- Commit: abc123
`,
```

### Example 2: API Changed

```typescript
'Update handler signature with new event type': `**What changed:**

Event handlers now receive a structured event object instead of individual parameters.

**How to migrate:**

Update your event handlers:

\`\`\`typescript
// Before
bot.onMessage(async (handler, channelId, message, userId) => {
  await handler.sendMessage(channelId, 'Received: ' + message)
})

// After
bot.onMessage(async (handler, event) => {
  await handler.sendMessage(event.channelId, 'Received: ' + event.message)
})
\`\`\`

All event properties are now in the \`event\` object:
- \`event.channelId\`
- \`event.message\`
- \`event.userId\`
- \`event.createdAt\` (new!)

**Verification:**
- Tested on: 2025-12-12
- Verified by: Engineering Team
- Commit: def456
`,
```

### Example 3: Removed Feature

```typescript
'Remove deprecated getUserProfile method': `**What changed:**

The \`getUserProfile\` method has been removed. Use the \`getRoomMember\` method instead.

**How to migrate:**

Replace \`getUserProfile\` calls:

\`\`\`typescript
// Before
const profile = await bot.getUserProfile(userId)
console.log(profile.displayName)

// After
const member = await bot.getRoomMember(channelId, userId)
console.log(member.displayName)
\`\`\`

**Note:** The new method requires both \`channelId\` and \`userId\` because user profiles are channel-specific.

**Verification:**
- Tested on: 2025-12-12
- Verified by: Engineering Team
- Commit: ghi789
`,
```

## Common Mistakes to Avoid

### ❌ Don't Make Up Examples

```typescript
// BAD - Made up example that doesn't match real code
'Remove getUserData': `
// Before
const data = await bot.getUserData(userId)  // This never existed!
`
```

### ❌ Don't Be Vague

```typescript
// BAD - No specific instructions
'Update bot initialization': `
The bot initialization changed. Update your code.
`
```

### ✅ Do Provide Specifics

```typescript
// GOOD - Clear instructions with real code
'Update bot initialization': `
\`\`\`typescript
// Before
const bot = await makeTownsBot(config)

// After
const bot = await makeTownsBot({
  privateData: config.privateData,
  jwtSecret: config.jwtSecret
})
\`\`\`
`
```

## What If You're Unsure?

If you can't verify a migration path:

1. **Don't add a guide** - Better to have none than wrong information
2. **Ask the commit author** for examples
3. **Test it yourself** before documenting
4. **Mark as TODO** in the code:

```typescript
// TODO: Add migration guide after verification
// Commit: abc123
// Author: @username
```

## Automation Safety

The automated changelog will:

- ✅ Extract info from commit messages (if author provided it)
- ✅ Show affected files
- ✅ Link to commits
- ❌ **Never** generate fake code examples
- ❌ **Never** guess migration paths

This ensures we never mislead developers with incorrect information.

## Questions?

Contact the documentation team or file an issue.
