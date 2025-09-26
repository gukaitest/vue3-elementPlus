# vue3-elementPlus
基于vue3-elementPlus的项目展示
pnpm i
pnpm dev

注意事项:
1. 修改.env.test文件中的VITE_SERVICE_BASE_URL为你的本地后端接口地址，修改.env.prod文件中的VITE_SERVICE_BASE_URL为你的线上后端接口地址
2.新增菜单放到views文件夹下，会自动添加路由，同时新增菜单需要在src\locales\langs\en-us.ts和src\locales\langs\zh-cn.ts中添加对应的菜单名称，然后在src\router\elegant\routes.ts中添加对应的路由的order和icon属性，order属性为菜单排序，icon属性为菜单图标，icon来源于https://iconify.design/，在该网站中搜索你想要的图标，然后复制图标名称，例如：mdi:account-circle即可使用，
3.组件导出defineOptions({ name: 'VxeTableDemo' });



import ChartContainer from '../common/chart-container.vue';
import BaseChart from './base-chart.vue';
