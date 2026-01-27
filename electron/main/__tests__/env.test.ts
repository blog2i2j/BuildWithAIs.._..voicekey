import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type EnvSnapshot = {
  VITE_DEV_SERVER_URL?: string
  VITE_PUBLIC?: string
  APP_ROOT?: string
}

const loadEnvModule = async () => {
  const module = await import('../env')
  return module
}

describe('env', () => {
  let snapshot: EnvSnapshot

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    snapshot = {
      VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL,
      VITE_PUBLIC: process.env.VITE_PUBLIC,
      APP_ROOT: process.env.APP_ROOT,
    }
  })

  const restoreEnv = () => {
    process.env.VITE_DEV_SERVER_URL = snapshot.VITE_DEV_SERVER_URL
    process.env.VITE_PUBLIC = snapshot.VITE_PUBLIC
    process.env.APP_ROOT = snapshot.APP_ROOT
  }

  it('throws when getters are called before init', async () => {
    delete process.env.VITE_DEV_SERVER_URL
    const env = await loadEnvModule()
    expect(() => env.getAppRoot()).toThrow('Environment not initialized')
    expect(() => env.getMainDist()).toThrow('Environment not initialized')
    expect(() => env.getRendererDist()).toThrow('Environment not initialized')
    expect(() => env.getVitePublic()).toThrow('Environment not initialized')
    restoreEnv()
  })

  it('initializes paths for dev server and sets VITE_PUBLIC to public', async () => {
    process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173'
    const env = await loadEnvModule()
    env.initEnv()

    const appRoot = env.getAppRoot()
    expect(process.env.APP_ROOT).toBe(appRoot)
    expect(env.getMainDist()).toBe(path.join(appRoot, 'dist-electron'))
    expect(env.getRendererDist()).toBe(path.join(appRoot, 'dist'))
    expect(env.getVitePublic()).toBe(path.join(appRoot, 'public'))
    expect(process.env.VITE_PUBLIC).toBe(path.join(appRoot, 'public'))
    restoreEnv()
  })

  it('initializes paths for production and sets VITE_PUBLIC to dist', async () => {
    delete process.env.VITE_DEV_SERVER_URL
    const env = await loadEnvModule()
    env.initEnv()

    const appRoot = env.getAppRoot()
    expect(env.getVitePublic()).toBe(path.join(appRoot, 'dist'))
    expect(process.env.VITE_PUBLIC).toBe(path.join(appRoot, 'dist'))
    restoreEnv()
  })

  it('is idempotent on repeated init', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    delete process.env.VITE_DEV_SERVER_URL
    const env = await loadEnvModule()

    env.initEnv()
    env.initEnv()

    expect(consoleSpy).toHaveBeenCalledWith('[Env] Already initialized, skipping')
    consoleSpy.mockRestore()
    restoreEnv()
  })
})
