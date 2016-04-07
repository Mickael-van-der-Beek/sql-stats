'use strict';

const colog = require('colog');
const knex = require('knex');
const minimist = require('minimist');
const PrettyPrint = require('./pretty-print');
const Promise = require('bluebird');
const TableSchema = require('./table-schema');
const TypeClasses = require('./type-classes');

function getBaseSumQuery (client, table, column, typeClass) {
  return client
    .select(
      knex
        .raw(
          [
            'COUNT(*)',
            'AS',
            'total'
          ].join(' ')
        ),
      knex
        .raw(
          [
            'SUM(',
              'CASE WHEN',
                typeClass,
                'THEN 1',
                'ELSE 0',
              'END',
            ')',
            'AS',
            'matches'
          ]
            .join(' ')
            .replace(
              '?',
              '"' + column.name + '"'
            )
        )
    )
    .from(table);
}

function getTypeClassQueries (client, table, column) {
  return TypeClasses
    .getTypeClasses(
      column.type
    )
    .map(typeClass => {
      const query = getBaseSumQuery(
        client,
        table,
        column,
        typeClass()
      )

      return query
        .then(
          result => {
            return {
              name: column.name,
              type: column.type,
              check: typeClass.name,
              total: result[0].total,
              matches: result[0].matches
            };
          });
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

function getTableStats (client, table) {
  colog.success('\nTABLE: ' + table);

  return Promise
    .mapSeries(
      TableSchema
        .getTableSchema(
          client,
          table
        ),
      column => {
        const typeClassQueries = getTypeClassQueries(
          client,
          table,
          column
        );

        colog.success('\tCOLUMN: ' + column.name);

        return Promise
          .each(
            typeClassQueries,
            result => {
              PrettyPrint.prettyPrintPercentage(
                result,
                2
              );
            } 
          )
      }
    );
}

function main (options) {
  options = options || {};

  const client = getClient(
    options.dialect,
    options.host,
    options.port,
    options.username,
    options.password,
    options.database
  );

  if (options.table) {
    return getTableStats(
      client,
      [
        options.table
      ]
    );
  }
  else {
    return getTables(
      client
    )
      .then(tables => {
        return Promise.mapSeries(
          tables,
          table => {
            return getTableStats(
              client,
              table
            );
          }
        );
      });
  }
}

main(
  minimist(
    process
      .argv
      .slice(2)
  )
)
  .finally(() => process.exit(0));
