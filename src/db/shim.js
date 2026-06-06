/** @format */
const { getDb } = require("./client");
const { eq, and, or, sql, lt, lte, gt, gte, ne, inArray, notInArray } = require("drizzle-orm");

function getColumnKey(table, key) {
  const lowerKey = key.toLowerCase();
  const columns = Object.keys(table);
  
  if (table[key]) return key;
  
  for (const col of columns) {
    if (col.toLowerCase() === lowerKey) return col;
    if (col === 'guildId' && (lowerKey === 'guild' || lowerKey === 'guildid')) return col;
    if (col === 'userId' && (lowerKey === 'user' || lowerKey === 'userid')) return col;
    if (col === 'channelId' && lowerKey === 'channel') return col;
    if (col === 'roleId' && lowerKey === 'role') return col;
    if (col === 'messageId' && lowerKey === 'message') return col;
    if (col === 'tracks' && lowerKey === 'playlist') return col;
    if (col === 'playlistName' && lowerKey === 'playlistname') return col;
    if (col === 'createdOn' && lowerKey === 'createdon') return col;
  }
  return key;
}

function buildDrizzleWhere(table, query) {
  if (!query || Object.keys(query).length === 0) return null;
  
  const conditions = [];
  
  for (const [key, value] of Object.entries(query)) {
    if (key === '$or') {
      if (Array.isArray(value)) {
        const orConditions = value.map(q => buildDrizzleWhere(table, q)).filter(Boolean);
        if (orConditions.length > 0) {
          conditions.push(or(...orConditions));
        }
      }
      continue;
    }
    if (key === '$and') {
      if (Array.isArray(value)) {
        const andConditions = value.map(q => buildDrizzleWhere(table, q)).filter(Boolean);
        if (andConditions.length > 0) {
          conditions.push(and(...andConditions));
        }
      }
      continue;
    }
    
    const colName = getColumnKey(table, key);
    const column = table[colName];
    if (!column) continue;
    
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof RegExp)) {
      const colConditions = [];
      let handled = false;

      if (value.$regex) {
        let pattern = value.$regex;
        if (pattern instanceof RegExp) {
          pattern = pattern.source;
        }
        let sqlPattern = pattern.replace(/^\^|\$$/g, ''); 
        const isCaseInsensitive = value.$options === 'i' || (value.$regex instanceof RegExp && value.$regex.flags.includes('i'));
        if (isCaseInsensitive) {
          colConditions.push(sql`lower(${column}) = lower(${sqlPattern})`);
        } else {
          colConditions.push(sql`${column} = ${sqlPattern}`);
        }
        handled = true;
      }

      if (value.$lt !== undefined) {
        colConditions.push(lt(column, value.$lt));
        handled = true;
      }
      if (value.$lte !== undefined) {
        colConditions.push(lte(column, value.$lte));
        handled = true;
      }
      if (value.$gt !== undefined) {
        colConditions.push(gt(column, value.$gt));
        handled = true;
      }
      if (value.$gte !== undefined) {
        colConditions.push(gte(column, value.$gte));
        handled = true;
      }
      if (value.$ne !== undefined) {
        colConditions.push(ne(column, value.$ne));
        handled = true;
      }
      if (value.$in !== undefined && Array.isArray(value.$in)) {
        if (value.$in.length > 0) {
          colConditions.push(inArray(column, value.$in));
        } else {
          colConditions.push(sql`1=0`);
        }
        handled = true;
      }
      if (value.$nin !== undefined && Array.isArray(value.$nin)) {
        if (value.$nin.length > 0) {
          colConditions.push(notInArray(column, value.$nin));
        } else {
          colConditions.push(sql`1=1`);
        }
        handled = true;
      }

      if (handled) {
        if (colConditions.length > 0) {
          if (colConditions.length === 1) {
            conditions.push(colConditions[0]);
          } else {
            conditions.push(and(...colConditions));
          }
        }
        continue;
      }
    }
    
    conditions.push(eq(column, value));
  }
  
  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

class Document {
  constructor(model, data, isNew = true) {
    this._model = model;
    this._isNew = isNew;
    this._data = { ...data };
    
    // Assign custom document methods
    Object.assign(this, model.customDocMethods);
    
    const columns = Object.keys(model.table);
    for (const col of columns) {
      const camel = col;
      const pascal = col.charAt(0).toUpperCase() + col.slice(1);
      const snake = col.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      
      const properties = new Set([camel, pascal, snake]);
      
      if (col === 'guildId') { properties.add('Guild'); properties.add('guild'); }
      if (col === 'userId') { properties.add('UserId'); properties.add('userId'); properties.add('user'); properties.add('User'); }
      if (col === 'channelId') { properties.add('Channel'); properties.add('channel'); }
      if (col === 'roleId') { properties.add('Role'); properties.add('role'); }
      if (col === 'messageId') { properties.add('Message'); properties.add('message'); }
      if (col === 'prefix') { properties.add('Prefix'); }
      if (col === 'username') { properties.add('Username'); }
      if (col === 'playlistName') { properties.add('PlaylistName'); }
      if (col === 'tracks') { properties.add('Playlist'); }
      if (col === 'createdOn') { properties.add('CreatedOn'); }

      for (const prop of properties) {
        if (prop in this) continue;
        Object.defineProperty(this, prop, {
          get: () => {
            return this._data[col];
          },
          set: (val) => {
            this._data[col] = val;
          },
          configurable: true,
          enumerable: true
        });
      }
    }
  }

  async save() {
    return this._model.saveDocument(this);
  }

  async deleteOne() {
    return this._model.deleteDocument(this);
  }
}

class ShimModel {
  constructor(table, customDocMethods = {}) {
    this.table = table;
    this.customDocMethods = customDocMethods;
    
    const self = this;
    function Model(data) {
      return new Document(self, data, true);
    }
    
    Object.setPrototypeOf(Model, self);
    
    Model.findOne = self.findOne.bind(self);
    Model.find = self.find.bind(self);
    Model.findOneIntersect = self.findOneAndUpdate.bind(self); // wait, let's keep convention
    Model.findOneAndUpdate = self.findOneAndUpdate.bind(self);
    Model.deleteOne = self.deleteOne.bind(self);
    Model.deleteMany = self.deleteMany.bind(self);
    Model.updateOne = self.updateOne.bind(self);
    Model.updateMany = self.updateMany.bind(self);
    Model.countDocuments = self.countDocuments.bind(self);
    Model.exists = self.exists.bind(self);
    Model.create = self.create.bind(self);
    
    return Model;
  }
  
  findOne(query) {
    const promise = (async () => {
      const db = getDb();
      const whereClause = buildDrizzleWhere(this.table, query);
      const queryBuilder = db.select().from(this.table);
      if (whereClause) {
        queryBuilder.where(whereClause);
      }
      const rows = await queryBuilder.limit(1);
      return rows[0] ? new Document(this, rows[0], false) : null;
    })();
    
    promise.lean = () => {
      return promise.then(doc => doc ? doc._data : null);
    };
    
    return promise;
  }
  
  find(query) {
    const promise = (async () => {
      const db = getDb();
      const whereClause = buildDrizzleWhere(this.table, query);
      const queryBuilder = db.select().from(this.table);
      if (whereClause) {
        queryBuilder.where(whereClause);
      }
      const rows = await queryBuilder;
      return rows.map(row => new Document(this, row, false));
    })();
    
    promise.lean = () => {
      return promise.then(docs => docs.map(doc => doc._data));
    };
    
    return promise;
  }
  
  async deleteOne(query) {
    const db = getDb();
    const whereClause = buildDrizzleWhere(this.table, query);
    const queryBuilder = db.delete(this.table);
    if (whereClause) {
      queryBuilder.where(whereClause);
    }
    const rows = await queryBuilder.returning();
    return {
      deletedCount: rows.length,
      acknowledged: true
    };
  }

  async deleteMany(query) {
    const db = getDb();
    const whereClause = buildDrizzleWhere(this.table, query);
    const queryBuilder = db.delete(this.table);
    if (whereClause) {
      queryBuilder.where(whereClause);
    }
    const rows = await queryBuilder.returning();
    return {
      deletedCount: rows.length,
      acknowledged: true
    };
  }
  
  findOneAndUpdate(query, update, options = {}) {
    const promise = (async () => {
      await this.updateOne(query, update, options);
      return this.findOne(query);
    })();
    
    promise.lean = () => {
      return promise.then(doc => doc ? doc._data : null);
    };
    
    return promise;
  }
  
  async updateOne(query, update, options = {}) {
    const db = getDb();
    const whereClause = buildDrizzleWhere(this.table, query);
    
    let setData = {};
    if (update && (update.$set || update.$setOnInsert || update.$inc)) {
      if (update.$setOnInsert) {
        setData = { ...setData, ...update.$setOnInsert };
      }
      if (update.$set) {
        setData = { ...setData, ...update.$set };
      }
      if (update.$inc) {
        const doc = await this.findOne(query);
        for (const [k, v] of Object.entries(update.$inc)) {
          const col = getColumnKey(this.table, k);
          const currentVal = doc ? (doc[col] || 0) : 0;
          setData[col] = Number(currentVal) + Number(v);
        }
      }
    } else {
      setData = update || {};
    }
    
    const mappedData = {};
    for (const [k, v] of Object.entries(setData)) {
      const col = getColumnKey(this.table, k);
      if (this.table[col]) {
        mappedData[col] = v;
      }
    }
    
    if (options.upsert) {
      const pkCol = Object.keys(this.table).find(col => this.table[col].primary || this.table[col].isPrimaryKey);
      if (pkCol) {
        const values = { ...mappedData };
        for (const [k, v] of Object.entries(query)) {
          const col = getColumnKey(this.table, k);
          if (this.table[col]) {
            values[col] = v;
          }
        }
        const rows = await db.insert(this.table)
          .values(values)
          .onConflictDoUpdate({ target: this.table[pkCol], set: mappedData })
          .returning();
        return {
          modifiedCount: rows.length,
          matchedCount: rows.length,
          acknowledged: true,
          upsertedCount: rows.length > 0 ? 1 : 0
        };
      }
    }
    
    const queryBuilder = db.update(this.table).set(mappedData);
    if (whereClause) {
      queryBuilder.where(whereClause);
    }
    const rows = await queryBuilder.returning();
    return {
      modifiedCount: rows.length,
      matchedCount: rows.length,
      acknowledged: true
    };
  }

  async updateMany(query, update) {
    return this.updateOne(query, update);
  }

  async exists(query) {
    const doc = await this.findOne(query);
    return doc ? { _id: doc.id || doc.userId || doc.guildId } : null;
  }
  
  async countDocuments(query) {
    const db = getDb();
    const whereClause = buildDrizzleWhere(this.table, query);
    const queryBuilder = db.select({ count: sql`count(*)` }).from(this.table);
    if (whereClause) {
      queryBuilder.where(whereClause);
    }
    const rows = await queryBuilder;
    return Number(rows[0]?.count ?? 0);
  }
  
  async create(data) {
    const db = getDb();
    const mappedData = {};
    for (const [k, v] of Object.entries(data)) {
      const col = getColumnKey(this.table, k);
      if (this.table[col]) {
        mappedData[col] = v;
      }
    }
    const [row] = await db.insert(this.table).values(mappedData).returning();
    return new Document(this, row, false);
  }
  
  async saveDocument(doc) {
    const db = getDb();
    const pkCol = Object.keys(this.table).find(col => this.table[col].primary || this.table[col].isPrimaryKey);
    if (!pkCol) throw new Error("No primary key found for table");
    
    const mappedData = {};
    for (const col of Object.keys(this.table)) {
      if (doc._data[col] !== undefined) {
        mappedData[col] = doc._data[col];
      }
    }
    
    const [row] = await db.insert(this.table)
      .values(mappedData)
      .onConflictDoUpdate({ target: this.table[pkCol], set: mappedData })
      .returning();
    
    doc._data = { ...row };
    doc._isNew = false;
    return doc;
  }
  
  async deleteDocument(doc) {
    const db = getDb();
    const pkCol = Object.keys(this.table).find(col => this.table[col].primary || this.table[col].isPrimaryKey);
    if (!pkCol) throw new Error("No primary key found for table");
    
    const val = doc._data[pkCol];
    if (val === undefined) return;
    
    await db.delete(this.table).where(eq(this.table[pkCol], val));
  }
}

module.exports = { ShimModel, Document };
