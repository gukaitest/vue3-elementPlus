/** 为 imagemin 系列包提供类型声明，文件名避免与 npm 包 "imagemin" 冲突 */
import type { Buffer } from 'node:buffer';

declare module 'imagemin' {
  interface ImageminPlugin {
    (input: Buffer): Buffer | Promise<Buffer>;
  }
  interface ImageminStatic {
    buffer: (input: Buffer | Uint8Array, options?: { plugins?: unknown[] }) => Promise<Uint8Array>;
  }
  const imagemin: ImageminStatic;
  export default imagemin;
}

declare module 'imagemin-mozjpeg' {
  const plugin: (options?: { quality?: number }) => unknown;
  export default plugin;
}

declare module 'imagemin-webp' {
  const plugin: (options?: { quality?: number }) => unknown;
  export default plugin;
}

export {};
