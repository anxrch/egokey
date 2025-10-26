/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { NoteUpdateService } from '@/core/NoteUpdateService.js';
import { GetterService } from '@/server/api/GetterService.js';
import { DI } from '@/di-symbols.js';
import type { NoteRevisionsRepository } from '@/models/_.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['notes'],

	requireCredential: false,

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			properties: {
				id: {
					type: 'string',
					optional: false, nullable: false,
					format: 'id',
				},
				version: {
					type: 'number',
					optional: false, nullable: false,
				},
				createdAt: {
					type: 'string',
					optional: false, nullable: false,
					format: 'date-time',
				},
				editorId: {
					type: 'string',
					optional: false, nullable: false,
					format: 'id',
				},
				payload: {
					type: 'object',
					optional: false, nullable: false,
				},
			},
		},
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: 'e1774b54-1d10-4ed8-9afe-3f27e6d1f083',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		noteId: { type: 'string', format: 'misskey:id' },
	},
	required: ['noteId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.noteRevisionsRepository)
		private noteRevisionsRepository: NoteRevisionsRepository,

		private getterService: GetterService,
		private noteUpdateService: NoteUpdateService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const note = await this.getterService.getNote(ps.noteId).catch(err => {
				if (err.id === '9725d0ce-ba28-4dde-95a7-2cbb2c15de24') throw new ApiError(meta.errors.noSuchNote);
				throw err;
			});

			const revisions = await this.noteUpdateService.getRevisions(note.id);

			return revisions.map(revision => ({
				id: revision.id,
				version: revision.version,
				createdAt: revision.createdAt.toISOString(),
				editorId: revision.editorId,
				payload: revision.payload,
			}));
		});
	}
}
