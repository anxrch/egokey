/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Entity, Index, JoinColumn, Column, PrimaryColumn, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiNote } from './Note.js';
import { MiUser } from './User.js';

/**
 * NoteRevision entity stores immutable snapshots of note edits.
 * 
 * Each revision captures the complete state of a note at a specific point in time,
 * allowing for history replay and audit trails.
 * 
 * Fields captured in payload:
 * - text: The note content
 * - cw: Content warning
 * - fileIds: Array of attached file IDs
 * - visibility: Note visibility setting (public, home, followers, specified)
 * - visibleUserIds: Array of user IDs who can see the note (for specified visibility)
 * - localOnly: Whether the note is local-only
 * - reactionAcceptance: How the note accepts reactions
 * - poll: Poll metadata if present ({ choices, multiple, expiresAt })
 * - name: Note name/title if present
 * - emojis: Array of custom emoji names used in the note
 * - tags: Array of hashtags
 * - mentions: Array of mentioned user IDs
 * - mentionedRemoteUsers: Stringified JSON of mentioned remote users
 * 
 * Version semantics:
 * - version starts at 1 for the first revision
 * - increments monotonically for each edit
 * - used to order revisions chronologically
 */
@Entity('note_revision')
@Index('IDX_note_revision_noteId_version', ['noteId', 'version'], { unique: true })
export class MiNoteRevision {
	@PrimaryColumn(id())
	public id: string;

	@Index('IDX_note_revision_noteId')
	@Column({
		...id(),
		comment: 'The ID of the note this revision belongs to.',
	})
	public noteId: MiNote['id'];

	@ManyToOne(type => MiNote, {
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'noteId', foreignKeyConstraintName: 'FK_note_revision_noteId' })
	public note: MiNote | null;

	@Index('IDX_note_revision_editorId')
	@Column({
		...id(),
		comment: 'The ID of the user who created this revision (editor).',
	})
	public editorId: MiUser['id'];

	@ManyToOne(type => MiUser, {
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'editorId', foreignKeyConstraintName: 'FK_note_revision_editorId' })
	public editor: MiUser | null;

	@Column('integer', {
		comment: 'Monotonically increasing version number for the note, starting at 1.',
	})
	public version: number;

	@Index('IDX_note_revision_createdAt')
	@Column('timestamp with time zone', {
		comment: 'The date this revision was created.',
	})
	public createdAt: Date;

	/**
	 * JSONB payload containing the snapshot of note fields at this revision.
	 * 
	 * Expected structure:
	 * {
	 *   text: string | null,
	 *   cw: string | null,
	 *   fileIds: string[],
	 *   visibility: 'public' | 'home' | 'followers' | 'specified',
	 *   visibleUserIds: string[],
	 *   localOnly: boolean,
	 *   reactionAcceptance: string | null,
	 *   poll: { choices: string[], multiple: boolean, expiresAt: Date | null } | null,
	 *   name: string | null,
	 *   emojis: string[],
	 *   tags: string[],
	 *   mentions: string[],
	 *   mentionedRemoteUsers: string
	 * }
	 */
	@Column('jsonb', {
		comment: 'JSONB payload containing the snapshot of note fields at this revision.',
	})
	public payload: Record<string, any>;

	constructor(data: Partial<MiNoteRevision>) {
		if (data == null) return;

		for (const [k, v] of Object.entries(data)) {
			(this as any)[k] = v;
		}
	}
}
