/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import { api, post, signup } from '../utils.js';
import type * as misskey from 'misskey-js';

describe('Note Edit', () => {
    let alice: misskey.entities.SignupResponse;
    let bob: misskey.entities.SignupResponse;

    beforeAll(async () => {
        alice = await signup({ username: 'alice' });
        bob = await signup({ username: 'bob' });
    }, 1000 * 60 * 2);

    describe('notes/update', () => {
        test('ノートを編集できる', async () => {
            const note = await post(alice, { text: 'test note' });

            const res = await api('notes/update', {
                noteId: note.id,
                text: 'edited note',
            }, alice);

            assert.strictEqual(res.status, 200);
            assert.strictEqual(typeof res.body === 'object' && !Array.isArray(res.body), true);
            assert.strictEqual(res.body.updatedNote.text, 'edited note');
            assert.ok(res.body.updatedNote.updatedAt);
        });

        test('他人のノートは編集できない', async () => {
            const note = await post(alice, { text: 'test note' });

            const res = await api('notes/update', {
                noteId: note.id,
                text: 'edited by bob',
            }, bob);

            assert.strictEqual(res.status, 400);
        });

        test('存在しないノートは編集できない', async () => {
            const res = await api('notes/update', {
                noteId: 'xxxxxxxxxx',
                text: 'edited note',
            }, alice);

            assert.strictEqual(res.status, 400);
        });

        test('編集後のノートにisEditedフラグがある', async () => {
            const note = await post(alice, { text: 'test note' });

            await api('notes/update', {
                noteId: note.id,
                text: 'edited note',
            }, alice);

            const res = await api('notes/show', { noteId: note.id }, alice);

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.isEdited, true);
            assert.ok(res.body.editCount);
            assert.ok(res.body.editCount >= 1);
            assert.ok(res.body.latestEditedAt);
        });

        test('CWを編集できる', async () => {
            const note = await post(alice, { text: 'test note', cw: 'original cw' });

            const res = await api('notes/update', {
                noteId: note.id,
                cw: 'edited cw',
            }, alice);

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.updatedNote.cw, 'edited cw');
        });

        test('ファイルを編集できる', async () => {
            const file = await api('drive/files/upload-from-url', {
                url: 'https://raw.githubusercontent.com/misskey-dev/misskey/develop/packages/backend/test/resources/Lenna.jpg',
            }, alice);

            // Wait for file to be uploaded
            await new Promise(resolve => setTimeout(resolve, 1000));

            const note = await post(alice, { text: 'test note' });

            assert.ok(file.body);
            const res = await api('notes/update', {
                noteId: note.id,
                fileIds: [file.body.id],
            }, alice);

            assert.strictEqual(res.status, 200);
            assert.ok(res.body.updatedNote.fileIds);
            assert.strictEqual(res.body.updatedNote.fileIds.length, 1);
        });

        test('pollを編集できる', async () => {
            const note = await post(alice, { text: 'test note' });

            const res = await api('notes/update', {
                noteId: note.id,
                poll: {
                    choices: ['option1', 'option2'],
                },
            }, alice);

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.updatedNote.hasPoll, true);
        });

        test('visibilityを編集できる（通常ユーザーは自分のノートのみ）', async () => {
            const note = await post(alice, { text: 'test note', visibility: 'public' });

            const res = await api('notes/update', {
                noteId: note.id,
                visibility: 'home',
            }, alice);

            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.body.updatedNote.visibility, 'home');
        });
    });

    describe('notes/edit-history', () => {
        test('編集履歴を取得できる', async () => {
            const note = await post(alice, { text: 'test note' });

            // Edit the note twice
            await api('notes/update', {
                noteId: note.id,
                text: 'edited once',
            }, alice);

            await api('notes/update', {
                noteId: note.id,
                text: 'edited twice',
            }, alice);

            const res = await api('notes/edit-history', { noteId: note.id }, alice);

            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.body));
            assert.ok(res.body.length >= 2);
            assert.ok(res.body[0].version);
            assert.ok(res.body[0].createdAt);
            assert.ok(res.body[0].editorId);
            assert.ok(res.body[0].payload);
        });

        test('編集されていないノートの履歴は空', async () => {
            const note = await post(alice, { text: 'test note' });

            const res = await api('notes/edit-history', { noteId: note.id }, alice);

            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.body));
            assert.strictEqual(res.body.length, 0);
        });

        test('limitで取得件数を制限できる', async () => {
            const note = await post(alice, { text: 'test note' });

            // Edit the note multiple times
            for (let i = 0; i < 5; i++) {
                await api('notes/update', {
                    noteId: note.id,
                    text: `edited ${i + 1}`,
                }, alice);
            }

            const res = await api('notes/edit-history', {
                noteId: note.id,
                limit: 3,
            }, alice);

            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.body));
            assert.strictEqual(res.body.length, 3);
        });

        test('存在しないノートの履歴は取得できない', async () => {
            const res = await api('notes/edit-history', {
                noteId: 'xxxxxxxxxx',
            }, alice);

            assert.strictEqual(res.status, 400);
        });

        test('閲覧できないノートの履歴は取得できない', async () => {
            const note = await post(alice, { text: 'followers only', visibility: 'followers' });

            const res = await api('notes/edit-history', {
                noteId: note.id,
            }, bob);

            assert.strictEqual(res.status, 400);
        });

        test('編集履歴にpayloadが含まれる', async () => {
            const note = await post(alice, { text: 'original', cw: 'cw1' });

            await api('notes/update', {
                noteId: note.id,
                text: 'edited',
                cw: 'cw2',
            }, alice);

            const res = await api('notes/edit-history', { noteId: note.id }, alice);

            assert.strictEqual(res.status, 200);
            assert.ok(res.body[0].payload.text);
            assert.ok(res.body[0].payload.cw);
        });
    });
});
