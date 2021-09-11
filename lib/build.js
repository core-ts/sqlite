"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function param(i) {
  return '?';
}
exports.param = param;
function params(length, from) {
  if (from === undefined || from == null) {
    from = 0;
  }
  var ps = [];
  for (var i = 1; i <= length; i++) {
    ps.push(param(i + from));
  }
  return ps;
}
exports.params = params;
function metadata(attrs) {
  var mp = {};
  var ks = Object.keys(attrs);
  var ats = [];
  var bools = [];
  var fields = [];
  var ver;
  var isMap = false;
  for (var _i = 0, ks_1 = ks; _i < ks_1.length; _i++) {
    var k = ks_1[_i];
    var attr = attrs[k];
    attr.name = k;
    if (attr.key) {
      ats.push(attr);
    }
    if (!attr.ignored) {
      fields.push(k);
    }
    if (attr.type === 'boolean') {
      bools.push(attr);
    }
    if (attr.version) {
      ver = k;
    }
    var field = (attr.field ? attr.field : k);
    var s = field.toLowerCase();
    if (s !== k) {
      mp[s] = k;
      isMap = true;
    }
  }
  var m = { keys: ats, fields: fields, version: ver };
  if (isMap) {
    m.map = mp;
  }
  if (bools.length > 0) {
    m.bools = bools;
  }
  return m;
}
exports.metadata = metadata;
function buildToSave(obj, table, attrs, buildParam, i) {
  if (!i) {
    i = 1;
  }
  if (!buildParam) {
    buildParam = param;
  }
  var ks = Object.keys(attrs);
  var cols = [];
  var values = [];
  var args = [];
  for (var _i = 0, ks_2 = ks; _i < ks_2.length; _i++) {
    var k = ks_2[_i];
    var v = obj[k];
    var attr = attrs[k];
    if (attr && !attr.ignored) {
      if (attr.default !== undefined && attr.default != null && (v === undefined || v == null)) {
        v = attr.default;
      }
      if (v !== undefined) {
        var field = (attr.field ? attr.field : k);
        cols.push(field);
        if (v === '') {
          values.push("''");
        }
        else if (v == null) {
          values.push("null");
        }
        else if (typeof v === 'number') {
          values.push(toString(v));
        }
        else {
          var p = buildParam(i++);
          values.push(p);
          if (typeof v === 'boolean') {
            if (v === true) {
              var v2 = (attr.true ? attr.true : "'1'");
              args.push(v2);
            }
            else {
              var v2 = (attr.false ? attr.false : "'0'");
              args.push(v2);
            }
          }
          else {
            args.push(v);
          }
        }
      }
    }
  }
  if (cols.length === 0) {
    return null;
  }
  else {
    var query = "replace into " + table + "(" + cols.join(',') + ")values(" + values.join(',') + ")";
    return { query: query, params: args };
  }
}
exports.buildToSave = buildToSave;
function buildToSaveBatch(objs, table, attrs, buildParam) {
  if (!buildParam) {
    buildParam = param;
  }
  var sts = [];
  var meta = metadata(attrs);
  var pks = meta.keys;
  if (!pks || pks.length === 0) {
    return null;
  }
  var ks = Object.keys(attrs);
  for (var _i = 0, objs_1 = objs; _i < objs_1.length; _i++) {
    var obj = objs_1[_i];
    var i = 1;
    var cols = [];
    var values = [];
    var args = [];
    for (var _a = 0, ks_3 = ks; _a < ks_3.length; _a++) {
      var k = ks_3[_a];
      var attr = attrs[k];
      if (attr && !attr.ignored) {
        var v = obj[k];
        if (attr.default !== undefined && attr.default != null && (v === undefined || v == null)) {
          v = attr.default;
        }
        if (v !== undefined) {
          var field = (attr.field ? attr.field : k);
          cols.push(field);
          if (v === '') {
            values.push("''");
          }
          else if (v == null) {
            values.push("null");
          }
          else if (typeof v === 'number') {
            values.push(toString(v));
          }
          else {
            var p = buildParam(i++);
            values.push(p);
            if (typeof v === 'boolean') {
              if (v === true) {
                var v2 = (attr.true ? attr.true : "'1'");
                args.push(v2);
              }
              else {
                var v2 = (attr.false ? attr.false : "'0'");
                args.push(v2);
              }
            }
            else {
              args.push(v);
            }
          }
        }
      }
    }
    var q = "replace into " + table + "(" + cols.join(',') + ")values(" + values.join(',') + ")";
    var smt = { query: q, params: args };
    sts.push(smt);
  }
  return sts;
}
exports.buildToSaveBatch = buildToSaveBatch;
var n = 'NaN';
function toString(v) {
  var x = '' + v;
  if (x === n) {
    x = 'null';
  }
  return x;
}
exports.toString = toString;
