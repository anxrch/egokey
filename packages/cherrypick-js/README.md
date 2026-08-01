# EgoKey SDK
**Strongly typed EgoKey SDK for browsers and Node.js.**

[![Test](https://github.com/anxrch/egokey/actions/workflows/test-cherrypick-js.yml/badge.svg)](https://github.com/anxrch/egokey/actions/workflows/test-cherrypick-js.yml)

[![NPM](https://nodei.co/npm/cherrypick-js.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/cherrypick-js)

JavaScript(TypeScript)用のEgoKey SDKです。既存利用者との互換性のため、npmパッケージ名は引き続き`cherrypick-js`です。ブラウザ/Node.js上で動作します。

以下が提供されています:
- ユーザー認証
- APIリクエスト
- ストリーミング
- ユーティリティ関数
- EgoKeyの各種型定義

EgoKey 4以降を対象としています。

## Install
```
npm i cherrypick-js
```

# Usage
インポートは以下のようにまとめて行うと便利です。

``` ts
import * as EgoKey from 'cherrypick-js';
```

便宜上、以後のコード例は上記のように`* as EgoKey`としてインポートしている前提のものになります。

ただし、このインポート方法だとTree-Shakingできなくなるので、コードサイズが重要なユースケースでは以下のような個別インポートをお勧めします。

``` ts
import { api as egokeyApi } from 'cherrypick-js';
```

## Authenticate
todo

## API request
APIを利用する際は、利用するサーバーの情報とアクセストークンを与えて`APIClient`クラスのインスタンスを初期化し、そのインスタンスの`request`メソッドを呼び出してリクエストを行います。

``` ts
const cli = new EgoKey.api.APIClient({
	origin: 'https://egokey.test',
	credential: 'TOKEN',
});

const meta = await cli.request('meta', { detail: true });
```

`request`の第一引数には呼び出すエンドポイント名、第二引数にはパラメータオブジェクトを渡します。レスポンスはPromiseとして返ります。

## Streaming
EgoKey SDKのストリーミングでは、二つのクラスが提供されます。
ひとつは、ストリーミングのコネクション自体を司る`Stream`クラスと、もうひとつはストリーミング上のチャンネルの概念を表す`Channel`クラスです。
ストリーミングを利用する際は、まず`Stream`クラスのインスタンスを初期化し、その後で`Stream`インスタンスのメソッドを利用して`Channel`クラスのインスタンスを取得する形になります。

``` ts
const stream = new EgoKey.Stream('https://egokey.test', { token: 'TOKEN' });
const mainChannel = stream.useChannel('main');
mainChannel.on('notification', notification => {
	console.log('notification received', notification);
});
```

コネクションが途切れても自動で再接続されます。

### チャンネルへの接続
チャンネルへの接続は`Stream`クラスの`useChannel`メソッドを使用します。

パラメータなし
``` ts
const stream = new EgoKey.Stream('https://egokey.test', { token: 'TOKEN' });

const mainChannel = stream.useChannel('main');
```

パラメータあり
``` ts
const stream = new EgoKey.Stream('https://egokey.test', { token: 'TOKEN' });

const chatChannel = stream.useChannel('chat', {
	other: 'xxxxxxxxxx',
});
```

### チャンネルから切断
`Channel`クラスの`dispose`メソッドを呼び出します。

``` ts
const stream = new EgoKey.Stream('https://egokey.test', { token: 'TOKEN' });

const mainChannel = stream.useChannel('main');

mainChannel.dispose();
```

### メッセージの受信
`Channel`クラスはEventEmitterを継承しており、メッセージがサーバーから受信されると受け取ったイベント名でペイロードをemitします。

``` ts
const stream = new EgoKey.Stream('https://egokey.test', { token: 'TOKEN' });
const mainChannel = stream.useChannel('main');
mainChannel.on('notification', notification => {
	console.log('notification received', notification);
});
```

### メッセージの送信
`Channel`クラスの`send`メソッドを使用してメッセージをサーバーに送信することができます。

``` ts
const stream = new EgoKey.Stream('https://egokey.test', { token: 'TOKEN' });
const chatChannel = stream.useChannel('chat', {
	other: 'xxxxxxxxxx',
});

chatChannel.send('read', {
	id: 'xxxxxxxxxx'
});
```

### コネクション確立イベント
`Stream`クラスの`_connected_`イベントが利用可能です。

``` ts
const stream = new EgoKey.Stream('https://egokey.test', { token: 'TOKEN' });
stream.on('_connected_', () => {
	console.log('connected');
});
```

### コネクション切断イベント
`Stream`クラスの`_disconnected_`イベントが利用可能です。

``` ts
const stream = new EgoKey.Stream('https://egokey.test', { token: 'TOKEN' });
stream.on('_disconnected_', () => {
	console.log('disconnected');
});
```

### コネクションの状態
`Stream`クラスの`state`プロパティで確認できます。

- `initializing`: 接続確立前
- `connected`: 接続完了
- `reconnecting`: 再接続中

---

<div align="center">
	<a href="https://github.com/anxrch/egokey/blob/main/CONTRIBUTING.md"><img src="https://assets.misskey-hub.net/public/i-want-you.png" width="300" alt="Contribute to EgoKey"></a>
</div>
