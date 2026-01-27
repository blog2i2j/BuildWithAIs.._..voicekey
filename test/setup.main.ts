const hasWindow = typeof window !== 'undefined'

if (!hasWindow) {
  process.env.NODE_ENV = 'test'
  process.env.APP_ROOT ||= process.cwd()
  process.env.VITE_PUBLIC ||= process.cwd()
}
