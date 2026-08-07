<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps_m">
	<MkInfo>{{ i18n.ts.avatarDecorationMuteDescription }}</MkInfo>

	<MkLoading v-if="fetching"/>
	<div v-else-if="users.length > 0 || unknownUserIds.length > 0" class="_gaps_s">
		<div v-for="user in users" :key="user.id" :class="$style.userItem">
			<MkA :class="$style.userItemBody" :to="userPage(user)">
				<MkUserCardMini :user="user"/>
			</MkA>
			<button class="_button" :class="$style.remove" @click="unmute(user.id, $event)"><i class="ti ti-x"></i></button>
		</div>
		<div v-for="userId in unknownUserIds" :key="userId" :class="$style.userItem">
			<div :class="[$style.userItemBody, $style.unknownUser]">{{ userId }}</div>
			<button class="_button" :class="$style.remove" @click="unmute(userId, $event)"><i class="ti ti-x"></i></button>
		</div>
	</div>
	<MkResult v-else type="empty" :text="i18n.ts.noUsers"/>

	<hr>

	<SearchMarker :keywords="['sync', 'devices']">
		<MkSwitch :modelValue="syncEnabled" @update:modelValue="changeSyncEnabled">
			<template #label><i class="ti ti-cloud-cog"></i> <SearchLabel>{{ i18n.ts.syncBetweenDevices }}</SearchLabel></template>
		</MkSwitch>
	</SearchMarker>
</div>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import * as Misskey from 'cherrypick-js';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkUserCardMini from '@/components/MkUserCardMini.vue';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { prefer } from '@/preferences.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { userPage } from '@/filters/user.js';
import { unmute as unmuteAvatarDecoration } from '@/utility/avatar-decoration-mute.js';

const mutedUserIds = prefer.r.mutingAvatarDecorationUsers;

const users = ref<Misskey.entities.UserDetailed[]>([]);
/** 削除されるなどして取得できなかったユーザー */
const unknownUserIds = ref<string[]>([]);
const fetching = ref(true);

async function fetchUsers() {
	const userIds = [...mutedUserIds.value];
	if (userIds.length === 0) {
		users.value = [];
		unknownUserIds.value = [];
		fetching.value = false;
		return;
	}

	fetching.value = true;
	try {
		const fetched = await misskeyApi('users/show', { userIds });
		// ミュートした順を保つ
		users.value = userIds.map(id => fetched.find(u => u.id === id)).filter(u => u != null);
		unknownUserIds.value = userIds.filter(id => !fetched.some(u => u.id === id));
	} catch {
		users.value = [];
		unknownUserIds.value = userIds;
	} finally {
		fetching.value = false;
	}
}

fetchUsers();

watch(mutedUserIds, () => {
	fetchUsers();
});

function unmute(userId: string, ev: MouseEvent) {
	os.popupMenu([{
		text: i18n.ts.avatarDecorationUnmute,
		icon: 'ti ti-x',
		action: () => {
			unmuteAvatarDecoration(userId);
		},
	}], ev.currentTarget ?? ev.target);
}

const syncEnabled = ref(prefer.isSyncEnabled('mutingAvatarDecorationUsers'));

function changeSyncEnabled(value: boolean) {
	if (value) {
		prefer.enableSync('mutingAvatarDecorationUsers').then((res) => {
			if (res == null) return;
			if (res.enabled) syncEnabled.value = true;
		});
	} else {
		prefer.disableSync('mutingAvatarDecorationUsers');
		syncEnabled.value = false;
	}
}
</script>

<style lang="scss" module>
.userItem {
	display: flex;
}

.userItemBody {
	flex: 1;
	min-width: 0;
	margin-right: 8px;

	&:hover {
		text-decoration: none;
	}
}

.unknownUser {
	align-self: center;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 90%;
	color: color(from var(--MI_THEME-fg) srgb r g b / 0.75);
}

.remove {
	width: 32px;
	height: 32px;
	align-self: center;
}
</style>
