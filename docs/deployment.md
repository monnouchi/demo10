# 公開とディレクトリ

- `src/`：TypeScript・Canvas・Web Audioのゲーム本体。
- `dist/`：`npm run build` の出力。Pagesに配信する唯一のディレクトリ。Git管理しません。
- `docs/`：この説明書などのMarkdown。ゲームの配信元ではありません。

## 更新

`npm ci`、`npm run build` で確認し、ソースを `main` に通常pushします。GitHub Actionsの「Build and deploy Pages」が成功すると <https://monnouchi.github.io/demo10/> が更新されます。`npm run preview` でローカルのビルド結果を確認できます。

Pagesの公開元はSettings → Pages → Source → **GitHub Actions**。所有者が設定済みです。ワークフローはPages設定を書き換えません。

公開版の `deployment.json` にはActionsがビルドしたcommit SHAを記録します。Actions実行のSHAと照合できます。古い画面が残る場合は再読み込みしてください。

## 初版からの移行

初版でcommitしていた `docs/index.html` と `docs/assets/` は削除しました。生成物をcommitする必要はありません。旧方式の `main` / `/docs` を公開元に選ぶとゲームを配信できません。
