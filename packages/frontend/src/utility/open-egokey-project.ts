/*
 * SPDX-FileCopyrightText: noridev and cherrypick-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as os from '@/os.js';

export function openEgoKeyProject(ev: MouseEvent) {
	os.popupMenu([{
		text: 'GitHub',
		icon: 'ti ti-brand-github',
		action: () => {
			window.open('https://github.com/anxrch/egokey', '_blank');
		},
	}], ev.currentTarget ?? ev.target);
}
