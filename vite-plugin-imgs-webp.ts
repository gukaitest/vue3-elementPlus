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
const IMGS_RE = /[/\\]assets[/\\]imgs[/\\][^/\\]+\.webp$/;

function isImgsWebpRequest(id: string): boolean {
  return IMGS_RE.test(id.replace(/^\0imgs-webp:/, ''));
}

function getSourcePath(webpId: string): string | null {
  const abs = path.isAbsolute(webpId) ? webpId : path.resolve(process.cwd(), webpId);
  const base = abs.replace(/\.webp$/i, '');
  for (const ext of ['.jpg', '.jpeg', '.png']) {
    const p = `${base}${ext}`;
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function vitePluginImgsWebp(options?: { quality?: number }): Plugin {
  const quality = options?.quality ?? 82;

  return {
    name: 'vite-plugin-imgs-webp',
    apply: 'build',
    resolveId(id) {
      if (isImgsWebpRequest(id)) {
        return `${IMGS_VIRTUAL_PREFIX}${id}`;
      }
      return null;
    },
    async load(id) {
      if (!id.startsWith(IMGS_VIRTUAL_PREFIX)) return null;

      const rawId = id.slice(IMGS_VIRTUAL_PREFIX.length);
      const sourcePath = getSourcePath(rawId);

      if (!sourcePath) {
        this.warn(`[imgs-webp] 未找到源图: ${rawId.replace(/\.webp$/i, '')}`);
        return null;
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
        const refId = this.emitFile({
          type: 'asset',
          name: `imgs/${baseName}.webp`,
          source: Buffer.from(webpBuffer)
        });

        return `export default import.meta.ROLLUP_FILE_URL_${refId};`;
      } catch (e) {
        this.error(e as Error);
        return null;
      }
    }
  };
}
