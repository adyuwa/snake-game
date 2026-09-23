# 🐍 貪吃蛇 — 打包成 Android APK 說明

## 前置需求

| 工具 | 版本 | 下載 |
|------|------|------|
| Node.js | ≥ 18 | https://nodejs.org |
| Android Studio | 最新版 | https://developer.android.com/studio |
| JDK | 17 | 隨 Android Studio 內建 |

> Android Studio 安裝完後，記得在 **SDK Manager** 勾選 Android 14 (API 34) SDK。

---

## 快速打包步驟

```bash
# 1. 進入遊戲資料夾
cd snake-game

# 2. 安裝 Capacitor 相關套件
npm install

# 3. 初始化 Capacitor（只需執行一次）
npx cap init "貪吃蛇 Snake" com.snakegame.app --web-dir .

# 4. 加入 Android 平台（只需執行一次）
npx cap add android

# 5. 同步網頁檔案到 Android 專案
npx cap sync android

# 6. 用 Android Studio 開啟
npx cap open android
```

在 Android Studio 開啟後：

```
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

APK 路徑：`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 指令快速參考

```bash
# 每次修改 HTML/CSS/JS 後，執行此指令同步
npx cap sync android

# 直接命令列建置 Debug APK（需已設定 Android SDK 環境變數）
cd android
./gradlew assembleDebug        # macOS / Linux
gradlew.bat assembleDebug      # Windows
```

---

## 環境變數設定（Windows）

1. 找到 Android SDK 路徑（通常在 `C:\Users\你的名字\AppData\Local\Android\Sdk`）
2. 在「系統環境變數」新增：
   - `ANDROID_HOME` = `C:\Users\你的名字\AppData\Local\Android\Sdk`
3. 在 `Path` 加入：
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\tools`

---

## Release APK（上架用）

```bash
# 建置 Release APK（需要 keystore 簽名）
cd android
gradlew assembleRelease
```

建立 keystore：
```bash
keytool -genkey -v -keystore snake-game.keystore \
  -alias snakegame -keyalg RSA -keysize 2048 -validity 10000
```

在 `android/app/build.gradle` 加入 signingConfigs 後再 build。

---

## 遊戲特性（手機優化清單）

- ✅ Canvas 自動適應任何螢幕尺寸
- ✅ 支援 notch / 瀏海 / 底部導覽列 Safe Area
- ✅ 螢幕旋轉自動重新計算格子大小
- ✅ 禁止雙指縮放 / 長按選取 / 頁面捲動
- ✅ 觸控方向鍵（64×64 px，符合 Material 最小觸控建議）
- ✅ 全畫面滑動手勢控制方向
- ✅ HUD 右上角暫停按鈕（手機專用）
- ✅ 切換到背景時自動暫停
- ✅ Android 實體 Back 鍵觸發暫停
- ✅ Status bar 暗色主題，顏色與遊戲背景一致
