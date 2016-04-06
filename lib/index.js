'use strict';

const colog = require('colog');
const knex = require('knex');
const minimist = require('minimist');
const Promise = require('bluebird');

function getTables (client) {
  return client
    .select([
      'table_name'
    ])
    .from(
      'information_schema.tables'
    )
    .where({
      table_schema: 'public'
    })
    .then(rows => {
      return rows.map(row => row.table_name);
    });
}

function getSchema (client, tableName) {
  return client
    .select([
      'column_name',
      'data_type',
      'character_maximum_length'
    ])
    .from(
      'information_schema.columns'
    )
    .where({
      table_name: tableName
    })
    .then(rows => {
      const schema = {};

      rows.forEach(
        row => schema[row.column_name] = row.data_type
      );

      return schema;
    });
}

function getRelationships (client, tableName) {
  return client
    .select([
      'table_name',
      'constraint_name',
      'character_maximum_length'
    ])
    .from(
      'information_schema.table_constraints'
    )
    .where({
      table_name: tableName,
      constraint_type: 'PRIMARY KEY'
    });
}

function getTableQuery(client, table) {
  return client
    .select(
      knex.raw(
        'count(*)'
      )
    )
    .from(table);
}

function getIsNullQuery (query, column) {
  return query
    .whereNull(
      column
    );
}

function getLen0Query (query, column) {
  return query
    .whereRaw(
      // 'LEN("' + column + '") = 0'
      'CHAR_LENGTH(?) = 0',
      [
        column
      ]
    );
}

function getLenNQuery (query, column) {
  return query
    .whereRaw(
      // 'LEN("' + column + '") > 1'
      'CHAR_LENGTH(?) > 1',
      [
        column
      ]
    );
}

function getIsTrueQuery (query, column) {
  return query
    .where({
      [column]: true
    });
}

function getIsFalseQuery (query, column) {
  return query
    .where({
      [column]: false
    });
}

function getIsZero (query, column) {
  return query
    .where({
      [column]: 0
    });
}

function getIsPositive (query, column) {
  return query
    .whereRaw(
      '? > \'0\'',
      [
        column
      ]
    );
}

function getIsNegative (query, column) {
  return query
    .whereRaw(
      '? < \'0\'',
      [
        column
      ]
    );
}

function getQueryTransformsByType (type) {
  let queryTransforms = [];

  switch (type.toLowerCase()) {
    case 'character':
      queryTransforms = [
        getIsNullQuery
      ];
      break;
    case 'character varying':
    case 'varchar':
    case 'text':  // postgres ?
      queryTransforms = [
        getIsNullQuery,
        getLen0Query,
        getLenNQuery
      ];
      break;
    case 'binary':
      break;
    case 'binary varying':
    case 'varbinary':
      break;
    case 'boolean':
      queryTransforms = [
        getIsNullQuery,
        getIsTrueQuery,
        getIsFalseQuery
      ];
      break;
    case 'double precision':
    case 'smallint':
    case 'integer':
    case 'numeric':
    case 'decimal':
    case 'bigint':
    case 'float':
    case 'real':
      queryTransforms = [
        getIsNullQuery,
        getIsZero,
        getIsPositive,
        getIsNegative
      ];
      break;
    case 'timestamp with time zone': // postgres ?
    case 'timestamp':
    case 'interal':
    case 'date':
    case 'time':
      queryTransforms = [
        getIsNullQuery,
        getIsZero
      ];
      break;
    case 'multiset':
    case 'array':
    case 'xml':
      break;
    default:
      throw new Error('No query transform for type `' + type + '`');
  }

  // console.log(type, '=', queryTransforms);

  return queryTransforms;
}

function applyQueryTransformsByType (query, column, type) {
  return getQueryTransformsByType(
    type
  )
    .map(queryTransform => {
      console.log('column=', column);
      console.log(queryTransform(
        query
          .clone(),
        column
      ).toString());

      return queryTransform(
        query
          .clone(),
        column
      )
      .then(res => [column, type, queryTransform.name, res]);
    });
}

function getClient (dialect, host, port, username, password, database) {
  return knex({
    client: dialect,
    connection: {
      host: host,
      port: port,
      user: username,
      password: password,
      database: database
    }
  });
}

function main (options) {
  options = options || {};

  const table = options.table;

  const client = getClient(
    options.dialect,
    options.host,
    options.port,
    options.username,
    options.password,
    options.database
  );

  colog.success('TABLE: ' + table);

  getSchema(client, table)
    .then(
      schema => {
        Promise
          .each(
            Object
              .keys(schema)
              .reduce(
                (queryTransforms, column) => {
                  return queryTransforms.concat(
                      applyQueryTransformsByType(
                      getTableQuery(
                        client,
                        table
                      ),
                      column,
                      schema[column]
                    )
                  );
                },
                []
              ),
            res => {
              console.log(res);
            }
          );
      }
    );
}

main(
  minimist(
    process
      .argv
      .slice(2)
  )
);
