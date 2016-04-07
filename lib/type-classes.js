'use strict';

class TypeClasses {

  static getBaseTypeClasses (type) {
    let typeClasses = [];

    typeClasses.push(
      this.getIsNullTypeClass
    );

    switch (type.toLowerCase()) {
      case 'character':
      case 'character varying':
      case 'varchar':
      case 'text':
        typeClasses.push(
          this.getLen0TypeClass,
          this.getLenNTypeClass
        );
        break;
      case 'uuid':
        break;
      case 'binary':
        break;
      case 'binary varying':
      case 'varbinary':
        break;
      case 'boolean':
        typeClasses.push(
          this.getIsTrueTypeClass,
          this.getIsFalseTypeClass
        );
        break;
      case 'double precision':
      case 'smallint':
      case 'integer':
      case 'numeric':
      case 'decimal':
      case 'bigint':
      case 'float':
      case 'real':
        typeClasses.push(
          this.getIsZeroTypeClass,
          this.getIsPositiveTypeClass,
          this.getIsNegativeTypeClass
        );
        break;
      case 'timestamp with time zone':
      case 'timestamp':
      case 'interal':
      case 'date':
      case 'time':
        break;
      case 'multiset':
      case 'array':
      case 'xml':
        break;
      default:
        throw new Error('No query transform for type `' + type + '`');
    }

    return typeClasses;
  }

  static getStdDeviationTypeClasses (type) {
    let typeClasses = [];

    switch (type.toLowerCase()) {
      case 'character':
      case 'character varying':
      case 'varchar':
      case 'text':
        typeClasses.push(
          this.getLengthTypeClass
        );
        break;
      case 'uuid':
        break;
      case 'binary':
        break;
      case 'binary varying':
      case 'varbinary':
        break;
      case 'boolean':
        typeClasses.push(
          this.getIntegerCastTypeClass
        );
        break;
      case 'double precision':
      case 'smallint':
      case 'integer':
      case 'numeric':
      case 'decimal':
      case 'bigint':
      case 'float':
      case 'real':
        typeClasses.push(
          this.getValueTypeClass
        );
        break;
      case 'timestamp with time zone':
      case 'timestamp':
      case 'interal':
      case 'date':
      case 'time':
        break;
      case 'multiset':
      case 'array':
      case 'xml':
        break;
      default:
        throw new Error('No query transform for type `' + type + '`');
    }

    return typeClasses;
  }

  // Base

  static getIsNullTypeClass () {
    return '? IS NULL';
  }

  static getLen0TypeClass () {
    return 'CHAR_LENGTH(?) = 0'
  }

  static getLenNTypeClass () {
    return 'CHAR_LENGTH(?) > 1';
  }

  static getIsTrueTypeClass () {
    return '? = TRUE';
  }

  static getIsFalseTypeClass () {
    return '? = FALSE';
  }

  static getIsZeroTypeClass () {
    return '? = 0';
  }

  static getIsPositiveTypeClass () {
    return '? > 0';
  }

  static getIsNegativeTypeClass () {
    return '? < 0';
  }

  // Std Deviation

  static getLengthTypeClass () {
    return 'CHAR_LENGTH(?)';
  }

  static getIntegerCastTypeClass () {
    return '?::INT';
  }

  static getValueTypeClass () {
    return '?';
  }

}

module.exports = TypeClasses;
