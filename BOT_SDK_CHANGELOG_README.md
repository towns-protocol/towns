# Bot SDK Changelog System

## Overview

Automated system that generates and maintains a changelog for the Bot SDK by analyzing git commit history. The changelog helps developers understand what changed between versions, with special attention to breaking changes that require code updates.

## Problem Statement

Developers building bots need to know:

- What changed in the Bot SDK between versions
- Which changes require code updates (breaking changes)
- How to migrate their code when APIs change
- What new features are available

Without this information, bots break unexpectedly after SDK updates.

## Solution

Automated changelog generation with human verification for critical changes:

1. **Automatic Detection**: Scans git history to find all bot/SDK related commits
2. **Categorization**: Classifies changes as breaking, features, fixes, or deprecations
3. **Transparency**: Shows affected files and links to actual commits
4. **Safety**: Requires manual verification for migration guides (never generates fake code)
5. **Automation**: Updates automatically via GitHub Actions on every push to main

## Architecture

```
Developer Push (bot/SDK changes)
    ↓
GitHub Actions Trigger
    ↓
Generate Changelog Script
    ↓
Check for Manual Migration Guides
    ↓
Generate packages/docs/build/bots/changelog.mdx
    ↓
Auto-commit to Repository
    ↓
Documentation Site Updated
```

## Files

### Core System

**scripts/generate-bot-sdk-changelog.ts**

- Main changelog generator
- Scans git history for bot/SDK commits
- Categorizes by type (feat, fix, breaking)
- Generates MDX output

**scripts/changelog-migration-guides.ts**

- Storage for verified migration instructions
- Maintainers add guides here after testing
- Empty by default (safe)

**scripts/CHANGELOG_MAINTAINER_GUIDE.md**

- Instructions for adding migration guides
- Best practices for verification
- Template and examples

### Automation

**.github/workflows/bot-sdk-changelog.yml**

- Triggers on push to main when bot/SDK files change
- Runs changelog generator
- Auto-commits updates with [skip ci]

### Output

**packages/docs/build/bots/changelog.mdx**

- Generated changelog
- Visible at /build/bots/changelog in documentation
- Updated automatically

## Usage

### For Developers

View the changelog in documentation at `/build/bots/changelog` to see:

- Breaking changes marked clearly
- New features and improvements
- Bug fixes
- Which files were affected by each change
- Links to commit diffs for review

Update bot dependencies:

```bash
bunx towns-bot update
```

### For Maintainers

Generate changelog manually:

```bash
bun run changelog
```

Add verified migration guide:

1. Open `scripts/changelog-migration-guides.ts`
2. Review the actual commit and test the change
3. Add entry with verified code examples
4. Regenerate: `bun run changelog`
5. Commit changes

## Safety Mechanism

The system prioritizes correctness over convenience:

**What it does NOT do:**

- Auto-generate code examples
- Guess at migration paths
- Create "before/after" snippets from commits
- Assume what developers need to change

**What it does:**

- Show which files changed
- Link to actual commit diffs
- Display "Migration guide needed" for breaking changes
- Require human verification before publishing migration instructions

This prevents publishing incorrect migration instructions that would mislead developers.

## Configuration

### Packages Tracked

Defined in `scripts/generate-bot-sdk-changelog.ts`:

- `packages/bot/` - Core bot SDK
- `packages/sdk/` - General SDK used by bots
- `packages/towns-bot-cli/` - CLI tools

### Change Detection

Uses conventional commit format:

- `feat:` - New feature
- `fix:` - Bug fix
- `BREAKING CHANGE:` in commit body - Breaking change
- `docs:` - Documentation only
- Keywords "breaking change", "breaking:", "!:", "removed" - Breaking change
- Keywords "deprecat" (deprecate, deprecated, deprecating) - Deprecation

### Exit Codes

The generator uses different exit codes for different outcomes:

- **Exit 0**: Success, no breaking changes
- **Exit 1**: Success with breaking changes detected (expected, not an error)
- **Exit 2**: Error (missing files, git failures, parse errors, etc.)

The GitHub Actions workflow accepts exit codes 0 and 1 as successful runs, and fails only on exit code 2.

## Testing

Run tests to verify the system works:

**Test 1: Generate Changelog**

```bash
# From the repository root
bun run changelog
```

Expected output: Statistics about commits analyzed and categories found.

**Test 2: Verify Output**

```bash
ls -lh packages/docs/build/bots/changelog.mdx
wc -l packages/docs/build/bots/changelog.mdx
```

Should show a file with 150+ lines.

**Test 3: Check Navigation**

```bash
grep "build/bots/changelog" packages/docs/docs.json
```

Should find the changelog in the navigation structure.

**Test 4: Verify Safety**

```bash
cat scripts/changelog-migration-guides.ts
```

Should show empty migration guides object with instructions.

## Maintenance

### Adding Migration Guides

When a breaking change occurs:

1. **Test the change yourself**
   - Review the commit: `git show <hash>`
   - Try the old code
   - Try the new code
   - Document what actually works

2. **Add to migration guides**

   ```typescript
   export const MIGRATION_GUIDES: Record<string, string> = {
     "Exact commit message": `**What changed:**
     [Description of the change]
     
     **How to migrate:**
     [Step-by-step instructions with real code examples]
     
     **Verification:**
     - Tested on: [date]
     - Verified by: [name]
     - Commit: [hash]
     `,
   };
   ```

3. **Regenerate and commit**
   ```bash
   bun run changelog
   git add scripts/changelog-migration-guides.ts packages/docs/build/bots/changelog.mdx
   git commit -m "docs: add verified migration guide for [change]"
   ```

### Regular Review

**Monthly:**

- Review generated changelog for accuracy
- Add migration guides for important breaking changes
- Check GitHub Actions runs successfully

**Per Release:**

- Verify all changes are documented
- Test migration guides with actual bots
- Update maintainer guide if process changes

## Troubleshooting

### Changelog Not Generating

Check git history is accessible:

```bash
git log --oneline | head -20
git tag -l | tail -10
```

Run generator directly to see errors:

```bash
bun run scripts/generate-bot-sdk-changelog.ts
```

### Automation Not Triggering

Verify:

- Workflow file exists: `.github/workflows/bot-sdk-changelog.yml`
- File paths in workflow match changed files
- GitHub Actions has write permissions
- Check Actions tab in GitHub for error logs

### Wrong Categorization

Change detection relies on commit message format. Use conventional commits:

```bash
feat: add new feature
fix: correct bug
BREAKING CHANGE: description in body
```

## Statistics

Current system performance (as of initial implementation):

- Analyzes 1,567 total commits
- Filters to 640 bot/SDK commits (41%)
- Identifies 6 breaking changes
- Documents 38 new features
- Lists 18 bug fixes
- Tracks 1 deprecation
- Execution time: 3-5 seconds
- Output size: ~11KB

## Dependencies

- `simple-git` - For git history operations
- GitHub Actions runner (ubuntu-latest)
- Bun runtime for script execution

## Future Considerations

Potential enhancements (not currently implemented):

- Notifications for breaking changes
- API signature comparison
- Automated impact analysis
- RSS feed for changelog updates

## Notes

This system was designed with safety as the primary concern. Incorrect migration instructions are worse than no instructions, as they waste developer time and cause frustration. The system errs on the side of transparency: showing what changed and where to find more information, rather than guessing at solutions.

The manual verification requirement for migration guides ensures accuracy and maintains trust with developers using the Bot SDK.
