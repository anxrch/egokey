/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class RebrandEgoKey1785542401000 {
    name = 'RebrandEgoKey1785542401000'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "repositoryUrl" SET DEFAULT 'https://github.com/anxrch/egokey'`);
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "feedbackUrl" SET DEFAULT 'https://github.com/anxrch/egokey/issues/new'`);
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "preservedUsernames" SET DEFAULT '{admin,administrator,root,system,maintainer,host,mod,moderator,owner,superuser,staff,auth,i,me,everyone,all,mention,mentions,example,user,users,account,accounts,official,help,helps,support,supports,info,information,informations,announce,announces,announcement,announcements,notice,notification,notifications,dev,developer,developers,tech,misskey,cherrypick,egokey}'`);

        // Preserve administrator-provided URLs. Only replace the old upstream defaults.
        await queryRunner.query(`UPDATE "meta" SET "repositoryUrl" = 'https://github.com/anxrch/egokey' WHERE "repositoryUrl" = 'https://github.com/kokonect-link/cherrypick'`);
        await queryRunner.query(`UPDATE "meta" SET "feedbackUrl" = 'https://github.com/anxrch/egokey/issues/new' WHERE "feedbackUrl" = 'https://github.com/kokonect-link/cherrypick/issues/new'`);

        // Add the new reserved name without discarding any instance-specific entries.
        await queryRunner.query(`UPDATE "meta" SET "preservedUsernames" = array_append("preservedUsernames", 'egokey') WHERE NOT EXISTS (SELECT 1 FROM unnest("preservedUsernames") AS username(value) WHERE lower(username.value) = 'egokey')`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "repositoryUrl" SET DEFAULT 'https://github.com/kokonect-link/cherrypick'`);
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "feedbackUrl" SET DEFAULT 'https://github.com/kokonect-link/cherrypick/issues/new'`);
        await queryRunner.query(`ALTER TABLE "meta" ALTER COLUMN "preservedUsernames" SET DEFAULT '{admin,administrator,root,system,maintainer,host,mod,moderator,owner,superuser,staff,auth,i,me,everyone,all,mention,mentions,example,user,users,account,accounts,official,help,helps,support,supports,info,information,informations,announce,announces,announcement,announcements,notice,notification,notifications,dev,developer,developers,tech,misskey,cherrypick}'`);

        // Do not overwrite URLs or reserved names that may have been changed by an administrator.
    }
}
