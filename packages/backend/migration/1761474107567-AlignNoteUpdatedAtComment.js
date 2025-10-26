/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AlignNoteUpdatedAtComment1761474107567 {
    name = 'AlignNoteUpdatedAtComment1761474107567'

    async up(queryRunner) {
        await queryRunner.query(`COMMENT ON COLUMN "note"."updatedAt" IS 'The updated date of the Note.'`);
    }

    async down(queryRunner) {
        await queryRunner.query(`COMMENT ON COLUMN "note"."updatedAt" IS NULL`);
    }
}
