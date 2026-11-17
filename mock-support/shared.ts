import type { Request, Response } from './http';
import { readManifest, label } from './manifest.cjs';
export type { Request, Response };
import { fixtures } from './personas';
export function people(roles = readManifest('roles')) {
  return roles.flatMap((role: any) => {
    if (!/^[a-z][a-z0-9-]{1,63}$/.test(role.roleCode)) return [];
    const preset = fixtures.filter((person) => person.role === role.roleCode);
    return preset.length
      ? preset
      : [
          {
            id: 'role-' + role.roleCode,
            key: 'role-' + role.roleCode,
            role: role.roleCode,
            name: label(role.name),
          },
        ];
  });
}
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!,
  );
}
export function actor(req: Request) {
  const key = /(?:^|;\s*)kaiwu_mock_role=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  const roles = readManifest('roles');
  const person = people(roles).find((item) => item.key === key);
  const role = person && roles.find((item: any) => item.roleCode === person.role);
  return role
    ? {
        ...person!,
        permissions: new Set<string>(role.permissions || []),
        routes: new Set<string>(role.routes || []),
        directories: new Set<string>(role.directories || []),
      }
    : undefined;
}
export function ok(res: Response, data: unknown = null) {
  return res.json({ code: 0, data });
}
export function fail(res: Response, code: number, message: string, messageKey?: string) {
  return res.status(code).json({ code, message, messageKey, data: null });
}
export type Actor = NonNullable<ReturnType<typeof actor>>;
export function signed(handler: (req: Request, res: Response, user: Actor) => unknown) {
  return (req: Request, res: Response) => {
    try {
      const user = actor(req);
      if (!user) return fail(res, 401, '请选择演示身份');
      return handler(req, res, user);
    } catch {
      return fail(res, 500, '演示清单无效，请检查 kaiwu 目录后重试');
    }
  };
}
export { readManifest, label };
