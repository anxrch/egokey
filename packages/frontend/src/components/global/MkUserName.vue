<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<Mfm :text="(store.s.deidentifyMutedUsers && user.isMuted) ? i18n.ts.mutedUsers : (user.name ?? user.username)" :author="user" :plain="true" :nowrap="nowrap" :emojiUrls="user.emojis"/>
</template>

<script lang="ts" setup>
import { } from 'vue';
import * as Misskey from 'misskey-js';
import { store } from '@/store.js';
import { i18n } from '@/i18n.js';

const props = withDefaults(defineProps<{
	user: Misskey.entities.UserDetailed;
	nowrap?: boolean;
}>(), {
	nowrap: true,
});
</script>
