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

function getBaseStdDeviationQuery (client, table, column, typeClass) {
  return client
    .raw(
      [
        'WITH',
          't(id, value)',
            'AS (',
              'SELECT',
                'id,',
                typeClass
                  .replace(
                    '?',
                    '"' + column.name + '"'
                  ),
                  'AS value',
                'FROM',
                  '"' + table + '"',
                'WHERE',
                  '"' + column.name + '" IS NOT NULL',
            '),',
          'data_with_stddev',
            'AS (',
              'SELECT',
                'id,',
                'value,',
                '(',
                  '(',
                    'value -',
                    'AVG(value) OVER ()',
                  ') /',
                  '(',
                    // 'CASE WHEN',
                    //   'STDDEV(value) OVER () != 0',
                    //   'THEN STDDEV(value) OVER ()',
                    //   'ELSE 1',
                    // 'END',
                    'STDDEV(value) OVER () + 1',
                  ')',
                ')',
                  'AS zscore',
                'FROM t',
                'ORDER BY 1',
            ')',
        // 'SELECT',
        //     '-1',
        //       'AS id,',
        //     'COUNT(*)',
        //       'AS value,',
        //     'SUM(',
        //       'CASE WHEN',
        //         'ABS(zscore) >= 1.645',
        //         'THEN 1',
        //         'ELSE 0',
        //       'END',
        //     ')',
        //       'AS',
        //       'zscore',
        // 'FROM',
        //   'data_with_stddev',
        // 'UNION ALL',
        'SELECT',
          'id,',
          'value,',
          'zscore',
        'FROM',
          'data_with_stddev',
        'WHERE',
          'ABS(zscore) >= 1.645',
        'ORDER BY ABS(zscore) DESC',
        'LIMIT 5;'
      ].join(' ')
    );
}

function getTypeClassQueries (client, table, column) {
  return []
    .concat(
      TypeClasses
        .getBaseTypeClasses(
          column.type
        )
        .map(
          typeClass => {
            return getBaseSumQuery(
                client,
                table,
                column,
                typeClass()
              )
              .then(
                result => {
                  return {
                    query: 'percentage',
                    name: column.name,
                    type: column.type,
                    check: typeClass.name,
                    total: result[0].total,
                    matches: result[0].matches
                  };
                }
              );
          }
        ),
      TypeClasses
        .getStdDeviationTypeClasses(
          column.type
        )
        .map(
          typeClass => {
            return getBaseStdDeviationQuery(
                client,
                table,
                column,
                typeClass()
              )
              .then(
                result => {
                  return {
                    query: 'list',
                    check: typeClass.name,
                    rows: result.rows.slice(1),
                    // total: result.rows[0].total,
                    // matches: result.rows[0].matches
                  };
                }
              )
          }
        )
    );
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

  Promise
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
          .mapSeries(
            typeClassQueries,
            result => {
              switch (result.query) {
                case 'percentage':
                  PrettyPrint.prettyPrintPercentage(
                    result,
                    2
                  );
                  break;
                case 'list':
                  PrettyPrint.prettyPrintList(
                    result,
                    2
                  );
                  break;
              }
            } 
          )
      }
    )
    .then(() => {
      return null;
    });
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
  // .finally(() => process.exit(0));
