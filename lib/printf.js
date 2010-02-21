var sys = require('sys');
exports.format = function(format_and_args) {
	var i = 1, a, f = format_and_args[0], o = [], m, p, c, x;
	while (f) {
		if (m = /^[^\x25]+/.exec(f)) o.push(m[0]);
		else if (m = /^\x25{2}/.exec(f)) o.push('%');
		else if (m = /^\x25(?:(\d+)\$)?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(f)) {
			if (((a = format_and_args[m[1] || i++]) == null) || (a == undefined))
				throw new Error("Too few arguments");
			if (/[^s]/.test(m[7]) && (typeof(a) != 'number'))
				throw new Error("Expecting number but found " + typeof(a));
			switch (m[7]) {
				case 'b': a = a.toString(2); break;
				case 'c': a = String.fromCharCode(a); break;
				case 'd': a = parseInt(a); break;
				case 'e': a = m[6] ? a.toExponential(m[6]) : a.toExponential(); break;
				case 'f': a = m[6] ? parseFloat(a).toFixed(m[6]) : parseFloat(a); break;
				case 'o': a = a.toString(8); break;
				case 's': a = ((a = String(a)) && m[6] ? a.substring(0, m[6]) : a); break;
				case 'u': a = Math.abs(a); break;
				case 'x': a = a.toString(16); break;
				case 'X': a = a.toString(16).toUpperCase(); break;
			}
			a = (/[def]/.test(m[7]) && m[2] && a > 0 ? '+' + a : a);
			c = m[3] ? m[3] == '0' ? '0' : m[3].charAt(1) : ' ';
			x = m[5] - String(a).length;
			if (m[5]) {
				for (var o2 = []; x > 0; o[--x] = c);
				p = o2.join('');
			}
			else {
				p = '';
			}
			o.push(m[4] ? a + p : p + a);
		}
		else throw new Error("parse error");
		f = f.substring(m[0].length);
	}
	return o.join('');
}

String.format = exports.sprintf = function() {
	return exports.format(arguments);
}

exports.printf = function() {
	if (arguments.length)
		sys.print(exports.format(arguments));
}
