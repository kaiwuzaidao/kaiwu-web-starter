const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { safeLoad, JSON_SCHEMA } = require('js-yaml');
function readManifest(name) {
  const file = join(process.cwd(), 'kaiwu', name + '.yml');
  const value = safeLoad(readFileSync(file, 'utf8'), { schema: JSON_SCHEMA });
  if (!Array.isArray(value)) throw new Error(file + ' 必须是列表');
  return value;
}
function label(value) {
  return typeof value === 'object' && value ? String(value['zh-CN'] || '') : String(value ?? '');
}
module.exports = { readManifest, label };
