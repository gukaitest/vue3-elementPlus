# JPG 转 WebP 图片方案说明

本文档说明本项目中「将 `src/assets/imgs` 下 JPG 图片在构建/开发时转为 WebP 并供页面使用」的完整方案，包括插件原理、配置方式与使用规范。

---

## 一、概述与目的

- **目的**：在不改动源图（仅保留 JPG）的前提下，在开发与生产环境中以 WebP 格式提供给页面使用，减小体积、加快加载。
- **范围**：仅对 **`src/assets/imgs/`** 目录下被引用的图片生效（如 `001.jpg`～`009.jpg`）。
- **效果**：开发时请求 `.webp` 由插件实时从同名的 `.jpg` 转换并返回；构建时产出带 hash 的 `.webp` 文件到 `dist/assets/webp/`，页面使用带 hash 的 URL，避免缓存问题。

---

## 二、整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│  页面组件 (image-load-old.vue / image-load-new.vue)              │
│  - 生产：import img001 from '../../assets/imgs/001.webp?url'     │
│  - 开发：同上，或通过 glob 使用 .jpg                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  vitePluginImgsWebp (vite-plugin-imgs-webp.ts)                  │
│  - resolveId: 识别 *assets/imgs/*.webp → 虚拟模块 id             │
│  - load: 读同名 .jpg → imagemin-webp 转 WebP                     │
│  - 开发：返回 data URL (base64)                                  │
│  - 构建：emitFile 产出 .webp，返回 ROLLUP_FILE_URL_xxx           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  源图：src/assets/imgs/001.jpg ～ 009.jpg（仅保留 JPG 即可）     │
└─────────────────────────────────────────────────────────────────┘
```

同时，构建阶段还会使用 **vite-plugin-imagemin** 对 dist 中其它图片做压缩，并为 JPG 生成 WebP 副本（与上述「按需从 JPG 生成 WebP」互补）。

---

## 三、相关文件与目录

| 路径 | 说明 |
|------|------|
| `vite-plugin-imgs-webp.ts` | 自定义插件：拦截 `*assets/imgs/*.webp`，从同名 JPG 转 WebP 并返回 URL 或 data URL |
| `vite.config.ts` | 注册 `vitePluginImgsWebp`、`vite-plugin-imagemin`，以及 `assetFileNames` 等构建配置 |
| `imagemin-plugins.d.ts` | 为 imagemin / imagemin-mozjpeg / imagemin-webp 提供 TypeScript 声明 |
| `src/assets/imgs/` | 源图目录，放置 `001.jpg`～`009.jpg`（或其它同名 JPG/PNG） |
| `src/components/custom/image-load-old.vue` | 使用上述 WebP 的示例组件（滚动加载） |
| `src/components/custom/image-load-new.vue` | 使用上述 WebP 的示例组件（IntersectionObserver） |
| 构建产物 | `dist/assets/webp/001-[hash].webp` 等，由 `assetFileNames` 决定 |

---

## 四、插件 vitePluginImgsWebp 详解

### 4.1 作用

- 只处理路径匹配 **`.../assets/imgs/xxx.webp`**（可带 `?url` 等 query）的请求。
- 在**开发**和**构建**中都会运行，避免开发时 `import '001.webp?url'` 因文件不存在而报错。

### 4.2 工作流程

1. **resolveId(id)**  
   - 若 `id` 匹配 `*assets/imgs/*.webp`，返回虚拟模块 id：`\0imgs-webp:${id}`。  
   - 这样后续不会去磁盘找 `001.webp`，而是交给本插件的 `load` 处理。

2. **load(id)**  
   - 仅处理以 `\0imgs-webp:` 开头的 id。  
   - 去掉 query 后得到「逻辑路径」（如 `../../assets/imgs/001.webp` 或绝对路径）。  
   - **getSourcePath**：根据该路径找到同名的源图（优先 `001.jpg`，其次 `001.png` 等）：
     - 绝对路径：在同目录下找 `001.jpg` / `001.png`。
     - 相对路径：在 `process.cwd()/src/assets/imgs/` 下找 `001.jpg` 等。  
   - 若找不到源图：`this.warn` 并返回 `export default "";`，避免落入 Vite 的 load-fallback（否则会把虚拟 id 当文件路径读，报 null bytes）。  
   - 若找到：用 **imagemin + imagemin-webp** 将 buffer 转为 WebP：
     - **构建**：`this.emitFile({ type: 'asset', name: '001.webp', source })`，并返回 `export default import.meta.ROLLUP_FILE_URL_${refId};`，最终得到带 hash 的 URL。  
     - **开发**：无 `emitFile`，返回 `export default "data:image/webp;base64,..."`，直接作为 `<img src>` 使用。

### 4.3 配置项

- **quality**（默认 82）：WebP 质量，在 `vite.config.ts` 中传入，例如：  
  `vitePluginImgsWebp({ quality: 82 })`。

### 4.4 为何使用 enforce: 'pre'

- 插件设置了 **`enforce: 'pre'`**，以便在 Vite 默认的 load 之前执行。  
- 否则当 `load()` 因故返回 `null` 时，Vite 的 load-fallback 会用虚拟 id（含 `\0`）当文件路径去读，触发 “path must be a string without null bytes” 报错。

---

## 五、Vite 与 Rollup 配置

### 5.1 在 vite.config.ts 中的注册

```ts
import { vitePluginImgsWebp } from './vite-plugin-imgs-webp';

plugins: [
  // ...
  vitePluginImgsWebp({ quality: 82 }),
  viteImagemin({ /* 见下 */ }),
  // ...
]
```

### 5.2 构建产物命名（assetFileNames）

在 `build.rollupOptions.output` 中：

```ts
assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
```

- 插件 `emitFile` 时使用的 `name` 为 `001.webp`（仅文件名），因此 `[name]` 为 `001`，`[ext]` 为 `webp`。  
- 最终产出路径为：**`dist/assets/webp/001-[hash].webp`**。  
- 页面中通过 `import ... from '...001.webp?url'` 得到的，就是该带 hash 的 URL（与命名规则一致）。

### 5.3 vite-plugin-imagemin

- 用于对 **dist 中已有图片**（含其它页面的 JPG/PNG）做压缩，并为 JPG 生成 WebP 副本。  
- 与 `vitePluginImgsWebp` 的关系：  
  - **vitePluginImgsWebp**：只针对「通过 import 请求的 `assets/imgs/*.webp`」，从源码中的 JPG 生成 WebP 并参与打包。  
  - **vite-imagemin**：在构建结束后对 dist 里的文件做压缩和生成 WebP，不负责 `assets/imgs` 的「按需生成」。

---

## 六、组件中的使用方式

### 6.1 推荐写法（生产用 WebP，开发可用 JPG）

- **生产**：用静态 **`import ... from '...webp?url'`**，让 Vite 在构建时走插件，得到带 hash 的 URL。  
- **开发**：同一 import 会由插件从 JPG 转 WebP 并返回 data URL；若希望开发时直接用 JPG，可用 `import.meta.glob('.../*.jpg', { eager: true, as: 'url' })` 按环境二选一。

示例（与当前 image-load-old.vue 一致）：

```ts
// 1. 静态 import（必须写全 001～009，以便构建时静态分析）
import img001 from '../../assets/imgs/001.webp?url';
import img002 from '../../assets/imgs/002.webp?url';
// ... img003 ～ img009

defineOptions({ name: 'ImageLoadOld' });

// 2. 开发环境可用 glob 使用 jpg（可选）
const globJpg = import.meta.glob<string>('../../assets/imgs/*.jpg', { eager: true, as: 'url' });
const allImagesProd = [img001, img002, img003, img004, img005, img006, img007, img008, img009];
const allImagesDev = Object.entries(globJpg)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);
const allImages = import.meta.env.PROD ? allImagesProd : allImagesDev;
```

- 不要使用 **动态路径** 的 `new URL(\`.../${num}.webp\`, import.meta.url).href` 作为生产环境图片源：构建时无法静态分析，容易得到错误或 `undefined` 的 URL。

### 6.2 新增图片时

- 在 `src/assets/imgs/` 下放置同名 JPG（或 PNG），如 `010.jpg`。  
- 在组件中增加：  
  `import img010 from '../../assets/imgs/010.webp?url';`  
  并把 `img010` 加入 `allImagesProd` 数组。

---

## 七、开发与构建行为对比

| 环境 | 请求方式 | 插件行为 | 页面得到的 src |
|------|----------|----------|----------------|
| 开发 (pnpm run dev) | `import img001 from '...001.webp?url'` | 读 `001.jpg` → imagemin-webp 转 WebP → 返回 data URL | `data:image/webp;base64,...` |
| 构建 (pnpm run build) | 同上 | 读 `001.jpg` → 转 WebP → emitFile → 返回 ROLLUP_FILE_URL_xxx | `{base}/assets/webp/001-[hash].webp` |

---

## 八、依赖与类型声明

### 8.1 依赖

- **imagemin**、**imagemin-webp**：在插件中用于将 JPG/PNG buffer 转为 WebP。  
- **@vheemstra/vite-plugin-imagemin**、**imagemin-mozjpeg**、**imagemin-webp**：用于 vite.config 中的 imagemin 压缩与 makeWebp。

### 8.2 类型声明（imagemin-plugins.d.ts）

- 项目根目录下的 `imagemin-plugins.d.ts` 为 `imagemin`、`imagemin-mozjpeg`、`imagemin-webp` 提供声明，避免 TS/ESLint 报错。  
- 若仍出现「找不到模块声明」，请确认该文件被包含在 tsconfig 的编译范围内（如 `include` 或根目录已被包含）。

---

## 九、常见问题与注意事项

1. **构建报错：Could not load imgs-webp:... null bytes**  
   - 原因：插件的 `load()` 曾返回 `null`，虚拟 id 被当作文件路径。  
   - 处理：插件已加 `enforce: 'pre'`，且找不到源图时返回 `export default "";` 占位。若仍报错，检查 `getSourcePath` 是否在 `src/assets/imgs/` 下能正确找到对应 JPG。

2. **页面图片 404 或 src 为 undefined**  
   - 原因：使用了动态路径（如 `${num}.webp`），构建时未替换为真实资源 URL。  
   - 处理：生产环境必须用静态 `import ... from '...001.webp?url'` 形式，并放入数组中引用。

3. **开发时 import 001.webp?url 报 “Does the file exist?”**  
   - 原因：插件未在开发环境运行（例如误设 `apply: 'build'`）。  
   - 处理：当前插件已在开发与构建中均运行，且开发时返回 data URL，无需磁盘上存在 `001.webp`。

4. **新增图片（如 010.jpg）**  
   - 在 `src/assets/imgs/` 添加 `010.jpg`，在组件中增加一行静态 import `010.webp?url`，并加入 `allImagesProd`（或对应列表）。

5. **ESLint import/order**  
   - 所有 import（含 `...webp?url`）应放在文件顶部，同一组内不要用空行或 `defineOptions` 等非 import 语句隔开，避免 “no empty line between import groups” 报错。

---

## 十、简要检查清单

- [ ] `src/assets/imgs/` 下存在 001.jpg～009.jpg（或你实际使用的编号）。  
- [ ] `vite.config.ts` 中已注册 `vitePluginImgsWebp` 且未删除。  
- [ ] 组件中生产环境使用静态 `import xxx from '.../00N.webp?url'`，并放入用于渲染 `<img>` 的数组。  
- [ ] 构建后 `dist/assets/webp/` 下存在 `001-[hash].webp` 等文件，且页面 Network 中图片请求的 URL 带 hash。  
- [ ] 开发环境下页面能正常显示图片（data URL 或 jpg glob 均可）。

以上即本项目中「JPG 转 WebP」的完整说明与使用规范。
