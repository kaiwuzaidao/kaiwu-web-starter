import messages from '../business/messages';
/**
 * 简体中文 语言包。
 *
 * 语言跟随平台账户偏好，由 ProjectAccessProvider 设置，本前端不提供语言切换器。
 * 当前项目只声明 zh-CN；增加语言时先更新 manifest 的 supportedLocales，
 * 再为已启用语言补齐同一组 key。
 */
export default {
  ...messages,
  'menu.home': '项目首页',
  'menu.todos': '待办',
  'menu.project-members': '项目成员',
  'menu.project-roles': '角色授权',
  'home.welcome': '欢迎使用项目工作台',
  'home.description': '选择业务入口，开始今天的工作。',
  'home.moduleHint': '进入模块查看和办理业务。',
  'home.enter': '进入{name}',
  'home.empty': '项目暂未开放业务功能，请联系项目管理员。',
  'home.noAccess': '暂无可用业务入口，请联系项目管理员开通权限。',
  'home.missingProject': '请从平台工作台重新进入当前项目。',
  'home.failed': '项目权限加载失败，请重试。',
  'home.retry': '重试',
  'todos.description': '这里显示当前项目需要你处理的事项，办理后由业务服务自动更新。',
  'todos.title': '待办事项',
  'todos.time': '收到时间',
  'todos.handle': '去办理',
  'todos.refresh': '刷新',
  'todos.empty': '暂无待办事项',
  'todos.failed': '待办加载失败，请重试。',
  'todos.unavailable': '待办暂不可用',
  'todos.noLink': '请联系项目管理员确认办理入口',
  'common.action.retry': '重试',
  // 通用
  'common.action.create': '新增',
  'common.action.edit': '编辑',
  'common.action.delete': '删除',
  'common.action.confirm': '确定',
  'common.action.cancel': '取消',
  'common.action.search': '查询',
  'common.action.reset': '重置',
  'common.action.export': '导出',
  'common.deleteConfirm': '确认删除该记录？',
  'common.saveSuccess': '保存成功',
  'common.deleteSuccess': '删除成功',
  'common.operation': '操作',
  'common.createdAt': '创建时间',
  'common.updatedAt': '更新时间',
  'common.empty': '暂无数据',
  // 请求层与后端错误：messageKey 命中不了时用这两条兜底
  'common.error.unavailable': '服务暂时不可用，请稍后重试',
  'common.error.request': '请求失败（HTTP {status}）',
  'error.validation.failed': '{detail}',
  'error.internal': '服务内部错误',
};
