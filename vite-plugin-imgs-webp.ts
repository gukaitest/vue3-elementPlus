/**
 * 构建时对 .../assets/imgs/*.webp 的请求，从同名的 .jpg/.png 转为 WebP 并作为资源输出。 与 vite-plugin-imagemin 的 makeWebp 配合：组件请求 .webp
 * 时由此插件提供，dist 中其他 jpg 由 imagemin 优化并生成 webp。
 */
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import type { Plugin } from 'vite';

const IMGS_VIRTUAL_PREFIX = '\0imgs-webp:';
const IMGS_RE = /[/\\]assets[/\\]imgs[/\\][^/\\]+\.webp(\?.*)?$/;

function isImgsWebpRequest(id: string): boolean {
  return IMGS_RE.test(id.replace(/^\0imgs-webp:/, ''));
}

function getSourcePath(webpId: string): string | null {
  const base = webpId.replace(/\?.*$/, '').replace(/\.webp$/i, '');
  const baseName = path.basename(base);

  if (path.isAbsolute(base)) {
    const dir = path.dirname(base);
    for (const ext of ['.jpg', '.jpeg', '.png']) {
      const p = path.join(dir, baseName + ext);
      if (fs.existsSync(p)) return p;
    }
    return null;
  }

  // 相对路径（如 ../../assets/imgs/001.webp）从项目 src 下解析
  const fromSrc = path.join(process.cwd(), 'src', 'assets', 'imgs', baseName);
  for (const ext of ['.jpg', '.jpeg', '.png']) {
    const p = fromSrc + ext;
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function vitePluginImgsWebp(options?: { quality?: number }): Plugin {
  const quality = options?.quality ?? 82;

  return {
    name: 'vite-plugin-imgs-webp',
    // 必须优先于 Vite 默认 load，否则虚拟 id 会被 load-fallback 当文件路径读，触发 null bytes 报错
    enforce: 'pre',
    resolveId(id) {
      if (isImgsWebpRequest(id)) {
        return `${IMGS_VIRTUAL_PREFIX}${id}`;
      }
      return null;
    },
    async load(id) {
      if (!id.startsWith(IMGS_VIRTUAL_PREFIX)) return null;

      const rawId = id.slice(IMGS_VIRTUAL_PREFIX.length).replace(/\?.*$/, '');
      const sourcePath = getSourcePath(rawId);

      if (!sourcePath) {
        const msg = `[vite-plugin-imgs-webp] 未找到源图，请确保存在 src/assets/imgs/001.jpg 等: ${rawId}`;
        this.warn(msg);
        // 返回占位避免落入 load-fallback（否则会用虚拟 id 当路径读，报 null bytes）
        return 'export default "";';
      }

      try {
        const buffer = fs.readFileSync(sourcePath);
        // @ts-ignore imagemin 无 @types，运行时正常
        const imagemin = (await import('imagemin')).default;
        // @ts-ignore imagemin-webp 无 @types，运行时正常
        const imageminWebp = (await import('imagemin-webp')).default;
        const webpBuffer = await imagemin.buffer(buffer, {
          plugins: [imageminWebp({ quality })]
        });

        const baseName = path.basename(rawId, '.webp');
        const webpBuf = Buffer.from(webpBuffer);

        // 构建时：emit 资源并导出 ROLLUP_FILE_URL
        if (typeof this.emitFile === 'function') {
          const refId = this.emitFile({
            type: 'asset',
            name: `${baseName}.webp`,
            source: webpBuf
          });
          return `export default import.meta.ROLLUP_FILE_URL_${refId};`;
        }

        // 开发时：无 emitFile，直接导出 data URL 供 img 使用
        return `export default "data:image/webp;base64,${webpBuf.toString('base64')}";`;
      } catch (e) {
        this.error(e as Error);
        return null;
      }
    }
  };
}
