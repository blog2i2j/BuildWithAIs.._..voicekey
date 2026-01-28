/**
 * 活跃窗口检测模块
 *
 * 负责检测用户当前正在使用的应用程序信息
 * 用于上下文感知的 AI 润色功能
 *
 * @module electron/main/active-window-detector
 */

import { activeWindow } from 'get-windows'

/**
 * 窗口信息结构
 */
export interface WindowInfo {
  /** 应用名称（如 "Visual Studio Code"） */
  readonly appName: string
  /** 进程名称（如 "Code.exe"） */
  readonly processName: string
  /** 操作系统平台 */
  readonly platform: 'win32' | 'darwin'
}

/**
 * 检测失败的原因
 */
export type DetectionFailureReason =
  | 'permission_denied'
  | 'no_active_window'
  | 'platform_unsupported'
  | 'unknown_error'

/**
 * 检测结果
 */
export type WindowDetectionResult =
  | { readonly success: true; readonly info: WindowInfo }
  | { readonly success: false; readonly reason: DetectionFailureReason }

/**
 * 活跃窗口检测器类
 */
export class ActiveWindowDetector {
  private readonly platform: 'win32' | 'darwin'

  constructor() {
    this.platform = process.platform as 'win32' | 'darwin'
  }

  /**
   * 检测当前活跃窗口
   *
   * @returns 检测结果，包含窗口信息或失败原因
   */
  async detect(): Promise<WindowDetectionResult> {
    try {
      const window = await activeWindow()

      if (!window) {
        return { success: false, reason: 'no_active_window' }
      }

      // 提取并规范化窗口信息
      const info: WindowInfo = {
        appName: this.normalizeAppName(window.owner?.name),
        processName: this.normalizeProcessName(window.owner?.name, window.platform),
        platform: this.platform,
      }

      return { success: true, info }
    } catch (error) {
      return this.handleDetectionError(error)
    }
  }

  /**
   * 检查是否支持当前平台
   */
  isPlatformSupported(): boolean {
    return this.platform === 'win32' || this.platform === 'darwin'
  }

  /**
   * 检查权限状态（主要用于 macOS）
   *
   * @returns 是否有权限检测活跃窗口
   */
  async checkPermission(): Promise<boolean> {
    if (this.platform === 'win32') {
      return true
    }

    try {
      const window = await activeWindow()
      return window !== null
    } catch {
      return false
    }
  }

  /**
   * 规范化应用名称
   */
  private normalizeAppName(rawName: string | undefined): string {
    if (!rawName || typeof rawName !== 'string') {
      return 'Unknown Application'
    }

    // 去除常见后缀，统一格式
    return rawName
      .replace(/\.exe$/i, '')
      .replace(/\.app$/i, '')
      .trim()
  }

  /**
   * 规范化进程名称
   */
  private normalizeProcessName(rawName: string | undefined, platform: string | undefined): string {
    if (!rawName || typeof rawName !== 'string') {
      return 'unknown'
    }

    const name = rawName.trim()

    // Windows 添加 .exe 后缀（如果不存在）
    if (platform === 'win32' && !name.toLowerCase().endsWith('.exe')) {
      return `${name}.exe`
    }

    return name
  }

  /**
   * 处理检测错误
   */
  private handleDetectionError(error: unknown): WindowDetectionResult {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // macOS 权限错误识别
    if (this.platform === 'darwin') {
      if (
        errorMessage.includes('permission') ||
        errorMessage.includes('accessibility') ||
        errorMessage.includes('access') ||
        errorMessage.includes('authorized')
      ) {
        return { success: false, reason: 'permission_denied' }
      }
    }

    console.error('[ActiveWindowDetector] Detection failed:', errorMessage)
    return { success: false, reason: 'unknown_error' }
  }
}

/**
 * 获取检测失败的用户友好提示
 *
 * @param reason 失败原因
 * @returns 本地化提示信息
 */
export function getDetectionFailureMessage(reason: DetectionFailureReason): string {
  const messages: Record<DetectionFailureReason, string> = {
    permission_denied:
      '无法获取当前应用信息。macOS 用户需要在"系统设置 > 隐私与安全性 > 辅助功能"中授予权限。',
    no_active_window: '未检测到活跃窗口。',
    platform_unsupported: '当前操作系统不支持窗口检测功能。',
    unknown_error: '检测窗口信息时发生未知错误。',
  }

  return messages[reason]
}

/**
 * 全局检测器实例
 */
export const activeWindowDetector = new ActiveWindowDetector()
