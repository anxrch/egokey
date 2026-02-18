/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import ms from 'ms';
import type { NoteRenoteMutingsRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { GetterService } from '@/server/api/GetterService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['notes'],

	requireCredential: true,

	kind: 'write:account',

	limit: {
		duration: ms('1hour'),
		max: 10,
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: 'a4dc81e3-e9f1-4a86-9dc0-e6369da4f7a8',
		},
		notYourNote: {
			message: 'This is not your note.',
			code: 'NOT_YOUR_NOTE',
			id: 'b6e53e8a-7d42-4e1c-b569-3f6e7c8d4a2f',
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
		@Inject(DI.noteRenoteMutingsRepository)
		private noteRenoteMutingsRepository: NoteRenoteMutingsRepository,

		private getterService: GetterService,
		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const note = await this.getterService.getNote(ps.noteId).catch(err => {
				if (err.id === '9725d0ce-ba28-4dde-95a7-2cbb2c15de24') throw new ApiError(meta.errors.noSuchNote);
				throw err;
			});

			if (note.userId !== me.id) {
				throw new ApiError(meta.errors.notYourNote);
			}

			const existing = await this.noteRenoteMutingsRepository.findOneBy({
				userId: me.id,
				noteId: note.id,
			});

			if (existing) return;

			await this.noteRenoteMutingsRepository.insert({
				id: this.idService.gen(),
				noteId: note.id,
				userId: me.id,
			});
		});
	}
}
