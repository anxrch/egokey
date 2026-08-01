/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Config } from '@/config.js';

export const comment = `<!--
   _____ _                          _____ _      _
  / ____| |                        |  __ (_)    | |
 | |    | |__   ___ _ __ _ __ _   _| |__) |  ___| | __
 | |    | '_ \\ / _ \\ '__| '__| | | |  ___/ |/ __| |/ /
 | |____| | | |  __/ |  | |  | |_| | |   | | (__|   <
  \\_____|_| |_|\\___|_|  |_|   \\__, |_|   |_|\\___|_|\\_\\
                               __/ |
                              |___/

 Thank you for using EgoKey!
 If you are reading this message... how about joining the development?
 https://github.com/anxrch/egokey

-->`;

export const defaultDescription = '✨🌎✨ A interplanetary communication platform ✨🚀✨';

export type MinimumCommonData = {
	version: string;
	basedMisskeyVersion: string;
	config: Config;
};

export type CommonData = MinimumCommonData & {
	langs: string[];
	instanceName: string;
	icon: string | null;
	appleTouchIcon: string | null;
	themeColor: string | null;
	serverErrorImageUrl: string;
	infoImageUrl: string;
	notFoundImageUrl: string;
	youBlockedImageUrl: string;
	instanceUrl: string;
	now: number;
	federationEnabled: boolean;
	frontendBootloaderJs: string | null;
	frontendBootloaderCss: string | null;
	frontendEmbedBootloaderJs: string | null;
	frontendEmbedBootloaderCss: string | null;
	metaJson?: string;
	clientCtxJson?: string;
	customSplashText: string[] | null;
};

export type CommonPropsMinimum<T = Record<string, any>> = MinimumCommonData & T;

export type CommonProps<T = Record<string, any>> = CommonData & T;
