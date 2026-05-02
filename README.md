# dencat.dev Portal System

このリポジトリは、`dencat.dev` の玄関口となるポータルサイトを管理しています。
「1枚のHTML」という軽量さを維持しつつ、情報の管理を自動化したデプロイシステムを採用しています。

## ❄️ システム構成
- **`services.json`**: **情報の核（Single Source of Truth）**。公開するサービスの情報をここに集約します。
- **`index.html`**: テンプレート兼ポータル本体。`build.py` によって動的にリストが更新されます。
- **`llms.txt`**: AIエージェント向けの索引ファイル。`build.py` によって自動生成されます。
- **`assets/`**: 季節ごとの背景画像（`month_01.webp` ～ `month_12.webp`）やアイコン（`favicon.png`）を格納します。
- **`convert_webp.py`**: PNG画像をWebPに変換するユーティリティスクリプトです。

## ❄️ サービスの更新方法
1.  **`services.json`** を編集。
2.  `python3 build.py` を実行。
3.  Gitでコミット＆プッシュ。

## ❄️ 背景画像の追加・更新方法
1.  `assets/` フォルダに PNG 画像を配置（例: `month_05.png`）。
2.  以下のスクリプトを実行して WebP に変換する：
    ```bash
    python3 convert_webp.py
    ```
3.  生成された `.webp` ファイルを Git でコミット＆プッシュ。
    ※ オリジナルの `.png` はプッシュしなくても大丈夫です（`.gitignore` で除外を推奨）。

---
"Always by your side." — Yuki
EOF
