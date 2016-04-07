'use strict';

const colog = require('colog');

class PrettyPrint {

  static prettyPrintPercentage (data, identationLevel) {
    let identation = new Array(identationLevel + 1).join('\t');
    let color = null;

    if (data.matches <= (data.total / 3)) {
      color = 'Red';
    }
    else if (data.matches <= (data.total / 3) * 2) {
      color = 'Yellow';
    }
    else if (data.matches > (data.total / 3) * 2) {
      color = 'Green';
    }

    colog
      .log(
        colog['color' + color](
          [
            identation,
            data.check,
            ': ',
            data.matches,
            '/',
            data.total,
            ' ',
            '(',
            (
              data.matches /
              (
                data.total /
                100
              )
            ),
            ')'
          ].join('')
        )
      );
  }

  static prettyPrintList (data, identationLevel) {
    let identation = new Array(identationLevel + 1).join('\t');
    let rows = data.rows;
    let len = rows.length;
    let row = null;
    let i = 0;

    colog
      .log(
        [
          identation,
          data.check,
          ': ',
          // data.matches,
          // '/',
          // data.total,
          // ' ',
          // '(',
          // (
          //   data.matches /
          //   (
          //     data.total /
          //     100
          //   )
          // ),
          // ')'
        ].join('')
      );

    for (; i < len; i++) {
      row = rows[i];

      colog
        .log(
          [
            identation + '\t',
            [
              'id=',
              row.id,
              'value=',
              row.value,
              'zscore=',
              row.zscore
            ].join(' ')
          ].join('')
        )
    }
  }

}

module.exports = PrettyPrint;
