import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron, type ElectronApplication, type Page } from 'playwright'
import electronPath from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appMainPath = path.join(__dirname, '../../dist-electron/main.mjs')

export class ElectronTestApp {
  private app: ElectronApplication | null = null
  private page: Page | null = null

  async launch() {
    this.app = await electron.launch({
      executablePath: electronPath as unknown as string,
      args: [appMainPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })

    this.page = await this.app.firstWindow()
    return this.page
  }

  async close() {
    await this.app?.close()
  }

  getPage() {
    if (!this.page) {
      throw new Error('App not launched')
    }
    return this.page
  }

  async screenshot(name: string) {
    await this.page?.screenshot({ path: `test-results/${name}.png` })
  }
}
