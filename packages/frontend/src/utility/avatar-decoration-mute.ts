/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { prefer } from '@/preferences.js';

/**
 * 指定したユーザーのアバターデコレーションがミュートされているかどうか。
 * computed等の中で呼べばリアクティブに追従する
 */
export function isMuted(userId: string): boolean {
	return prefer.r.mutingAvatarDecorationUsers.value.includes(userId);
}

export function mute(userId: string) {
	const mutedUsers = prefer.r.mutingAvatarDecorationUsers.value;
	if (mutedUsers.includes(userId)) return;
	prefer.commit('mutingAvatarDecorationUsers', [...mutedUsers, userId]);
}

export function unmute(userId: string) {
	const mutedUsers = prefer.r.mutingAvatarDecorationUsers.value;
	prefer.commit('mutingAvatarDecorationUsers', mutedUsers.filter(id => id !== userId));
}
