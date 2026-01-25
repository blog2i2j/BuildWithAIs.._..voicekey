import i18next, { type TOptions } from 'i18next'
import { app, BrowserWindow } from 'electron'
import {
  DEFAULT_LANGUAGE,
  resolveLanguage,
  resources,
  type LanguageSetting,
  getLocale,
} from '../shared/i18n'
import { IPC_CHANNELS, type LanguageSnapshot } from '../shared/types'

let currentSetting: LanguageSetting = 'system'

export const initMainI18n = async (setting?: LanguageSetting): Promise<void> => {
  currentSetting = setting ?? 'system'
  const resolvedLanguage = resolveLanguage(currentSetting, app.getLocale())

  await i18next.init({
    resources,
    lng: resolvedLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
  })
}

export const setMainLanguage = async (setting: LanguageSetting): Promise<void> => {
  currentSetting = setting
  const resolvedLanguage = resolveLanguage(currentSetting, app.getLocale())
  await i18next.changeLanguage(resolvedLanguage)
}

export const t = (key: string, options?: TOptions): string => i18next.t(key, options)

export const getMainLanguageSnapshot = (): LanguageSnapshot => {
  const resolved = resolveLanguage(currentSetting, app.getLocale())
  return {
    setting: currentSetting,
    resolved,
    locale: getLocale(resolved),
  }
}

export const sendLanguageSnapshotToWindow = (window: BrowserWindow): void => {
  if (window.isDestroyed()) {
    return
  }
  window.webContents.send(IPC_CHANNELS.APP_LANGUAGE_CHANGED, getMainLanguageSnapshot())
}

export const broadcastLanguageSnapshot = (): void => {
  const snapshot = getMainLanguageSnapshot()
  BrowserWindow.getAllWindows().forEach((window) => {
    if (window.isDestroyed()) {
      return
    }
    window.webContents.send(IPC_CHANNELS.APP_LANGUAGE_CHANGED, snapshot)
  })
}
