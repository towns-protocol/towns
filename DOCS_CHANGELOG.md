# Documentation Changelog - Main Branch Updates

Changes from the latest 39 commits that may require documentation updates.

## 🤖 Bot Documentation Updates

### ✅ ALREADY UPDATED

- **Paid Slash Commands** (c572419a)
  - Documentation added: `packages/docs/build/bots/slash-commands.mdx`
  - No further action needed

### 🆕 NEW FEATURES TO DOCUMENT

1. **Bot Profile Images** (87435543)
   - Bots can now update their profile image in stream
   - Bot owners can change bot avatars
   - **Action:** Add to bot configuration/settings docs

2. **Bot Self-Installation** (1f99e32c)
   - Apps can now install themselves
   - Refactored execution interfaces
   - **Action:** Update bot installation docs

3. **Bot CLI Updates** (b682aaf5)
   - `towns-bot update` now uses `npm-check-updates`
   - Better dependency management
   - **Action:** Verify bot CLI documentation is accurate

4. **Bot Attachment Tests Fixed** (0e3b90090a, f4268f65)
   - Mixed attachments and pin/unpin functionality
   - **Action:** Ensure examples reflect proper attachment handling

## 📦 SDK & Client Updates

### API Changes

1. **Sync Operations** (cd1ed2b41f)
   - SDK now handles `SyncOp_SYNC_DOWN` from modify sync
   - Better sync state management
   - **Action:** Review React SDK sync documentation

2. **Free Supply Handling** (e273ed8b)
   - SDK uses onchain free supply instead of hardcoding
   - More dynamic space membership handling
   - **Action:** Update membership documentation if needed

3. **Decryption Extensions** (core changes)
   - Key fulfillments always sent (2c42eb4d)
   - Better message decryption handling
   - **Action:** Verify encryption docs are accurate

## 🔗 Smart Contract Updates

### Contract Changes

1. **Prepay Membership Restrictions** (ea1572d8)
   - Prepay now restricted to owner and space factory
   - Security enhancement
   - **Action:** Update prepay documentation in contracts section

2. **App Execution Interface** (1f99e32c)
   - New `IAppExecution` interface
   - Self-installation support
   - **Action:** Update smart contracts documentation

3. **Validation Registry** (bfd91c3ca4)
   - Exclude zero sentinel value from fuzz tests
   - Better validation patterns
   - **Action:** Review contract testing documentation

## 🏗️ Backend/Infrastructure (Lower Priority for Public Docs)

### Major Features (Technical)

1. **Metadata Shards Implementation** (2364fd67)
   - New internal doc: `core/docs/features/metadata-shards.md`
   - Single table for streams data
   - **Action:** Check if node operator docs need updates

2. **Stream Validation** (eacf8f710a)
   - Initial stream validation when adding to sync
   - Better error handling
   - **Action:** May affect troubleshooting docs

3. **Cookie Persistence** (7f78226d1e)
   - New doc: `core/docs/stream-sync-cookie-persistence.md`
   - Better sync resumption
   - **Action:** Node operator docs may need updates

4. **External Storage Support** (be45bd8c, 8163024699)
   - GCS JSON credentials via base64
   - ReadStreamFromLastSnapshot support
   - **Action:** Node operator configuration docs

5. **Usage Monitor** (9690fea1)
   - Don't count node-signed events
   - Better analytics
   - **Action:** Analytics/monitoring docs if they exist

## 🔧 Developer Experience

1. **Docker ARM64 Support** (ede45e1e)
   - Fixes for Apple Silicon
   - **Action:** Update local development setup docs

2. **Husky Setup Removed** (d44ae6d)
   - Git hooks configuration changed
   - **Action:** Update CONTRIBUTING.md if needed

3. **Node Version Handling** (52f970da, 75e056cb)
   - Better nvmrc version checking
   - **Action:** Verify setup instructions

4. **Mixpanel Message Tracking** (708c7129)
   - Messages sent tracked on Mixpanel
   - **Action:** Privacy/analytics documentation

## 📊 Priority Summary

### 🔴 HIGH PRIORITY (User-Facing)

- Bot profile image updates
- Bot self-installation
- Paid slash commands (DONE ✅)
- Prepay membership restrictions

### 🟡 MEDIUM PRIORITY

- SDK sync operation changes
- Bot CLI updates
- Contract execution interfaces
- ARM64 Docker support

### 🟢 LOW PRIORITY (Internal/Technical)

- Metadata shards
- Cookie persistence
- Usage monitoring
- Stream validation

## 📝 Recommended Actions

1. **Bot Docs (`/build/bots/`)**
   - Add section on updating bot profile images
   - Document self-installation workflow
   - Verify attachment examples are correct

2. **Contracts Docs (`/towns-smart-contracts/`)**
   - Update prepay membership section
   - Document new execution interfaces

3. **Getting Started**
   - Verify Docker setup for ARM64 users
   - Check node version instructions

4. **Node Operator** (if applicable)
   - External storage configuration
   - Metadata shard architecture
