import { defineConfig } from '@soybeanjs/eslint-config';

export default defineConfig(
  { vue: true, unocss: true, typescript: true },
  {
    rules: {
      'vue/multi-word-component-names': [
        'warn',
        {
          ignores: ['index', 'App', 'Register', '[id]', '[url]']
        }
      ],
      'vue/component-name-in-template-casing': [
        'warn',
        'PascalCase',
        {
          registeredComponentsOnly: false,
          ignores: ['/^icon-/']
        }
      ],
      'unocss/order-attributify': 'off',
      'no-console': 'off',
      'no-plusplus': 'off',
      'no-unused-vars': 'off',
      'vue/no-inline-styles': 'off',
      // 允许嵌套三元表达式
      'no-nested-ternary': 'off',
      // 循环复杂度最大值设为 24
      complexity: ['error', { max: 24 }]
    }
  }
);
