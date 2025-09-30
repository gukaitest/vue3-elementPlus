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
      '@typescript-eslint/no-unused-vars': 'off',

      'vue/no-inline-styles': 'off',
      'vue/no-static-inline-styles': 'off',

      // 允许嵌套三元表达式
      'no-nested-ternary': 'off',

      // 循环复杂度最大值设为 24
      complexity: ['error', { max: 24 }],

      // 允许使用 @ts-ignore
      '@typescript-eslint/ban-ts-comment': 'off',

      // 允许类方法不使用 this（静态方法）
      'class-methods-use-this': 'off',

      // 增加最大参数数量限制
      'max-params': ['error', { max: 5 }],

      // 允许下划线开头的变量名（用于私有属性）
      'no-underscore-dangle': [
        'error',
        {
          allow: ['_requestStartTime', '_componentTag', '_response']
        }
      ],

      // 允许空接口
      '@typescript-eslint/no-empty-object-type': 'off',

      // 允许使用前定义（用于函数提升）
      '@typescript-eslint/no-use-before-define': 'off',

      // 允许未使用的属性
      'vue/no-unused-properties': 'off',
      'vue/no-unused-refs': 'off',

      // 允许运行时声明
      'vue/define-emits-declaration': 'off',
      'vue/define-props-declaration': 'off',

      // 允许自定义事件名称
      'vue/custom-event-name-casing': 'off',

      // 允许必填属性有默认值
      'vue/no-required-prop-with-default': 'off',

      // 允许 defineEmits 变量名不是 emit
      'vue/require-macro-variable-name': 'off'
    }
  }
);
