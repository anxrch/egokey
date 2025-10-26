# Note Revisions Implementation

## Overview
This implementation adds a dedicated `NoteRevision` entity to the Misskey backend to persist immutable snapshots of notes before/after edits, enabling history replay and audit trails.

## Changes Made

### 1. New Entity: `MiNoteRevision`
**File**: `packages/backend/src/models/NoteRevision.ts`

Created a new TypeORM entity with the following structure:
- **id**: Primary key (varchar 32)
- **noteId**: Foreign key to `note` table
- **editorId**: Foreign key to `user` table (the user who created this revision)
- **version**: Integer field for monotonically increasing version numbers (starts at 1)
- **createdAt**: Timestamp indicating when this revision was created
- **payload**: JSONB field containing the snapshot of note fields

#### Payload Structure
The JSONB payload captures all user-visible fields needed for history replay:
```typescript
{
  text: string | null,                    // Note content
  cw: string | null,                      // Content warning
  fileIds: string[],                      // Attached file IDs
  visibility: string,                     // public, home, followers, specified
  visibleUserIds: string[],               // Users who can see (for specified visibility)
  localOnly: boolean,                     // Local-only flag
  reactionAcceptance: string | null,      // How reactions are accepted
  poll: object | null,                    // Poll metadata: { choices, multiple, expiresAt }
  name: string | null,                    // Note name/title
  emojis: string[],                       // Custom emojis used
  tags: string[],                         // Hashtags
  mentions: string[],                     // Mentioned user IDs
  mentionedRemoteUsers: string            // Stringified JSON of remote users
}
```

#### Indexes
- **Primary**: `id`
- **Unique composite**: `(noteId, version)` - ensures no duplicate versions per note
- **Index**: `noteId` - for efficient querying of all revisions for a note
- **Index**: `editorId` - for querying revisions by editor
- **Index**: `createdAt` - for temporal queries

#### Foreign Keys
- `noteId` → `note(id)` ON DELETE CASCADE
- `editorId` → `user(id)` ON DELETE CASCADE

### 2. Entity Registration
**Files Modified**:
- `packages/backend/src/models/_.ts`
  - Added import for `MiNoteRevision`
  - Added to exports list
  - Added `NoteRevisionsRepository` type

- `packages/backend/src/postgres.ts`
  - Added import for `MiNoteRevision`
  - Added to entities array for TypeORM registration

### 3. Dependency Injection Setup
**Files Modified**:
- `packages/backend/src/di-symbols.ts`
  - Added `noteRevisionsRepository: Symbol('noteRevisionsRepository')`

- `packages/backend/src/models/RepositoryModule.ts`
  - Added import for `MiNoteRevision`
  - Created `$noteRevisionsRepository` provider
  - Added to providers array
  - Added to exports array

### 4. Database Migration
**File**: `packages/backend/migration/1761437080169-note-revisions.js`

Created a TypeORM migration that:
- Creates the `note_revision` table with all columns
- Creates indexes:
  - `IDX_note_revision_noteId`
  - `IDX_note_revision_editorId`
  - `IDX_note_revision_createdAt`
  - `IDX_note_revision_noteId_version` (unique)
- Adds foreign key constraints to `note` and `user` tables with CASCADE delete
- Includes proper down() migration for rollback

## Usage Guidelines

### Version Semantics
- Version numbers start at **1** for the first revision
- Each edit increments the version number
- Version numbers are monotonically increasing per note
- The unique index on `(noteId, version)` ensures no version conflicts

### Creating Revisions
When a note is edited, create a new revision:
```typescript
const revision = new MiNoteRevision({
  id: generateId(),
  noteId: note.id,
  editorId: user.id,
  version: nextVersion,
  createdAt: new Date(),
  payload: {
    text: note.text,
    cw: note.cw,
    fileIds: note.fileIds,
    visibility: note.visibility,
    visibleUserIds: note.visibleUserIds,
    localOnly: note.localOnly,
    reactionAcceptance: note.reactionAcceptance,
    poll: note.hasPoll ? extractPollData(poll) : null,
    name: note.name,
    emojis: note.emojis,
    tags: note.tags,
    mentions: note.mentions,
    mentionedRemoteUsers: note.mentionedRemoteUsers
  }
});
await noteRevisionsRepository.insert(revision);
```

### Querying Revisions
```typescript
// Get all revisions for a note, ordered by version
const revisions = await noteRevisionsRepository.find({
  where: { noteId: note.id },
  order: { version: 'ASC' }
});

// Get a specific revision
const revision = await noteRevisionsRepository.findOne({
  where: { noteId: note.id, version: 2 }
});

// Get latest revision
const latestRevision = await noteRevisionsRepository.findOne({
  where: { noteId: note.id },
  order: { version: 'DESC' }
});
```

## Database Considerations

### Storage
- JSONB columns are efficiently stored in PostgreSQL
- Indexes on `(noteId, version)` enable fast lookups
- CASCADE deletes ensure data consistency when notes or users are removed

### Performance
- The composite unique index on `(noteId, version)` is optimized for version-based queries
- The `createdAt` index supports temporal queries
- Individual indexes on `noteId` and `editorId` support common query patterns

### Data Integrity
- Foreign key constraints ensure referential integrity
- Unique constraint on `(noteId, version)` prevents version conflicts
- JSONB validation can be added at the application layer if needed

## Testing Recommendations

1. **Unit Tests**: Test entity creation and validation
2. **Integration Tests**: Verify repository operations
3. **Migration Tests**: Ensure migration runs cleanly in test environments
4. **Performance Tests**: Validate query performance with large revision counts

## Future Enhancements

Potential improvements for consideration:
- Add retention policies for old revisions
- Implement compression for JSONB payloads
- Add revision diffing functionality
- Create APIs for revision browsing/restoration
- Add audit logging for revision access
