/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_ANDROID_APK_URL?: string
  readonly VITE_MOBILE_WEB_URL?: string
  readonly VITE_ALLOW_ANDROID_EMULATOR_API?: string
  readonly VITE_MOBILE_START_PATH?: string
  readonly VITE_DISABLE_PWA_SW?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
