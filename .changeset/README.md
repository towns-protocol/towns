# Changesets

This repository uses [Changesets](https://github.com/changesets/changesets) for version management.

## Adding a Changeset

When you make changes that should be released, run:

```bash
yarn changeset
```

This will prompt you to:

1. Select packages that have changed
2. Choose the type of version bump (always use `patch` for this project)
3. Write a summary of the changes

The summary will appear in the CHANGELOG.md files.

## Guidelines

-   **Every PR** that affects published packages should include a changeset
-   Use `patch` for all changes (this project uses fixed patch versioning)
-   Write clear, user-facing descriptions of what changed
-   Multiple changesets can be added to a single PR if needed

## Version Releases

Releases are automated via GitHub Actions:

1. When PRs with changesets merge to main, a "Version Packages" PR is created/updated
2. Merging the Version Packages PR triggers npm publishing
