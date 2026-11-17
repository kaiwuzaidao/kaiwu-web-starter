import { defineConfig } from '@umijs/max';
import { businessModules } from '../src/business/modules';
import project from '../docs/kaiwu-project-blueprint.json';
import { kaiwuTheme } from '../src/theme/antd';

export default defineConfig({
  hash: true,
  // 模板克隆到新路径或切换分支后，开发服务器直接编译当前依赖，避免加载旧的 MFSU 绝对路径。
  mfsu: false,
  antd: {
    appConfig: {},
    configProvider: {
      theme: kaiwuTheme,
    },
  },
  locale: {
    default: 'zh-CN',
    // 语言跟随平台账户偏好（ProjectAccessProvider 里设置），
    // 不认浏览器语言、不写 localStorage，避免与平台不同步。
    baseNavigator: false,
    useLocalStorage: false,
    antd: true,
    title: true,
  },
  layout: {
    title: project.projectName,
    locale: true,
    siderWidth: 256,
  },
  base: '/apps/purchase-desk/',
  publicPath: '/apps/purchase-desk/',
  routes: [
    {
      path: '/',
      name: 'home',
      icon: 'DashboardOutlined',
      component: './Home',
    },
    ...businessModules.map(({ path, name, component }) => ({ path, name, component })),
    {
      path: '/todos',
      name: 'todos',
      component: './Todos',
    },
    {
      path: '/project-members',
      name: 'project-members',
      component: './ProjectMembers',
    },
    {
      path: '/project-roles',
      name: 'project-roles',
      component: './ProjectRoles',
    },
  ],
  proxy:
    process.env.MOCK === 'none'
      ? Object.fromEntries(
          ['/api', '/purchase-desk-api', '/purchase-desk-svc'].map((path) => [
            path,
            { target: process.env.KAIWU_GATEWAY || 'http://127.0.0.1:8088', changeOrigin: true },
          ]),
        )
      : {},
  npmClient: 'pnpm',
});
