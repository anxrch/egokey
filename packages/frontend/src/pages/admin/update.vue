<!--
SPDX-FileCopyrightText: noridev and cherrypick-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">
			<div class="_panel" style="padding: 16px;">
				<MkSwitch v-model="enableReceivePrerelease">
					<template #label>{{ i18n.ts.enableReceivePrerelease }}</template>
				</MkSwitch>
			</div>

			<template v-if="(version && version.length > 0) && latestEgoKeyRelease">
				<FormInfo v-if="compareVersions(version, latestEgoKeyRelease.tag_name) > 0">{{ i18n.ts.youAreRunningBetaClient }}</FormInfo>
				<FormInfo v-else-if="compareVersions(version, latestEgoKeyRelease.tag_name) === 0" check>{{ i18n.ts.youAreRunningUpToDateClient }}</FormInfo>
				<FormInfo v-else warn>{{ i18n.ts.newVersionOfClientAvailable }}</FormInfo>
			</template>
			<FormInfo v-else>{{ i18n.ts.loading }}</FormInfo>

			<FormSection first>
				<template #label>{{ instanceName }}</template>
				<MkKeyValue @click="whatIsNewEgoKey">
					<template #key>{{ i18n.ts.currentVersion }} <i class="ti ti-external-link"></i></template>
					<template #value>{{ version }} <span :class="$style.commitHash" @click.stop="openCommitPage('anxrch/egokey', gitHash)">({{ gitHash.substring(0, 8) }})</span></template>
				</MkKeyValue>
				<MkKeyValue v-if="latestEgoKeyRelease && version < latestEgoKeyRelease.tag_name && !skipVersion" style="margin-top: 10px;" @click="whatIsNewLatestEgoKey">
					<template #key>{{ i18n.ts.latestVersion }} <i class="ti ti-external-link"></i></template>
					<template #value>{{ latestEgoKeyRelease.tag_name }} <span :class="$style.commitHash" @click.stop="openCommitPage('anxrch/egokey', egoKeyTagsMap.get(latestEgoKeyRelease.tag_name) || '')">({{ (egoKeyTagsMap.get(latestEgoKeyRelease.tag_name) || 'unknown').substring(0, 8) }})</span></template>
				</MkKeyValue>
				<MkButton v-if="latestEgoKeyRelease && !skipVersion && (compareVersions(version, latestEgoKeyRelease.tag_name) < 0)" style="margin-top: 10px;" @click="skipThisVersion">{{ i18n.ts.skipThisVersion }}</MkButton>
			</FormSection>

			<FormSection @click="whatIsNewLatestEgoKey">
				<template #label>EgoKey <i class="ti ti-external-link"></i></template>
				<MkKeyValue>
					<template #key>{{ i18n.ts.latestVersion }}</template>
					<template v-if="latestEgoKeyRelease" #value>{{ latestEgoKeyRelease.tag_name }} <span :class="$style.commitHash" @click.stop="openCommitPage('anxrch/egokey', egoKeyTagsMap.get(latestEgoKeyRelease.tag_name) || '')">({{ (egoKeyTagsMap.get(latestEgoKeyRelease.tag_name) || 'unknown').substring(0, 8) }})</span></template>
					<template v-else #value><MkEllipsis/></template>
				</MkKeyValue>
				<MkKeyValue style="margin: 8px 0 0; color: color(from var(--MI_THEME-fg) srgb r g b / 0.75); font-size: 0.85em;">
					<template v-if="latestEgoKeyRelease" #value><MkTime :time="latestEgoKeyRelease.published_at" mode="detail"/></template>
					<template v-else #value><MkEllipsis/></template>
				</MkKeyValue>
			</FormSection>

			<FormSection @click="whatIsNewLatestMisskey">
				<template #label>Misskey <i class="ti ti-external-link"></i></template>
				<MkKeyValue>
					<template #key>{{ i18n.ts.latestVersion }}</template>
					<template v-if="latestMisskeyRelease" #value>{{ latestMisskeyRelease.tag_name }} <span :class="$style.commitHash" @click.stop="openCommitPage('misskey-dev/misskey', misskeyTagsMap.get(latestMisskeyRelease.tag_name) || '')">({{ (misskeyTagsMap.get(latestMisskeyRelease.tag_name) || 'unknown').substring(0, 8) }})</span></template>
					<template v-else #value><MkEllipsis/></template>
				</MkKeyValue>
				<MkKeyValue style="margin: 8px 0 0; color: color(from var(--MI_THEME-fg) srgb r g b / 0.75); font-size: 0.85em;">
					<template v-if="latestMisskeyRelease" #value><MkTime :time="latestMisskeyRelease.published_at" mode="detail"/></template>
					<template v-else #value><MkEllipsis/></template>
				</MkKeyValue>
			</FormSection>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { version, instanceName, basedMisskeyVersion, gitHash } from '@@/js/config.js';
import { compareVersions } from 'compare-versions';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import { fetchInstance } from '@/instance.js';
import { openCommitPage, getCommitHashForRelease } from '@/utility/fetch-releases.js';
import FormInfo from '@/components/MkInfo.vue';
import FormSection from '@/components/form/section.vue';
import MkKeyValue from '@/components/MkKeyValue.vue';
import MkButton from '@/components/MkButton.vue';
import MkSwitch from '@/components/MkSwitch.vue';

const meta = await misskeyApi('admin/meta');

const enableReceivePrerelease = ref(meta.enableReceivePrerelease);
const skipVersion = ref(meta.skipVersion);
const skipCherryPickVersion = ref(meta.skipCherryPickVersion);
const egoKeyResponse = await window.fetch('https://api.github.com/repos/anxrch/egokey/releases');
const egoKeyData = await egoKeyResponse.json();
const releasesEgoKey = ref(meta.enableReceivePrerelease ? egoKeyData : egoKeyData.filter(x => !x.prerelease));
const misskeyResponse = await window.fetch('https://api.github.com/repos/misskey-dev/misskey/releases');
const misskeyData = await misskeyResponse.json();
const releasesMisskey = ref(meta.enableReceivePrerelease ? misskeyData : misskeyData.filter(x => !x.prerelease));
const latestEgoKeyRelease = computed(() => releasesEgoKey.value[0] ?? null);
const latestMisskeyRelease = computed(() => releasesMisskey.value[0] ?? null);
const egoKeyTagsMap = new Map<string, string>();
const misskeyTagsMap = new Map<string, string>();

if (releasesEgoKey.value.length > 0) {
	const hash = await getCommitHashForRelease('anxrch/egokey', releasesEgoKey.value[0]);
	egoKeyTagsMap.set(releasesEgoKey.value[0].tag_name, hash);
}

if (releasesMisskey.value.length > 0) {
	const hash = await getCommitHashForRelease('misskey-dev/misskey', releasesMisskey.value[0]);
	misskeyTagsMap.set(releasesMisskey.value[0].tag_name, hash);
}

const whatIsNewEgoKey = () => {
	window.open(`https://github.com/anxrch/egokey/blob/main/CHANGELOG_EGOKEY.md#${version.replace(/\./g, '')}`, '_blank');
};

const whatIsNewLatestEgoKey = () => {
	const release = latestEgoKeyRelease.value;
	if (release == null) return;
	window.open(`https://github.com/anxrch/egokey/blob/main/CHANGELOG_EGOKEY.md#${release.tag_name.replace(/\./g, '')}`, '_blank');
};

/**
 * const whatIsNewMisskey = () => {
 * 	window.open(`https://misskey-hub.net/docs/releases/#_${basedMisskeyVersion.replace(/\./g, '')}`, '_blank');
 * };
 */

const whatIsNewLatestMisskey = () => {
	const release = latestMisskeyRelease.value;
	if (release == null) return;
	window.open(`https://github.com/misskey-dev/misskey/blob/develop/CHANGELOG.md#${release.tag_name.replace(/\./g, '')}`, '_blank');
};

function save() {
	os.apiWithDialog('admin/update-meta', {
		enableReceivePrerelease: enableReceivePrerelease.value,
	}).then(() => {
		fetchInstance(true);
	});
}

function skipThisVersion() {
	const release = latestEgoKeyRelease.value;
	if (release == null) return;
	skipCherryPickVersion.value = release.tag_name;
	skipVersion.value = true;

	os.apiWithDialog('admin/update-meta', {
		skipVersion: skipVersion.value,
		skipCherryPickVersion: skipCherryPickVersion.value,
	}).then(() => {
		fetchInstance(true);
	});
}

watch([
	enableReceivePrerelease,
], () => {
	save();
});

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePage(() => ({
	title: i18n.ts.cherrypickUpdate,
	icon: 'ti ti-refresh',
}));
</script>

<style lang="scss" module>
.commitHash {
	font-size: 11px;
	opacity: 0.5;
	cursor: pointer;

	&:hover {
		opacity: 1 !important;
		text-decoration: underline;
		color: var(--MI_THEME-link);
	}
}
</style>
