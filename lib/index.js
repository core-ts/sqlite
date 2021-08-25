"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var build_1 = require("./build");
var resource = (function () {
  function resource() {
  }
  return resource;
}());
exports.resource = resource;
var PoolManager = (function () {
  function PoolManager(db) {
    this.db = db;
    this.exec = this.exec.bind(this);
    this.execBatch = this.execBatch.bind(this);
    this.query = this.query.bind(this);
    this.queryOne = this.queryOne.bind(this);
    this.execScalar = this.execScalar.bind(this);
    this.count = this.count.bind(this);
  }
  PoolManager.prototype.exec = function (sql, args) {
    return exec(this.db, sql, args);
  };
  PoolManager.prototype.execBatch = function (statements, firstSuccess) {
    return execBatch(this.db, statements, firstSuccess);
  };
  PoolManager.prototype.query = function (sql, args, m, fields) {
    return query(this.db, sql, args, m, fields);
  };
  PoolManager.prototype.queryOne = function (sql, args, m, fields) {
    return queryOne(this.db, sql, args, m, fields);
  };
  PoolManager.prototype.execScalar = function (sql, args) {
    return execScalar(this.db, sql, args);
  };
  PoolManager.prototype.count = function (sql, args) {
    return count(this.db, sql, args);
  };
  return PoolManager;
}());
exports.PoolManager = PoolManager;
function execute(db, sql) {
  return new Promise(function (resolve, reject) {
    return db.exec(sql, function (err) {
      if (err) {
        return reject(err);
      }
      else {
        return resolve();
      }
    });
  });
}
exports.execute = execute;
function execBatch(db, statements, firstSuccess) {
  if (!statements || statements.length === 0) {
    return Promise.resolve(0);
  }
  else if (statements.length === 1) {
    return exec(db, statements[0].query, statements[0].params);
  }
  if (firstSuccess) {
    return execute(db, 'begin transaction').then(function () {
      return exec(db, statements[0].query, toArray(statements[0].params)).then(function () {
        var sub = statements.slice(1);
        return new Promise(function (resolve, reject) {
          var c = 1;
          sub.forEach(function (item, index) {
            db.run(item.query, toArray(item.params), function (err, result) {
              if (err) {
                reject(err);
              }
              else {
                c = c + 1;
                if (c === sub.length + 1) {
                  resolve(c);
                }
              }
            });
          });
        }).then(function (result) {
          return execute(db, 'commit').then(function () {
            return result;
          });
        }).catch(function (er0) {
          buildError(er0);
          return execute(db, 'rollback').then(function () {
            throw er0;
          });
        });
      }).catch(function () {
        return 0;
      });
    });
  }
  else {
    return execute(db, 'begin transaction').then(function () {
      return new Promise(function (resolve, reject) {
        var c = 0;
        statements.forEach(function (item) {
          db.run(item.query, toArray(item.params), function (err, result) {
            if (err) {
              reject(err);
            }
            else {
              c = c + 1;
              if (c === statements.length) {
                resolve(c);
              }
            }
          });
        });
      }).then(function (result) {
        return execute(db, 'commit').then(function () {
          return result;
        });
      }).catch(function (er0) {
        return execute(db, 'rollback').then(function () {
          throw er0;
        });
      });
    });
  }
}
exports.execBatch = execBatch;
function buildError(err) {
  if (err.errno === 19 && err.code === 'SQLITE_CONSTRAINT') {
    err.error = 'duplicate';
  }
  return err;
}
function exec(db, sql, args) {
  var p = toArray(args);
  return new Promise(function (resolve, reject) {
    return db.run(sql, p, function (err, results) {
      if (err) {
        buildError(err);
        return reject(err);
      }
      else {
        return resolve(1);
      }
    });
  });
}
exports.exec = exec;
function query(db, sql, args, m, bools) {
  var p = toArray(args);
  return new Promise(function (resolve, reject) {
    return db.all(sql, p, function (err, results) {
      if (err) {
        return reject(err);
      }
      else {
        return resolve(handleResults(results, m, bools));
      }
    });
  });
}
exports.query = query;
function queryOne(db, sql, args, m, bools) {
  var p = toArray(args);
  return new Promise(function (resolve, reject) {
    return db.get(sql, p, function (err, result) {
      if (err) {
        return reject(err);
      }
      else {
        return resolve(handleResult(result, m, bools));
      }
    });
  });
}
exports.queryOne = queryOne;
function execScalar(db, sql, args) {
  return queryOne(db, sql, args).then(function (r) {
    if (!r) {
      return null;
    }
    else {
      var keys = Object.keys(r);
      return r[keys[0]];
    }
  });
}
exports.execScalar = execScalar;
function count(db, sql, args) {
  return execScalar(db, sql, args);
}
exports.count = count;
function save(db, obj, table, attrs, buildParam, i) {
  var stm = build_1.buildToSave(obj, table, attrs, buildParam, i);
  if (!stm) {
    return Promise.resolve(0);
  }
  else {
    if (typeof db === 'function') {
      return db(stm.query, stm.params);
    }
    else {
      return exec(db, stm.query, stm.params);
    }
  }
}
exports.save = save;
function saveBatch(db, objs, table, attrs, buildParam) {
  var stmts = build_1.buildToSaveBatch(objs, table, attrs, buildParam);
  if (!stmts || stmts.length === 0) {
    return Promise.resolve(0);
  }
  else {
    if (typeof db === 'function') {
      return db(stmts);
    }
    else {
      return execBatch(db, stmts);
    }
  }
}
exports.saveBatch = saveBatch;
function toArray(arr) {
  if (!arr || arr.length === 0) {
    return [];
  }
  var p = [];
  var l = arr.length;
  for (var i = 0; i < l; i++) {
    if (arr[i] === undefined || arr[i] == null) {
      p.push(null);
    }
    else {
      if (typeof arr[i] === 'object') {
        if (arr[i] instanceof Date) {
          p.push(arr[i]);
        }
        else {
          if (resource.string) {
            var s = JSON.stringify(arr[i]);
            p.push(s);
          }
          else {
            p.push(arr[i]);
          }
        }
      }
      else {
        p.push(arr[i]);
      }
    }
  }
  return p;
}
exports.toArray = toArray;
function handleResult(r, m, bools) {
  if (r == null || r === undefined || (!m && (!bools || bools.length === 0))) {
    return r;
  }
  handleResults([r], m, bools);
  return r;
}
exports.handleResult = handleResult;
function handleResults(r, m, bools) {
  if (m) {
    var res = mapArray(r, m);
    if (bools && bools.length > 0) {
      return handleBool(res, bools);
    }
    else {
      return res;
    }
  }
  else {
    if (bools && bools.length > 0) {
      return handleBool(r, bools);
    }
    else {
      return r;
    }
  }
}
exports.handleResults = handleResults;
function handleBool(objs, bools) {
  if (!bools || bools.length === 0 || !objs) {
    return objs;
  }
  for (var _i = 0, objs_1 = objs; _i < objs_1.length; _i++) {
    var obj = objs_1[_i];
    for (var _a = 0, bools_1 = bools; _a < bools_1.length; _a++) {
      var field = bools_1[_a];
      var value = obj[field.name];
      if (value != null && value !== undefined) {
        var b = field.true;
        if (b == null || b === undefined) {
          obj[field.name] = ('1' == value || 'T' == value || 'Y' == value);
        }
        else {
          obj[field.name] = (value == b ? true : false);
        }
      }
    }
  }
  return objs;
}
exports.handleBool = handleBool;
function map(obj, m) {
  if (!m) {
    return obj;
  }
  var mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return obj;
  }
  var obj2 = {};
  var keys = Object.keys(obj);
  for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
    var key = keys_1[_i];
    var k0 = m[key];
    if (!k0) {
      k0 = key;
    }
    obj2[k0] = obj[key];
  }
  return obj2;
}
exports.map = map;
function mapArray(results, m) {
  if (!m) {
    return results;
  }
  var mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return results;
  }
  var objs = [];
  var length = results.length;
  for (var i = 0; i < length; i++) {
    var obj = results[i];
    var obj2 = {};
    var keys = Object.keys(obj);
    for (var _i = 0, keys_2 = keys; _i < keys_2.length; _i++) {
      var key = keys_2[_i];
      var k0 = m[key];
      if (!k0) {
        k0 = key;
      }
      obj2[k0] = obj[key];
    }
    objs.push(obj2);
  }
  return objs;
}
exports.mapArray = mapArray;
function getFields(fields, all) {
  if (!fields || fields.length === 0) {
    return undefined;
  }
  var ext = [];
  if (all) {
    for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
      var s = fields_1[_i];
      if (all.includes(s)) {
        ext.push(s);
      }
    }
    if (ext.length === 0) {
      return undefined;
    }
    else {
      return ext;
    }
  }
  else {
    return fields;
  }
}
exports.getFields = getFields;
function buildFields(fields, all) {
  var s = getFields(fields, all);
  if (!s || s.length === 0) {
    return '*';
  }
  else {
    return s.join(',');
  }
}
exports.buildFields = buildFields;
function getMapField(name, mp) {
  if (!mp) {
    return name;
  }
  var x = mp[name];
  if (!x) {
    return name;
  }
  if (typeof x === 'string') {
    return x;
  }
  return name;
}
exports.getMapField = getMapField;
function isEmpty(s) {
  return !(s && s.length > 0);
}
exports.isEmpty = isEmpty;
var StringService = (function () {
  function StringService(db, table, column) {
    this.db = db;
    this.table = table;
    this.column = column;
    this.load = this.load.bind(this);
    this.save = this.save.bind(this);
  }
  StringService.prototype.load = function (key, max) {
    var _this = this;
    var s = "select " + this.column + " from " + this.table + " where " + this.column + " like $1 order by " + this.column + " limit " + max;
    return query(this.db, s, ['' + key + '%']).then(function (arr) {
      return arr.map(function (i) { return i[_this.column]; });
    });
  };
  StringService.prototype.save = function (values) {
    if (!values || values.length === 0) {
      return Promise.resolve(0);
    }
    var arr = [];
    for (var i = 1; i <= values.length; i++) {
      arr.push('($' + i + ')');
      i++;
    }
    var s = "insert or ignore into " + this.table + "(" + this.column + ")values" + arr.join(',');
    return exec(this.db, s, values);
  };
  return StringService;
}());
exports.StringService = StringService;
function version(attrs) {
  var ks = Object.keys(attrs);
  for (var _i = 0, ks_1 = ks; _i < ks_1.length; _i++) {
    var k = ks_1[_i];
    var attr = attrs[k];
    if (attr.version) {
      attr.name = k;
      return attr;
    }
  }
  return undefined;
}
exports.version = version;
var SqliteWriter = (function () {
  function SqliteWriter(db, table, attributes, toDB, buildParam) {
    this.table = table;
    this.attributes = attributes;
    this.write = this.write.bind(this);
    if (typeof db === 'function') {
      this.exec = db;
    }
    else {
      this.db = db;
    }
    this.param = buildParam;
    this.map = toDB;
  }
  SqliteWriter.prototype.write = function (obj) {
    if (!obj) {
      return Promise.resolve(0);
    }
    var obj2 = obj;
    if (this.map) {
      obj2 = this.map(obj);
    }
    var stmt = build_1.buildToSave(obj2, this.table, this.attributes, this.param);
    if (stmt) {
      if (this.exec) {
        return this.exec(stmt.query, stmt.params);
      }
      else {
        return exec(this.db, stmt.query, stmt.params);
      }
    }
    else {
      return Promise.resolve(0);
    }
  };
  return SqliteWriter;
}());
exports.SqliteWriter = SqliteWriter;
var SqliteBatchWriter = (function () {
  function SqliteBatchWriter(db, table, attributes, toDB, buildParam) {
    this.table = table;
    this.attributes = attributes;
    this.write = this.write.bind(this);
    if (typeof db === 'function') {
      this.execute = db;
    }
    else {
      this.pool = db;
    }
    this.param = buildParam;
    this.map = toDB;
    var x = version(attributes);
    if (x) {
      this.version = x.name;
    }
  }
  SqliteBatchWriter.prototype.write = function (objs) {
    if (!objs || objs.length === 0) {
      return Promise.resolve(0);
    }
    var list = objs;
    if (this.map) {
      list = [];
      for (var _i = 0, objs_2 = objs; _i < objs_2.length; _i++) {
        var obj = objs_2[_i];
        var obj2 = this.map(obj);
        list.push(obj2);
      }
    }
    var stmts = build_1.buildToSaveBatch(list, this.table, this.attributes, this.param);
    if (stmts && stmts.length > 0) {
      if (this.execute) {
        return this.execute(stmts);
      }
      else {
        return execBatch(this.pool, stmts);
      }
    }
    else {
      return Promise.resolve(0);
    }
  };
  return SqliteBatchWriter;
}());
exports.SqliteBatchWriter = SqliteBatchWriter;
var PostgreSQLChecker = (function () {
  function PostgreSQLChecker(db, service, timeout) {
    this.db = db;
    this.service = service;
    this.timeout = timeout;
    if (!this.timeout) {
      this.timeout = 4200;
    }
    if (!this.service) {
      this.service = 'sqlite';
    }
    this.check = this.check.bind(this);
    this.name = this.name.bind(this);
    this.build = this.build.bind(this);
  }
  PostgreSQLChecker.prototype.check = function () {
    var _this = this;
    var obj = {};
    var promise = new Promise(function (resolve, reject) {
      _this.db.get('select date()', function (err, result) {
        if (err) {
          return reject(err);
        }
        else {
          resolve(obj);
        }
      });
    });
    if (this.timeout > 0) {
      return promiseTimeOut(this.timeout, promise);
    }
    else {
      return promise;
    }
  };
  PostgreSQLChecker.prototype.name = function () {
    return this.service;
  };
  PostgreSQLChecker.prototype.build = function (data, err) {
    if (err) {
      if (!data) {
        data = {};
      }
      data['error'] = err;
    }
    return data;
  };
  return PostgreSQLChecker;
}());
exports.PostgreSQLChecker = PostgreSQLChecker;
function promiseTimeOut(timeoutInMilliseconds, promise) {
  return Promise.race([
    promise,
    new Promise(function (resolve, reject) {
      setTimeout(function () {
        reject("Timed out in: " + timeoutInMilliseconds + " milliseconds!");
      }, timeoutInMilliseconds);
    })
  ]);
}
