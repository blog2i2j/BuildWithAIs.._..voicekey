// @ts-check
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import react from '@astrojs/react'

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages 部署配置
  site: 'https://BuildWithAIs.github.io',
  base: '/voicekey',

  // 输出模式：静态生成
  output: 'static',

  // Vite 配置
  vite: {
    plugins: [tailwindcss()],
  },

  // 集成
  integrations: [react(), sitemap({
     // 排除不需要收录的页面（如 404）
    filter: (page) => page !== 'https://BuildWithAIs.github.io/voicekey/404',
    // 开启多语言支持
    i18n: {
      defaultLocale: 'en',
      locales: {
        en: 'en',
        zh: 'zh',
      },
    },
  })],

  // i18n 配置
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
})