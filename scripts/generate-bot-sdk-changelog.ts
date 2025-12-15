#!/usr/bin/env bun
import simpleGit from 'simple-git'
import fs from 'fs'
import path from 'path'
import { MIGRATION_GUIDES } from './changelog-migration-guides.js'

// Configuration
const CONFIG = {
    packages: ['packages/bot/', 'packages/sdk/', 'packages/towns-bot-cli/'],
    outputPath: 'packages/docs/build/bots/changelog.mdx',
    repoUrl: 'https://github.com/river-build/river',
    defaultCommitLimit: 100,
    breakingKeywords: ['breaking change', 'breaking:', '!:', 'removed', 'deprecated'],
}

enum ChangeType {
    BREAKING = 'breaking',
    FEATURE = 'feature',
    FIX = 'fix',
    DOCS = 'docs',
    CHORE = 'chore',
    DEPRECATION = 'deprecation',
}

interface CommitInfo {
    hash: string
    shortHash: string
    date: Date
    message: string
    body: string
    author: string
    files: string[]
}

interface ChangeEntry {
    type: ChangeType
    message: string
    commit: string
    shortCommit: string
    date: Date
    author: string
    body: string
    files: string[]
}

interface VersionChanges {
    version: string
    date: Date
    breaking: ChangeEntry[]
    features: ChangeEntry[]
    fixes: ChangeEntry[]
    docs: ChangeEntry[]
    deprecations: ChangeEntry[]
}

async function main() {
    console.log('Generating Bot SDK Changelog...\n')

    const git = simpleGit()

    // 1. Get current version from lerna.json
    const lernaPath = path.join(process.cwd(), 'lerna.json')
    const lerna = JSON.parse(fs.readFileSync(lernaPath, 'utf-8'))
    const currentVersion = lerna.version
    console.log(`Current version: ${currentVersion}`)

    // 2. Get all tags to find last release
    const tags = await git.tags()
    const lastTag = tags.latest || `HEAD~${CONFIG.defaultCommitLimit}`
    console.log(`Last tag: ${lastTag}`)

    // 3. Get commits since last tag
    const log = await git.log({ from: lastTag, to: 'HEAD' })
    console.log(`Total commits since last tag: ${log.all.length}`)

    // 4. Filter commits affecting bot/sdk
    const relevantCommits = await filterBotSDKCommits(git, [...log.all])
    console.log(`Relevant commits (bot/sdk): ${relevantCommits.length}`)

    if (relevantCommits.length === 0) {
        console.log('No changes to bot/sdk packages. Skipping changelog generation.')
        return
    }

    // 5. Categorize commits
    const categorized = categorizeCommits(relevantCommits)
    console.log(
        `Categories: ${categorized.filter((c) => c.type === ChangeType.BREAKING).length} breaking, ${categorized.filter((c) => c.type === ChangeType.FEATURE).length} features, ${categorized.filter((c) => c.type === ChangeType.FIX).length} fixes`,
    )

    // 6. Group by version
    const grouped = groupByVersion(categorized, currentVersion)

    // 7. Generate markdown
    const markdown = generateChangelog(grouped)

    // 8. Write to docs
    const outputPath = path.join(process.cwd(), CONFIG.outputPath)
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, markdown)

    console.log(`\nChangelog generated: ${CONFIG.outputPath}`)

    // 9. Check for breaking changes
    const hasBreaking = categorized.some((c) => c.type === ChangeType.BREAKING)
    if (hasBreaking) {
        console.log('WARNING: BREAKING CHANGES DETECTED')
        process.exit(1) // Signal to GitHub Actions
    }
}

async function filterBotSDKCommits(git: any, commits: any[]): Promise<CommitInfo[]> {
    const relevant: CommitInfo[] = []

    for (const commit of commits) {
        try {
            // Get files changed in this commit
            const diffSummary = await git.diffSummary([`${commit.hash}^`, commit.hash])
            const fileList = diffSummary.files.map((f: any) => f.file)

            // Check if any files are in bot/sdk packages
            const isBotSDK = fileList.some((f: string) =>
                CONFIG.packages.some((pkg) => f.startsWith(pkg)),
            )

            if (isBotSDK) {
                relevant.push({
                    hash: commit.hash,
                    shortHash: commit.hash.substring(0, 7),
                    date: new Date(commit.date),
                    message: commit.message,
                    body: commit.body || '',
                    author: commit.author_name,
                    files: fileList,
                })
            }
        } catch (error) {
            // Skip commits that can't be diffed (e.g., initial commit)
            continue
        }
    }

    return relevant
}

function categorizeCommits(commits: CommitInfo[]): ChangeEntry[] {
    return commits.map((commit) => {
        const type = detectChangeType(commit)
        return {
            type,
            message: cleanMessage(commit.message),
            commit: commit.hash,
            shortCommit: commit.shortHash,
            date: commit.date,
            author: commit.author,
            body: commit.body,
            files: commit.files,
        }
    })
}

function detectChangeType(commit: CommitInfo): ChangeType {
    const msg = commit.message.toLowerCase()
    const body = commit.body.toLowerCase()

    // Check for breaking changes
    const hasBreakingKeyword = CONFIG.breakingKeywords.some(
        (keyword) => body.includes(keyword) || msg.includes(keyword),
    )

    if (hasBreakingKeyword) {
        return ChangeType.BREAKING
    }

    // Check for deprecations
    if (msg.includes('deprecat') || body.includes('deprecat')) {
        return ChangeType.DEPRECATION
    }

    // Features
    if (msg.startsWith('feat:') || msg.startsWith('feat(')) {
        return ChangeType.FEATURE
    }

    // Fixes
    if (msg.startsWith('fix:') || msg.startsWith('fix(')) {
        return ChangeType.FIX
    }

    // Docs
    if (
        msg.startsWith('docs:') ||
        commit.files.every((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    ) {
        return ChangeType.DOCS
    }

    // Default to chore
    return ChangeType.CHORE
}

function cleanMessage(message: string): string {
    // Remove conventional commit prefix
    let cleaned = message.replace(
        /^(feat|fix|docs|chore|refactor|test|style|perf)(\(.+?\))?:\s*/i,
        '',
    )

    // Remove PR numbers
    cleaned = cleaned.replace(/\s*\(#\d+\)$/, '')

    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)

    return cleaned
}

function extractMigrationGuide(message: string, body: string, files: string[]): string | null {
    // Check for manual migration guide first (these are VERIFIED)
    if (MIGRATION_GUIDES[message]) {
        return MIGRATION_GUIDES[message]
    }

    let guide = ''

    // Only extract descriptions if they exist, but DON'T extract code examples
    // Code examples in commits are often from test files or may be outdated
    const breakingMatch = body.match(/BREAKING CHANGE[:\s]+([\s\S]*?)(?=(\n\n|```|$))/i)
    if (breakingMatch) {
        const breakingText = breakingMatch[1]
            .trim()
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && !line.startsWith('-')) // Remove bullet points
            .join(' ')

        if (breakingText && !breakingText.includes('```')) {
            guide += `**What changed:**\n\n${breakingText}\n\n`
        }
    }

    // If we have a description from commit, return it
    if (guide) {
        guide += `<Warning>\nMigration instructions are being added. For now, review the commit diff to understand what changed.\n</Warning>\n\n`
        return guide.trim()
    }

    // Otherwise, show affected files and ask developers to review
    const botFiles = files.filter(
        (f) =>
            f.startsWith('packages/bot/') ||
            f.startsWith('packages/sdk/') ||
            f.startsWith('packages/towns-bot-cli/'),
    )

    if (botFiles.length > 0) {
        guide += `**Migration guide needed:** Please review the commit to see what changed.\n\n`
        guide += `**Files affected:**\n`
        botFiles.slice(0, 5).forEach((file) => {
            guide += `- \`${file}\`\n`
        })
        if (botFiles.length > 5) {
            guide += `- ... and ${botFiles.length - 5} more files\n`
        }
        guide += `\n`
    }

    return guide.trim() || null
}

function groupByVersion(changes: ChangeEntry[], version: string): VersionChanges[] {
    const breaking = changes.filter((c) => c.type === ChangeType.BREAKING)
    const features = changes.filter((c) => c.type === ChangeType.FEATURE)
    const fixes = changes.filter((c) => c.type === ChangeType.FIX)
    const docs = changes.filter((c) => c.type === ChangeType.DOCS)
    const deprecations = changes.filter((c) => c.type === ChangeType.DEPRECATION)

    // Get the most recent date
    const dates = changes.map((c) => c.date)
    const latestDate =
        dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : new Date()

    return [
        {
            version,
            date: latestDate,
            breaking,
            features,
            fixes,
            docs,
            deprecations,
        },
    ]
}

function generateChangelog(grouped: VersionChanges[]): string {
    const now = new Date().toISOString().split('T')[0]

    let md = `---
title: Bot SDK Changelog
description: Stay up to date with Towns Bot SDK changes
---

## Overview

Track all changes to the Towns Bot SDK. Critical changes are clearly marked and include migration instructions when available.

<Warning>
Always review breaking changes carefully and test your bot after updating dependencies.
</Warning>

---

`

    for (const version of grouped) {
        const dateStr = version.date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })

        md += `## Version ${version.version}\n\n`
        md += `*Released ${dateStr}*\n\n`

        // Breaking changes
        if (version.breaking.length > 0) {
            md += `### Breaking Changes\n\n`
            for (const change of version.breaking) {
                md += `#### ${change.message}\n\n`

                // Extract migration guidance (manual first, then automatic)
                const migration = extractMigrationGuide(change.message, change.body, change.files)
                if (migration) {
                    md += `${migration}\n\n`
                }

                md += `[View commit →](${CONFIG.repoUrl}/commit/${change.commit})\n\n`
                md += `---\n\n`
            }
        }

        // Deprecations
        if (version.deprecations.length > 0) {
            md += `### Deprecations\n\n`
            md += `<Note>\nDeprecated features will be removed in a future major version. Plan to migrate soon.\n</Note>\n\n`
            for (const change of version.deprecations) {
                md += `- **${change.message}**\n`
                md += `  - [View commit](${CONFIG.repoUrl}/commit/${change.commit})\n\n`
            }
        }

        // New features
        if (version.features.length > 0) {
            md += `### New Features\n\n`
            for (const change of version.features) {
                md += `- ${change.message} ([${change.shortCommit}](${CONFIG.repoUrl}/commit/${change.commit}))\n`
            }
            md += '\n'
        }

        // Bug fixes
        if (version.fixes.length > 0) {
            md += `### Bug Fixes\n\n`
            for (const change of version.fixes) {
                md += `- ${change.message} ([${change.shortCommit}](${CONFIG.repoUrl}/commit/${change.commit}))\n`
            }
            md += '\n'
        }

        // Documentation
        if (version.docs.length > 0) {
            md += `### Documentation\n\n`
            for (const change of version.docs) {
                md += `- ${change.message} ([${change.shortCommit}](${CONFIG.repoUrl}/commit/${change.commit}))\n`
            }
            md += '\n'
        }

        md += '---\n\n'
    }

    // Footer
    md += `## How to Update\n\n`
    md += `Update your bot dependencies to the latest version:\n\n`
    md += '```bash\n'
    md += 'bunx towns-bot update\n'
    md += '```\n\n'
    md += `Or manually update your \`package.json\`:\n\n`
    md += '```bash\n'
    md += 'bun update @towns-protocol/bot @towns-protocol/sdk\n'
    md += '```\n'

    return md
}

// Run the script
main().catch((error) => {
    console.error('Error generating changelog:', error)
    process.exit(1)
})
