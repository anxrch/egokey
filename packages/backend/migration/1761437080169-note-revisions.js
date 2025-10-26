/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NoteRevisions1761437080169 {
	name = 'NoteRevisions1761437080169'

	async up(queryRunner) {
		await queryRunner.query(`CREATE TABLE "note_revision" ("id" character varying(32) NOT NULL, "noteId" character varying(32) NOT NULL, "editorId" character varying(32) NOT NULL, "version" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "payload" jsonb NOT NULL, CONSTRAINT "PK_note_revision_id" PRIMARY KEY ("id")); COMMENT ON COLUMN "note_revision"."noteId" IS 'The ID of the note this revision belongs to.'; COMMENT ON COLUMN "note_revision"."editorId" IS 'The ID of the user who created this revision (editor).'; COMMENT ON COLUMN "note_revision"."version" IS 'Monotonically increasing version number for the note, starting at 1.'; COMMENT ON COLUMN "note_revision"."createdAt" IS 'The date this revision was created.'; COMMENT ON COLUMN "note_revision"."payload" IS 'JSONB payload containing the snapshot of note fields at this revision.'`);
		await queryRunner.query(`CREATE INDEX "IDX_note_revision_noteId" ON "note_revision" ("noteId") `);
		await queryRunner.query(`CREATE INDEX "IDX_note_revision_editorId" ON "note_revision" ("editorId") `);
		await queryRunner.query(`CREATE INDEX "IDX_note_revision_createdAt" ON "note_revision" ("createdAt") `);
		await queryRunner.query(`CREATE UNIQUE INDEX "IDX_note_revision_noteId_version" ON "note_revision" ("noteId", "version") `);
		await queryRunner.query(`ALTER TABLE "note_revision" ADD CONSTRAINT "FK_note_revision_noteId" FOREIGN KEY ("noteId") REFERENCES "note"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
		await queryRunner.query(`ALTER TABLE "note_revision" ADD CONSTRAINT "FK_note_revision_editorId" FOREIGN KEY ("editorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "note_revision" DROP CONSTRAINT "FK_note_revision_editorId"`);
		await queryRunner.query(`ALTER TABLE "note_revision" DROP CONSTRAINT "FK_note_revision_noteId"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_note_revision_noteId_version"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_note_revision_createdAt"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_note_revision_editorId"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_note_revision_noteId"`);
		await queryRunner.query(`DROP TABLE "note_revision"`);
	}
}
