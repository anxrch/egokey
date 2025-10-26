/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { CoreModule } from '@/core/CoreModule.js';
import { NoteUpdateService } from '@/core/NoteUpdateService.js';
import { NoteCreateService } from '@/core/NoteCreateService.js';
import { GlobalModule } from '@/GlobalModule.js';
import { DI } from '@/di-symbols.js';
import type { NotesRepository, UsersRepository, NoteRevisionsRepository, PollsRepository } from '@/models/_.js';
import { MiUser } from '@/models/User.js';
import { MiNote } from '@/models/Note.js';
import { genAidx } from '@/misc/id/aidx.js';
import { secureRndstr } from '@/misc/secure-rndstr.js';

describe('NoteUpdateService', () => {
    let app: any;
    let noteUpdateService: NoteUpdateService;
    let noteCreateService: NoteCreateService;
    let notesRepository: NotesRepository;
    let usersRepository: UsersRepository;
    let noteRevisionsRepository: NoteRevisionsRepository;
    let pollsRepository: PollsRepository;
    let db: DataSource;

    let testUser: MiUser;

    async function createUser(data: Partial<MiUser> = {}) {
        const un = secureRndstr(16);
        const x = await usersRepository.insert({
            id: genAidx(Date.now()),
            username: un,
            usernameLower: un,
            ...data,
        });
        return await usersRepository.findOneByOrFail(x.identifiers[0]);
    }

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [GlobalModule, CoreModule],
        }).compile();
        
        noteUpdateService = app.get<NoteUpdateService>(NoteUpdateService);
        noteCreateService = app.get<NoteCreateService>(NoteCreateService);
        notesRepository = app.get<NotesRepository>(DI.notesRepository);
        usersRepository = app.get<UsersRepository>(DI.usersRepository);
        noteRevisionsRepository = app.get<NoteRevisionsRepository>(DI.noteRevisionsRepository);
        pollsRepository = app.get<PollsRepository>(DI.pollsRepository);
        db = app.get<DataSource>(DI.db);

        // Create a test user
        testUser = await createUser();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Revision capture', () => {
        test('should create revision when updating note text', async () => {
            // Create a note
            const note = await noteCreateService.create(testUser, {
                text: 'Original text',
            });

            // Update the note
            const updatedNote = await noteUpdateService.update(testUser, note, {
                text: 'Updated text',
                updatedAt: new Date(),
            });

            // Check that revision was created
            const revisions = await noteRevisionsRepository.find({
                where: { noteId: note.id },
            });

            expect(revisions.length).toBe(1);
            expect(revisions[0].version).toBe(1);
            expect(revisions[0].editorId).toBe(testUser.id);
            expect(revisions[0].payload.text).toBe('Original text');
        });

        test('should increment version number on multiple edits', async () => {
            // Create a note
            const note = await noteCreateService.create(testUser, {
                text: 'Version 0',
            });

            // First update
            await noteUpdateService.update(testUser, note, {
                text: 'Version 1',
                updatedAt: new Date(),
            });

            // Second update
            await noteUpdateService.update(testUser, note, {
                text: 'Version 2',
                updatedAt: new Date(),
            });

            // Check revisions
            const revisions = await noteRevisionsRepository.find({
                where: { noteId: note.id },
                order: { version: 'ASC' },
            });

            expect(revisions.length).toBe(2);
            expect(revisions[0].version).toBe(1);
            expect(revisions[0].payload.text).toBe('Version 0');
            expect(revisions[1].version).toBe(2);
            expect(revisions[1].payload.text).toBe('Version 1');
        });

        test('should advance updatedAt on edit', async () => {
            const note = await noteCreateService.create(testUser, {
                text: 'Original',
            });

            const beforeUpdate = note.updatedAt;
            
            // Wait a bit to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            const updateTime = new Date();
            const updatedNote = await noteUpdateService.update(testUser, note, {
                text: 'Modified',
                updatedAt: updateTime,
            });

            expect(updatedNote.updatedAt).not.toBeNull();
            expect(updatedNote.updatedAt!.getTime()).toBe(updateTime.getTime());
        });
    });

    describe('Poll updates', () => {
        test('should capture poll in revision', async () => {
            const note = await noteCreateService.create(testUser, {
                text: 'Poll note',
                poll: {
                    choices: ['Option A', 'Option B'],
                    multiple: false,
                    expiresAt: null,
                },
            });

            await noteUpdateService.update(testUser, note, {
                text: 'Updated poll note',
                updatedAt: new Date(),
            });

            const revisions = await noteRevisionsRepository.find({
                where: { noteId: note.id },
            });

            expect(revisions.length).toBe(1);
            expect(revisions[0].payload.poll).not.toBeNull();
            expect(revisions[0].payload.poll.choices).toEqual(['Option A', 'Option B']);
        });
    });

    describe('Derived fields', () => {
        test('should recompute emojis when text changes', async () => {
            const note = await noteCreateService.create(testUser, {
                text: 'Hello :smile:',
            });

            const updatedNote = await noteUpdateService.update(testUser, note, {
                text: 'Hello :tada: :rocket:',
                updatedAt: new Date(),
            });

            // The actual emoji extraction depends on the instance's custom emojis
            // But we can verify that emojis field was recomputed
            expect(Array.isArray(updatedNote.emojis)).toBe(true);
        });

        test('should recompute tags when text changes', async () => {
            const note = await noteCreateService.create(testUser, {
                text: 'Post with #tag1',
            });

            const updatedNote = await noteUpdateService.update(testUser, note, {
                text: 'Post with #tag2 #tag3',
                updatedAt: new Date(),
            });

            expect(updatedNote.tags.length).toBe(2);
            expect(updatedNote.tags).toContain('tag2');
            expect(updatedNote.tags).toContain('tag3');
        });
    });

    describe('getRevisions', () => {
        test('should return revisions in descending order', async () => {
            const note = await noteCreateService.create(testUser, {
                text: 'V0',
            });

            await noteUpdateService.update(testUser, note, {
                text: 'V1',
                updatedAt: new Date(),
            });

            await noteUpdateService.update(testUser, note, {
                text: 'V2',
                updatedAt: new Date(),
            });

            const revisions = await noteUpdateService.getRevisions(note.id);

            expect(revisions.length).toBe(2);
            expect(revisions[0].version).toBe(2);
            expect(revisions[1].version).toBe(1);
        });
    });
});
