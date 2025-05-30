import { mergeConfigs } from '@unocss/core'
import { createLocalFontProcessor } from '@unocss/preset-web-fonts/local'
import {
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind4,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'
import config from './.nuxt/uno.config.mjs'

export default mergeConfigs([config, {
  shortcuts: [
    ['btn', 'px-4 py-1 rounded inline-block bg-teal-600 text-white cursor-pointer hover:bg-teal-700 disabled:cursor-default disabled:bg-gray-600 disabled:opacity-50'],
    ['icon-btn', 'inline-block cursor-pointer select-none opacity-75 transition duration-200 ease-in-out hover:opacity-100 hover:text-teal-600'],
    ['input-field', 'block rounded-md border border-gray-600 px-3 py-2 shadow-sm sm:text-sm bg-gray-800 text-white focus:border-indigo-400 focus:ring-offset-gray-900'],
    ['btn-action', 'rounded-md border border-transparent px-4 py-2 text-base font-medium text-white shadow-sm focus:ring-2 focus:ring-offset-2 focus:outline-0 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:opacity-70'],
    {
      'btn-icon': 'p-2 flex-shrink-0', // 图标按钮的特定样式 (不含背景色，背景色在具体按钮上应用)
      'btn-primary': 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      'btn-success': 'bg-green-500 hover:bg-green-600 focus:ring-green-500',
      'btn-danger': 'bg-red-500 hover:bg-red-600 focus:ring-red-500',
      'btn-warning': 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500',
      'btn-info': 'bg-sky-500 hover:bg-sky-600 focus:ring-sky-500',
      'btn-purple': 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500',
      'btn-cyan': 'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500',
      'btn-teal': 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500',
      'btn-orange': 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-500',
      'btn-gray': 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500',
    },
  ],
  presets: [
    presetWind4(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
    }),
    presetTypography(),
    presetWebFonts({
      themeKey: 'font',
      fonts: {
        sans: 'DM Sans',
        serif: 'DM Serif Display',
        mono: 'DM Mono',
        saira: [
          {
            name: 'Saira',
            weights: ['200', '400', '500', '600', '700'],
          },
        ],
      },
      processors: createLocalFontProcessor(),
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
}])
