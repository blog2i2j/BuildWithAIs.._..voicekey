import { Notification } from 'electron'

/**
 * 显示系统通知
 *
 * @param title - 通知标题
 * @param body - 通知内容
 */
export function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show()
  } else {
    console.warn('[Notification] System notifications not supported')
  }
}

/**
 * 显示带图标的通知（可选扩展）
 */
export function showNotificationWithIcon(title: string, body: string, icon?: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body, icon }).show()
  }
}
