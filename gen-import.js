/* GEN 文件导入：一个 NESTED_PROFILE 文件对应一根母材，NO_OF_PROFS 为零件数。 */
(function (root) {
  'use strict';
  const STORAGE_KEY = 'profile_plan_gen_imports_v1';
  function parse(text, filename) {
    if (!/\.gen$/i.test(filename)) throw new Error('仅支持 .gen 文件');
    if (!text.trim()) throw new Error('文件为空');
    const commonBlock = text.match(/^\s*COMMON_DATA\s*$([\s\S]*?)^\s*END_OF_COMMON_DATA\s*$/m);
    if (!/^\s*TYPE_OF_GENERIC_FILE\s*=\s*NESTED_PROFILE\s*$/mi.test(text) || !commonBlock) {
      throw new Error('不是有效的 GEN 型材套料文件，缺少文件标识或 COMMON_DATA');
    }
    const common = {};
    for (const line of commonBlock[1].split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*?)\s*$/i);
      if (match) common[match[1].toUpperCase()] = match[2];
    }
    const number = value => value != null && value.trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
    const length = number(common.RAW_LENGTH);
    if (!common.SHAPE || !common.DIMENSION || length == null || length <= 0) {
      throw new Error('缺少有效的 SHAPE、DIMENSION 或 RAW_LENGTH');
    }
    const blocks = [...text.matchAll(/^\s*PROFILE_DATA\s*$([\s\S]*?)^\s*END_OF_PROFILE_DATA\s*$/gm)];
    const partCount = common.NO_OF_PROFS == null ? blocks.length : number(common.NO_OF_PROFS);
    if (!Number.isInteger(partCount) || partCount <= 0 || partCount !== blocks.length) {
      throw new Error('零件数据不完整，NO_OF_PROFS 与 PROFILE_DATA 数量不一致');
    }
    const parts = blocks.map(block => {
      const field = key => block[1].match(new RegExp('^\\s*' + key + '\\s*=\\s*(.*?)\\s*$', 'm'))?.[1];
      return {name:field('NAME') || '', length:number(field('MLENGTH'))};
    });
    const nestingLayoutNo = common.NEST_NAME || filename.replace(/\.gen$/i, '');
    return {
      nestingLayoutNo, programNo:nestingLayoutNo,
      profileType:common.SHAPE + common.DIMENSION, material:common.QUALITY || '',
      length, usedLength:number(common.USED_LENGTH), partCount, partsQty:partCount, parts,
      totalPartLength:parts.every(part => part.length != null) ? parts.reduce((sum, part) => sum + part.length, 0) : null,
      genFile:filename, genContent:text,
    };
  }
  async function read(file) {
    const bytes = await file.arrayBuffer();
    let text;
    try { text = new TextDecoder('utf-8', {fatal:true}).decode(bytes); }
    catch (_) { text = new TextDecoder('gb18030', {fatal:true}).decode(bytes); }
    return parse(text, file.name);
  }
  function load(storage) {
    const rows = JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(rows)) throw new Error('本地 GEN 切割包数据格式异常');
    return rows;
  }
  function save(storage, rows) {
    storage.setItem(STORAGE_KEY, JSON.stringify(rows.filter(row => row.genImported)));
  }
  const api = {parse, read, load, save, STORAGE_KEY};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GenImport = api;
})(typeof window !== 'undefined' ? window : globalThis);
