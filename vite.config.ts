import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
import viteImagemin from '@vheemstra/vite-plugin-imagemin';
// @ts-expect-error 无官方类型，见 imagemin-plugins.d.ts
import imageminMozjpeg from 'imagemin-mozjpeg';
// @ts-expect-error 无官方类型，见 imagemin-plugins.d.ts
import imageminWebp from 'imagemin-webp';
import { setupVitePlugins } from './build/plugins';
import { createViteProxy, getBuildTime } from './build/config';
import { vitePluginImgsWebp } from './vite-plugin-imgs-webp';

export default defineConfig(configEnv => {
  const viteEnv = loadEnv(configEnv.mode, process.cwd()) as unknown as Env.ImportMeta;

  const buildTime = getBuildTime();

  const enableProxy = configEnv.command === 'serve' && !configEnv.isPreview;

  return {
    base: viteEnv.VITE_BASE_URL,
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          additionalData: `@use "@/styles/scss/global.scss" as *;`
        }
      }
    },
    plugins: [
      ...setupVitePlugins(viteEnv, buildTime),
      // 构建时 assets/imgs 下请求 .webp 时由此插件从 .jpg 生成并输出
      vitePluginImgsWebp({ quality: 82 }),
      // 图片优化：压缩 jpg，并为 dist 中的 jpg 生成 webp 版本
      viteImagemin({
        plugins: {
          jpg: imageminMozjpeg({ quality: 85 })
        },
        makeWebp: {
          plugins: {
            jpg: imageminWebp({ quality: 82 })
          },
          skipIfLargerThan: 'smallest'
        },
        verbose: true
      }),
      // Gzip 压缩插件 - 构建时生成 .gz 文件
      viteCompression({
        verbose: true, // 是否在控制台输出压缩结果
        disable: false, // 是否禁用压缩
        deleteOriginFile: false, // 压缩后是否删除原文件
        threshold: 10240, // 压缩阈值，单位：字节，超过此大小的文件才会被压缩（10KB）
        algorithm: 'gzip', // 压缩算法：gzip | brotliCompress | deflate | deflateRaw
        ext: '.gz', // 压缩文件扩展名
        // 只压缩特定类型的文件
        filter: /\.(js|mjs|json|css|html)$/i
      }),
      // Brotli 压缩插件（可选，压缩率更高但兼容性稍差）
      viteCompression({
        verbose: true,
        disable: false,
        deleteOriginFile: false,
        threshold: 10240,
        algorithm: 'brotliCompress',
        ext: '.br',
        filter: /\.(js|mjs|json|css|html)$/i
      }),
      // 包分析工具：仅在分析模式下启用（通过环境变量控制）
      // 使用方式: pnpm run build:analyze 或设置 ANALYZE=true
      visualizer({
        filename: 'dist/stats.html', // 分析报告输出路径
        open: process.env.ANALYZE === 'true', // 是否自动打开报告
        gzipSize: true, // 显示 gzip 压缩后的大小
        brotliSize: true, // 显示 brotli 压缩后的大小
        template: 'treemap' // 可视化模板: treemap | sunburst | network
      })
    ],
    define: {
      BUILD_TIME: JSON.stringify(buildTime)
    },
    server: {
      host: '0.0.0.0',
      port: 9527,
      open: true,
      proxy: createViteProxy(viteEnv, enableProxy)
    },
    preview: {
      port: 9725
    },
    build: {
      reportCompressedSize: false,
      sourcemap: viteEnv.VITE_SOURCE_MAP === 'Y',
      commonjsOptions: {
        ignoreTryCatch: false
      },
      // 代码分割优化配置
      rollupOptions: {
        output: {
          // 文件命名规则
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
          // 手动代码分割 - 将大型库分离
          manualChunks(id) {
            // node_modules 中的包
            if (id.includes('node_modules')) {
              // Vue 核心库
              if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
                return 'vue-vendor';
              }
              // Element Plus UI 组件库
              if (id.includes('element-plus')) {
                return 'element-plus';
              }
              // 图表库 - ECharts
              if (id.includes('echarts')) {
                return 'echarts';
              }
              // 图表库 - VChart
              if (id.includes('@visactor/vchart')) {
                return 'vchart';
              }
              // AntV 系列库
              if (id.includes('@antv')) {
                return 'antv';
              }
              // 表格组件
              if (id.includes('@visactor/vtable') || id.includes('vxe-table')) {
                return 'tables';
              }
              // 编辑器
              if (id.includes('vditor') || id.includes('wangeditor')) {
                return 'editors';
              }
              // 其他大型库
              if (id.includes('dhtmlx-gantt')) {
                return 'gantt';
              }
              if (id.includes('vue-pdf-embed')) {
                return 'pdf';
              }
              if (id.includes('xgplayer')) {
                return 'player';
              }
              // 其他第三方库
              return 'vendor';
            }
            // 按路由分割（可选）
            // if (id.includes('/src/views/')) {
            //   const match = id.match(/\/src\/views\/(.+?)\//);
            //   if (match) {
            //     const viewName = match[1];
            //     // 大型页面单独打包
            //     if (['dashboard', 'data-visualization'].includes(viewName)) {
            //       return `page-${viewName}`;
            //     }
            //   }
            // }
            // 默认不分割（返回 undefined 让 Rollup 自动处理）
            return undefined;
          }
        }
      },
      // Chunk 大小警告阈值（KB）
      chunkSizeWarningLimit: 1000
    }
  };
});
