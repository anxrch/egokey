/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class noteRenoteMuting1771390934122 {
    constructor() {
        this.name = 'noteRenoteMuting1771390934122';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "note_renote_muting" ("id" character varying(32) NOT NULL, "userId" character varying(32) NOT NULL, "noteId" character varying(32) NOT NULL, CONSTRAINT "PK_note_renote_muting" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_note_renote_muting_userId" ON "note_renote_muting" ("userId")`);
        await queryRunner.query(`CREATE INDEX "IDX_note_renote_muting_noteId" ON "note_renote_muting" ("noteId")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_note_renote_muting_userId_noteId" ON "note_renote_muting" ("userId", "noteId")`);
        await queryRunner.query(`ALTER TABLE "note_renote_muting" ADD CONSTRAINT "FK_note_renote_muting_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "note_renote_muting" ADD CONSTRAINT "FK_note_renote_muting_noteId" FOREIGN KEY ("noteId") REFERENCES "note"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "note_renote_muting" DROP CONSTRAINT "FK_note_renote_muting_noteId"`);
        await queryRunner.query(`ALTER TABLE "note_renote_muting" DROP CONSTRAINT "FK_note_renote_muting_userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_note_renote_muting_userId_noteId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_note_renote_muting_noteId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_note_renote_muting_userId"`);
        await queryRunner.query(`DROP TABLE "note_renote_muting"`);
    }
}
