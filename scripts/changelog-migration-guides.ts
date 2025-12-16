/**
 * Manual migration guides for breaking changes
 *
 * ⚠️ IMPORTANT: Only add migration guides that have been VERIFIED against the actual code changes.
 *
 * How to add a migration guide:
 * 1. Find the commit hash from the changelog
 * 2. Review the actual code changes in that commit
 * 3. Test the migration path yourself or with the team
 * 4. Write the guide based on real examples
 *
 * Template:
 * 'Exact commit message here': `**What changed:**
 *
 * [Clear description of what changed]
 *
 * **How to migrate:**
 *
 * [Step-by-step instructions with VERIFIED code examples]
 *
 * \`\`\`typescript
 * // Before (actual old code)
 *
 * // After (actual new code)
 * \`\`\`
 *
 * **Verification:**
 * - Tested on: [date]
 * - Verified by: [name]
 * - Commit: [hash]
 * `,
 */
export const MIGRATION_GUIDES: Record<string, string> = {
    // Add verified migration guides here
    // Example:
    // 'Remove deprecated `getUserData`': `...`,
}
