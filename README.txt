蒼穹ストライカー（SKYLINE STRIKER）
=======================================

概要
----
PC版Google Chrome向けの、オリジナル縦スクロールシューティングゲームです。
フロントエンドはPhaser 3、バックエンドはFastifyで構成されています。

必要な環境
----------
- DockerおよびDocker Compose
- PC版Google Chrome最新版

Node.js上で直接開発・検証する場合は、次の環境も必要です。
- Node.js 24以上
- npm

Docker Composeでの起動
----------------------
プロジェクトのルートディレクトリで、次のコマンドを実行します。

  ./execute/development.sh

バックグラウンドで起動する場合は、次のように指定します。

  ./execute/development.sh -d

コンテナのビルド完了後、PC版Google Chromeで次のURLを開きます。

  http://127.0.0.1:5173

バックエンドの起動状態は次のURLで確認できます。

  http://127.0.0.1:3000/api/health

停止
----
フォアグラウンドで起動している場合は、Ctrl+Cを押します。

バックグラウンドで起動した場合は、プロジェクトのルートで次を実行します。

  docker compose down

ログの確認
----------
  docker compose logs -f

サービスの状態確認
------------------
  docker compose ps

ゲーム操作
----------
- カーソルキー: 自機の移動、メニュー項目の選択
- Zキー: 空中攻撃、メニューの決定
- Xキー: 地上攻撃
- Enterキー: メニューの決定
- Escapeキー: ランキング画面からタイトル画面へ戻る

スコアデータ
------------
スコアはバックエンドプロセスのメモリだけに保存されます。
バックエンドコンテナの再作成・再起動やプロセス終了により、登録済みスコアは消去されます。

Node.jsでの直接起動
-------------------
Dockerを使用せずに開発サーバーを起動する場合は、プロジェクトのルートで実行します。

  npm install
  npm run dev

起動URLはDocker Compose使用時と同じです。

検証コマンド
------------
プロジェクトのルートで実行します。

  npm test
  npm run typecheck
  npm run lint
  npm run format:check
  npm run build

主なディレクトリ
----------------
- frontend/: Phaser 3ゲーム
- backend/: スコアAPI
- shared/: API共有型
- specs/: 正式仕様
- execute/: 環境別の起動スクリプト

トラブル対応
------------
- ポート5173または3000が使用中の場合は、そのポートを使用している別プロセスを停止してください。
- 画面が表示されない場合は「docker compose ps」と「docker compose logs」を確認してください。
- 音声はブラウザの自動再生制限に従います。ゲーム開始後も聞こえない場合は、Chromeのタブがミュートされていないか確認してください。
- 対応対象はPC版Google Chrome最新版です。スマートフォン、タブレット、その他のブラウザは対象外です。
