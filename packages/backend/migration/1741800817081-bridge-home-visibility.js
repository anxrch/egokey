/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class BridgeHomeVisibility1741800817081 {
	name = 'BridgeHomeVisibility1741800817081';

	async up(queryRunner) {
		await queryRunner.query('ALTER TABLE "user_profile" ADD "bridgeHomeVisibility" boolean NOT NULL DEFAULT false');
	}

	async down(queryRunner) {
		await queryRunner.query('ALTER TABLE "user_profile" DROP COLUMN "bridgeHomeVisibility"');
	}
}
