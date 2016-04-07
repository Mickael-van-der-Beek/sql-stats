'use strict';

class TableSchema {

  static getTableSchema (client, tableName) {
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
      .then(
        rows => {
          return rows
            .map(
              row => {
                return {
                  name: row.column_name,
                  type: row.data_type
                }
              }
            );
        }
      );
  }

}

module.exports = TableSchema;
