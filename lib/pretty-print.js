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

}

module.exports = PrettyPrint;
