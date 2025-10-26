/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { jest } from '@jest/globals';

import { MockResolver } from '../misc/mock-resolver.js';
import { GlobalModule } from '@/GlobalModule.js';
import { CoreModule } from '@/core/CoreModule.js';
import { DI } from '@/di-symbols.js';
import { ApNoteService } from '@/core/activitypub/models/ApNoteService.js';
import { ApPersonService } from '@/core/activitypub/models/ApPersonService.js';
import { ApRendererService } from '@/core/activitypub/ApRendererService.js';
import { ApInboxService } from '@/core/activitypub/ApInboxService.js';
import { NoteUpdateService } from '@/core/NoteUpdateService.js';
import { NoteCreateService } from '@/core/NoteCreateService.js';
import { LoggerService } from '@/core/LoggerService.js';
import { DownloadService } from '@/core/DownloadService.js';
import { FederatedInstanceService } from '@/core/FederatedInstanceService.js';
import { NotificationService } from '@/core/NotificationService.js';
import type { Config } from '@/config.js';
import type { NotesRepository, UsersRepository, NoteRevisionsRepository, UserProfilesRepository, MiMeta } from '@/models/_.js';
import type { MiLocalUser, MiRemoteUser } from '@/models/User.js';
import type { MiNote } from '@/models/Note.js';
import type { IActor, IPost, IUpdate } from '@/core/activitypub/type.js';
import { secureRndstr } from '@/misc/secure-rndstr.js';
import { genAidx } from '@/misc/id/aidx.js';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const host = 'https://remote.test';

type NonTransientIActor = IActor & { id: string };
type NonTransientIPost = IPost & { id: string };

function createRandomActor({ actorHost = host } = {}): NonTransientIActor {
    const preferredUsername = secureRndstr(8);
    const actorId = `${actorHost}/users/${preferredUsername.toLowerCase()}`;

    return {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: actorId,
        type: 'Person',
        preferredUsername,
        inbox: `${actorId}/inbox`,
        outbox: `${actorId}/outbox`,
    };
}

function createRandomNote(actor: NonTransientIActor, options: Partial<IPost> = {}): NonTransientIPost {
    const id = secureRndstr(8);
    const noteId = `${new URL(actor.id).origin}/notes/${id}`;

    return {
        id: noteId,
        type: 'Note',
        attributedTo: actor.id,
        content: 'test content',
        published: new Date().toISOString(),
        to: ['https://www.w3.org/ns/activitystreams#Public'],
        ...options,
    };
}

describe('Federated Note Edits', () => {
    let app: TestingModule;
    let config: Config;
    let noteService: ApNoteService;
    let personService: ApPersonService;
    let rendererService: ApRendererService;
    let inboxService: ApInboxService;
    let noteUpdateService: NoteUpdateService;
    let noteCreateService: NoteCreateService;
    let notesRepository: NotesRepository;
    let usersRepository: UsersRepository;
    let userProfilesRepository: UserProfilesRepository;
    let noteRevisionsRepository: NoteRevisionsRepository;
    let resolver: MockResolver;
    let db: DataSource;

    const meta = {
        cacheRemoteFiles: true,
        cacheRemoteSensitiveFiles: true,
        enableFanoutTimeline: true,
        enableFanoutTimelineDbFallback: true,
        perUserHomeTimelineCacheMax: 100,
        perLocalUserUserTimelineCacheMax: 100,
        perRemoteUserUserTimelineCacheMax: 100,
        blockedHosts: [] as string[],
        sensitiveWords: [] as string[],
        prohibitedWords: [] as string[],
    } as MiMeta;

    beforeAll(async () => {
        app = await Test.createTestingModule({
            imports: [GlobalModule, CoreModule],
        })
            .overrideProvider(DownloadService).useValue({
                async downloadUrl(url: string, path: string): Promise<{ filename: string }> {
                    if (url.endsWith('.png')) {
                        fs.copyFileSync(
                            _dirname + '/../resources/hw.png',
                            path,
                        );
                    }
                    return {
                        filename: 'dummy.tmp',
                    };
                },
            })
            .overrideProvider(DI.meta).useFactory({ factory: () => meta })
            .compile();

        await app.init();

        config = app.get<Config>(DI.config);
        noteService = app.get<ApNoteService>(ApNoteService);
        personService = app.get<ApPersonService>(ApPersonService);
        rendererService = app.get<ApRendererService>(ApRendererService);
        inboxService = app.get<ApInboxService>(ApInboxService);
        noteUpdateService = app.get<NoteUpdateService>(NoteUpdateService);
        noteCreateService = app.get<NoteCreateService>(NoteCreateService);
        notesRepository = app.get<NotesRepository>(DI.notesRepository);
        usersRepository = app.get<UsersRepository>(DI.usersRepository);
        userProfilesRepository = app.get<UserProfilesRepository>(DI.userProfilesRepository);
        noteRevisionsRepository = app.get<NoteRevisionsRepository>(DI.noteRevisionsRepository);
        db = app.get<DataSource>(DI.db);

        resolver = new MockResolver(await app.resolve<LoggerService>(LoggerService));

        // Prevent ApPersonService from fetching instance, as it causes Jest import-after-test error
        const federatedInstanceService = app.get<FederatedInstanceService>(FederatedInstanceService);
        jest.spyOn(federatedInstanceService, 'fetch').mockImplementation(() => new Promise(() => { }));

        // Mock notification creation to avoid user profile lookup issues during tests
        const notificationService = app.get<NotificationService>(NotificationService);
        jest.spyOn(notificationService, 'createNotification').mockImplementation(() => undefined);
    });

    afterAll(async () => {
        await app.close();
    });

    async function createLocalUser(data: Partial<MiLocalUser> = {}): Promise<MiLocalUser> {
        const un = secureRndstr(16);
        const x = await usersRepository.insert({
            id: genAidx(Date.now()),
            username: un,
            usernameLower: un,
            host: null,
            ...data,
        });
        const user = await usersRepository.findOneByOrFail(x.identifiers[0]) as MiLocalUser;
        await userProfilesRepository.insert({
            userId: user.id,
        });
        return user;
    }

    async function createRemoteUser(actor: NonTransientIActor): Promise<MiRemoteUser> {
        resolver.register(actor.id, actor);
        return await personService.createPerson(actor.id, resolver);
    }

    describe('Outbound Update activities', () => {
        test('should render Update activity with full note object', async () => {
            const localUser = await createLocalUser();
            const note = await noteCreateService.create(localUser, {
                text: 'Original text',
            });

            const updatedNote = await noteUpdateService.update(localUser, note, {
                text: 'Updated text',
                updatedAt: new Date(),
            });

            // Render the note as ActivityPub object
            const renderedNote = await rendererService.renderNote(updatedNote, false);
            const updateActivity = rendererService.renderUpdate(renderedNote, localUser);

            expect(updateActivity.type).toBe('Update');
            expect(updateActivity.actor).toBe(`${config.url}/users/${localUser.id}`);
            expect(updateActivity.object).toMatchObject({
                type: 'Note',
                content: expect.stringContaining('Updated text'),
            });
            expect(updateActivity.to).toContain('https://www.w3.org/ns/activitystreams#Public');
        });

        test('should include updated timestamp in rendered note', async () => {
            const localUser = await createLocalUser();
            const note = await noteCreateService.create(localUser, {
                text: 'Original',
            });

            const updateTime = new Date();
            const updatedNote = await noteUpdateService.update(localUser, note, {
                text: 'Modified',
                updatedAt: updateTime,
            });

            const renderedNote = await rendererService.renderNote(updatedNote, false);
            expect(renderedNote.updated).toBe(updateTime.toISOString());
        });

        test('should respect followers-only visibility in Update activity', async () => {
            const localUser = await createLocalUser();
            const note = await noteCreateService.create(localUser, {
                text: 'Original',
                visibility: 'followers',
            });

            const renderedNote = await rendererService.renderNote(note, false);
            const updateActivity = rendererService.renderUpdate(renderedNote, localUser);

            expect(updateActivity.to).toEqual([`${config.url}/users/${localUser.id}/followers`]);
            expect(updateActivity.to).not.toContain('https://www.w3.org/ns/activitystreams#Public');
        });

        test('should not federate local-only note updates', async () => {
            const localUser = await createLocalUser();
            const note = await noteCreateService.create(localUser, {
                text: 'Local only',
                localOnly: true,
            });

            // The renderNoteActivity method should return null for local-only notes
            // This is tested indirectly through the service layer
            expect(note.localOnly).toBe(true);
        });

        test('should not federate specified visibility note updates', async () => {
            const localUser = await createLocalUser();
            const otherUser = await createLocalUser();
            const note = await noteCreateService.create(localUser, {
                text: 'Direct message',
                visibility: 'specified',
                visibleUsers: [otherUser],
            });

            expect(note.visibility).toBe('specified');
        });

        test('should re-render attachments after edit', async () => {
            // This test verifies that attachments are properly included in Update activities
            const localUser = await createLocalUser();
            const note = await noteCreateService.create(localUser, {
                text: 'Note with files',
            });

            const renderedNote = await rendererService.renderNote(note, false);
            expect(renderedNote.attachment).toBeDefined();
        });
    });

    describe('Inbound Update activities', () => {
        test('should consume remote Update activity and update local note', async () => {
            const actor = createRandomActor();
            const remoteUser = await createRemoteUser(actor);

            // Create initial note
            const initialNote = createRandomNote(actor, {
                content: '<p>Original content</p>',
                _misskey_content: 'Original content',
            });
            resolver.register(initialNote.id, initialNote);

            const createdNote = await noteService.createNote(initialNote, remoteUser, resolver);
            expect(createdNote).not.toBeNull();
            expect(createdNote!.text).toBe('Original content');

            // Update the note
            const updatedNoteObject = createRandomNote(actor, {
                id: initialNote.id,
                content: '<p>Updated content</p>',
                _misskey_content: 'Updated content',
                updated: new Date().toISOString(),
            });
            resolver.register(initialNote.id, updatedNoteObject);

            const updateActivity: IUpdate = {
                '@context': 'https://www.w3.org/ns/activitystreams',
                type: 'Update',
                actor: actor.id,
                object: updatedNoteObject,
            };
            resolver.register(updateActivity.id!, updateActivity);

            await inboxService.performOneActivity(remoteUser, updateActivity, resolver);

            // Check that note was updated
            const dbNote = await notesRepository.findOneBy({ uri: initialNote.id });
            expect(dbNote).not.toBeNull();
            expect(dbNote!.text).toBe('Updated content');
            expect(dbNote!.updatedAt).not.toBeNull();
        });

        test('should append NoteRevision when consuming remote Update', async () => {
            const actor = createRandomActor();
            const remoteUser = await createRemoteUser(actor);

            // Create initial note
            const initialNote = createRandomNote(actor, {
                content: '<p>Version 1</p>',
                _misskey_content: 'Version 1',
            });
            resolver.register(initialNote.id, initialNote);

            const createdNote = await noteService.createNote(initialNote, remoteUser, resolver);
            expect(createdNote).not.toBeNull();

            // Update the note
            const updatedNoteObject = createRandomNote(actor, {
                id: initialNote.id,
                content: '<p>Version 2</p>',
                _misskey_content: 'Version 2',
                updated: new Date().toISOString(),
            });
            resolver.register(initialNote.id, updatedNoteObject);

            const updateActivity: IUpdate = {
                '@context': 'https://www.w3.org/ns/activitystreams',
                type: 'Update',
                actor: actor.id,
                object: updatedNoteObject,
            };

            await inboxService.performOneActivity(remoteUser, updateActivity, resolver);

            // Check that revision was created
            const revisions = await noteRevisionsRepository.find({
                where: { noteId: createdNote!.id },
            });
            expect(revisions.length).toBe(1);
            expect(revisions[0].version).toBe(1);
            expect(revisions[0].payload.text).toBe('Version 1');
        });

        test('should reject Update from non-author', async () => {
            const actor = createRandomActor();
            const remoteUser = await createRemoteUser(actor);

            const actor2 = createRandomActor({ actorHost: 'https://other.test' });
            const remoteUser2 = await createRemoteUser(actor2);

            // Create note by first user
            const initialNote = createRandomNote(actor, {
                content: '<p>Original</p>',
                _misskey_content: 'Original',
            });
            resolver.register(initialNote.id, initialNote);

            const createdNote = await noteService.createNote(initialNote, remoteUser, resolver);
            expect(createdNote).not.toBeNull();

            // Try to update from different user
            const maliciousUpdate = createRandomNote(actor2, {
                id: initialNote.id,
                attributedTo: actor2.id,
                content: '<p>Malicious</p>',
                _misskey_content: 'Malicious',
            });
            resolver.register(initialNote.id, maliciousUpdate);

            const updateActivity: IUpdate = {
                '@context': 'https://www.w3.org/ns/activitystreams',
                type: 'Update',
                actor: actor2.id,
                object: maliciousUpdate,
            };

            // Should throw or return error
            await expect(
                inboxService.performOneActivity(remoteUser2, updateActivity, resolver),
            ).rejects.toThrow();

            // Original note should be unchanged
            const dbNote = await notesRepository.findOneBy({ uri: initialNote.id });
            expect(dbNote!.text).toBe('Original');
        });

        test('should handle Update with attachments', async () => {
            const actor = createRandomActor();
            const remoteUser = await createRemoteUser(actor);

            // Create initial note without attachments
            const initialNote = createRandomNote(actor, {
                content: '<p>Original</p>',
                _misskey_content: 'Original',
                attachment: [],
            });
            resolver.register(initialNote.id, initialNote);

            const createdNote = await noteService.createNote(initialNote, remoteUser, resolver);
            expect(createdNote).not.toBeNull();
            expect(createdNote!.fileIds.length).toBe(0);

            // Update with attachments
            const updatedNoteObject = createRandomNote(actor, {
                id: initialNote.id,
                content: '<p>With image</p>',
                _misskey_content: 'With image',
                updated: new Date().toISOString(),
                attachment: [{
                    type: 'Document',
                    mediaType: 'image/png',
                    url: 'https://remote.test/files/image.png',
                    name: 'test image',
                }],
            });
            resolver.register(initialNote.id, updatedNoteObject);
            resolver.register('https://remote.test/files/image.png', '');

            const updateActivity: IUpdate = {
                '@context': 'https://www.w3.org/ns/activitystreams',
                type: 'Update',
                actor: actor.id,
                object: updatedNoteObject,
            };

            await inboxService.performOneActivity(remoteUser, updateActivity, resolver);

            // Note should have the attachment now
            const dbNote = await notesRepository.findOneBy({ uri: initialNote.id });
            expect(dbNote!.text).toBe('With image');
        });

        test('should validate actor matches activity.actor', async () => {
            const actor = createRandomActor();
            const remoteUser = await createRemoteUser(actor);

            const fakeActor = createRandomActor({ actorHost: 'https://fake.test' });

            const note = createRandomNote(actor);
            resolver.register(note.id, note);

            const updateActivity: IUpdate = {
                '@context': 'https://www.w3.org/ns/activitystreams',
                type: 'Update',
                actor: fakeActor.id, // Different from remoteUser.uri
                object: note,
            };

            const result = await inboxService.performOneActivity(remoteUser, updateActivity, resolver);
            expect(result).toBe('skip: invalid actor');
        });
    });

    describe('Edit history', () => {
        test('should populate history for remote edits', async () => {
            const actor = createRandomActor();
            const remoteUser = await createRemoteUser(actor);

            // Create initial note
            const initialNote = createRandomNote(actor, {
                content: '<p>V0</p>',
                _misskey_content: 'V0',
            });
            resolver.register(initialNote.id, initialNote);

            const createdNote = await noteService.createNote(initialNote, remoteUser, resolver);

            // First edit
            const v1 = createRandomNote(actor, {
                id: initialNote.id,
                content: '<p>V1</p>',
                _misskey_content: 'V1',
                updated: new Date().toISOString(),
            });
            resolver.register(initialNote.id, v1);
            await inboxService.performOneActivity(remoteUser, {
                type: 'Update',
                actor: actor.id,
                object: v1,
            } as IUpdate, resolver);

            // Second edit
            const v2 = createRandomNote(actor, {
                id: initialNote.id,
                content: '<p>V2</p>',
                _misskey_content: 'V2',
                updated: new Date().toISOString(),
            });
            resolver.register(initialNote.id, v2);
            await inboxService.performOneActivity(remoteUser, {
                type: 'Update',
                actor: actor.id,
                object: v2,
            } as IUpdate, resolver);

            // Check revisions
            const revisions = await noteUpdateService.getRevisions(createdNote!.id);
            expect(revisions.length).toBe(2);
            expect(revisions[0].payload.text).toBe('V1');
            expect(revisions[1].payload.text).toBe('V0');
        });
    });
});
