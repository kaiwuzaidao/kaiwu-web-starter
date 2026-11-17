declare module 'js-yaml' {
  export const JSON_SCHEMA: object;
  export function safeLoad(text: string, options: { schema: object }): any;
}
