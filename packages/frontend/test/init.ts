/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { vi } from 'vitest';
import createFetchMock from 'vitest-fetch-mock';
import type { Ref } from 'vue';
import { ref } from 'vue';

export const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

// Configure default fetch mock behavior to prevent real HTTP requests
fetchMocker.mockIf(/^.*$/, (req) => {
    const url = new URL(req.url, 'http://localhost:3000');
    
    // Mock common API endpoints
    if (url.pathname.startsWith('/api/')) {
        return Promise.resolve({
            status: 200,
            body: JSON.stringify({}),
        });
    }
    
    // Mock URL preview endpoint
    if (url.pathname === '/url') {
        return Promise.resolve({
            status: 200,
            body: JSON.stringify({
                url: url.searchParams.get('url') || 'https://example.com',
                title: null,
                description: null,
                thumbnail: null,
                icon: null,
                sitename: null,
                player: {
                    url: null,
                    width: null,
                    height: null,
                    allow: [],
                },
            }),
        });
    }
    
    // Mock static assets
    if (url.pathname.startsWith('/client-assets/') || url.pathname.startsWith('/assets/')) {
        return Promise.resolve({
            status: 200,
            body: '',
        });
    }
    
    // Default: return empty successful response
    return Promise.resolve({
        status: 404,
        body: JSON.stringify({ error: 'Not Found' }),
    });
});

// Mock window.location and document for config.js
vi.stubGlobal('location', {
    href: 'http://localhost:3000/',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    host: 'localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
});

// Mock meta tags that config.js depends on
if (typeof document !== 'undefined' && document.querySelector) {
    const metaInstanceUrl = document.querySelector('meta[property="instance_url"]');
    if (!metaInstanceUrl) {
        const meta = document.createElement('meta');
        meta.setAttribute('property', 'instance_url');
        meta.setAttribute('content', 'http://localhost:3000');
        document.head.appendChild(meta);
    }
}

// Set i18n
import locales from '../../../locales/index.js';
import { updateI18n } from '@/i18n.js';
updateI18n(locales['en-US']);

// XXX: misskey-js panics if WebSocket is not defined
vi.stubGlobal('WebSocket', class WebSocket extends EventTarget { static CLOSING = 2; });

export const preferState: Record<string, unknown> = {

    // なんかtestがうまいこと動かないのでここに書く
    dataSaver: {
        media: false,
        avatar: false,
        urlPreview: false,
        code: false,
    },

    mutingEmojis: [],
};

export let preferReactive: Record<string, Ref<unknown>> = {};

for (const key in preferState) {
    if (preferState[key] !== undefined) {
        preferReactive[key] = ref(preferState[key]);
    }
}

// XXX: store somehow becomes undefined in vitest?
vi.mock('@/preferences.js', () => {

    return {
        prefer: {
            s: preferState,
            r: preferReactive,
        },
    };
});

// Add mocks for Web Audio API
const AudioNodeMock = vi.fn(() => ({
    connect: vi.fn(() => ({ connect: vi.fn() })),
    start: vi.fn(),
}));

const GainNodeMock = vi.fn(() => ({
    gain: vi.fn(),
}));

const AudioContextMock = vi.fn(() => ({
    createBufferSource: vi.fn(() => new AudioNodeMock()),
    createGain: vi.fn(() => new GainNodeMock()),
    decodeAudioData: vi.fn(),
}));

vi.stubGlobal('AudioContext', AudioContextMock);
