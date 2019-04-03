/**
* CSS Minifier in Javascript
* 
* @author SupunKavinda <https://twitter.com/SupunWimalasena>
* Created for CSS Creator and Minifier <https://developer.hyvor.com/tools/css-creator>
*
* Minifier is inspired by PHP Library at <https://github.com/matthiasmullie/minify>
* Unminifier is inspired by <https://github.com/mrcoles/cssunminifier/blob/master/lib/cssunminifier.js>
*
*/
var minifyUnminify = (function() {


	// ================ Helper
	// PHP's strtr
	function strtr(s, p, r) {
    	return {
	        2: function () {
	            for (var i in p) {
	                s = strtr(s, i, p[i]);
	            }
	            return s;
	        },
	        3: function () {
	            return s.replace(RegExp(p, 'g'), r);
	        },
	        0: function () {
	            return;
	        }
	    }[arguments.length]();
	}

	// =============== Core Variables (props)

	// "placeholder" => "realstring" pairs
	// to encod into a weird string
	// for example, strings (with ' and ") will be encoded
	// to prevent them from being affected by later replacements
	var encoded = {} 

	// to easily identify (from showdown.js)
	// and to make it unique (hopefully noone would use this)
	var encodeChar = 'Â¨';

	// unique index for encoding 
	// this should be reset in easy minify() request
	var encodeIndex = 0;

	// for encoding, we register regexes to use them in the future
	// reason: we don't know a matched string was inside a comment
	// or vice versa
	// and array of [pattern, replacement] arrays
	var patterns = [];


	// ================ Core functions

	function reset() {
		encoded = {};
		encodeIndex = 0;
	}
	// Get and set the placeholder
	// Get - @return the placeholder
	// Set - set the placeholder and value in the encoded vairbale
	function getSetPlaceholder(val) {
		var placeholder = encodeChar + (++encodeIndex) + encodeChar;
		encoded[placeholder] = val;
		return placeholder;
	}

	// ------------- Register Functions

	// @param pat {regex} - pattern
	// @param rep {string|callable} - replacement
	function registerEncodePattern(pat, rep) {
		patterns.push( [pat, rep] );
	}
	// DWNM (Does what name means)
	function registerEncodePatterns() {
		// already registered
		if (patterns.length)
			return;

		// Strings
		registerEncodePattern(/(['"])((?:\\.|[^"\\])*)\1/, function(match) {
			return getSetPlaceholder(match);
		});

		// Comments
		registerEncodePattern(/\/\*.*?\*\//s, '');

		// Calcs (One of the trickiest)
		registerEncodePattern(/calc(\(.+?)(?=$|;|calc\()/, function(match, inside) {
			var expr = '';
				openedBrackets = 0;

			// loop though each character
			for (var i = 0, len = inside.length; i < len; i++) {
				var char = inside[i];
				expr += char;
				if (char === '(') 
					openedBrackets++;
				else if (char === ')' && --openedBrackets === 0)
					break;
			}
			// we found the end
			var rest = inside.replace(expr, ''),
				// remove brackets
				expr = expr.trim();

			return getSetPlaceholder( 'calc' + expr ) + rest;
		});


	}
	/**
	* A JS translation of <https://github.com/matthiasmullie/minify> (PHP)
	*/
	function deployRegisteredPatterns(string) {
		var last = '',
			positions = new Array(patterns.length).join('0').split('').map(function(val) {
				return parseInt(val) - 1; // -1
			});
			matches = [];

		var loopThoughPatterns = patterns; // copy from global
		var noMoreMatchedIndexes = []; // these patterns do not match the string any more
		while (string) {

			// the first match
			var firstMatch = null,
				firstPat = null;

			// indexes of patterns that has 
			// no more matched in this replacement
			

			for (var i = 0, len = loopThoughPatterns.length; i < len; i++) {
				// for patterns we found that there's no more matches
				if (noMoreMatchedIndexes.indexOf(i) >= 0)
					continue;

				var pat = loopThoughPatterns[i],
					pattern = pat[0];

				var match = pattern.exec(string);

				// find the first match
				if (match) {
					if (!firstMatch || match.index < firstMatch.index) {
						// make it the first match
						firstMatch = match;
						firstPat = pat;
					}
				} else {
					// remove this pattern from loop though patterns
					// as this didn't match
					// it won't match anymore
					// there's no need to check it this time
					noMoreMatchedIndexes.push(i);
				}
			}

			if (!firstMatch) {
				// return string += unmatched string
				last += string;
				break;
			}

			// now replace the found one
			// it's the first regex
			var pattern = firstPat[0],
				replacer = firstPat[1],
				firstMatchIndex = firstMatch.index,
				match = firstMatch[0];


			// do the replacement
			var replacement = string.replace(pattern, replacer);	

			// saving temporarily
			string = string.substring(firstMatchIndex);

			// the unmatched part
			// we don't have any match until this now
			// in the unmatched part, we can have some matches
			// we will loop again to check that
			var unmatched = string.substring(match.length);
			// string is now unmatched 
			string = unmatched;

			// the return string += replaced string (but not the unmatched string)
			last += replacement.substring(0, replacement.length - unmatched.length);

		}

		return last;

	}

	// ------------ Decode Function
	// restore everything encoded
	function decodeAll(string) {
		return strtr(string, encoded);
	}

	// ----------- Replace FUnctions
	function stripWhitespaces(string) {

		// whispaces in the beginning and end of lines
		string = string.replace(/(^\s*|\s*$)/gm, '');

		// whitespaces around meta
		// from stackoverflow.com/questions/15195750/minify-compress-css-with-regex

		// whitespaces around some chars selectors, !important and more
		string = string.replace(/\s*([\*$~^|]*=|[{};,>~]|!important\b)\s*/g, '$1');
		string = string.replace(/([\[(:>\+])\s+/g, '$1');
		string = string.replace(/\s+([\]\)>\+])/g, '$1');
		string = string.replace(/\s+(:)(?![^\}]*\{)/g, '$1');

		string = string.replace(/:(nth-child|nth-of-type|nth-last-child|nth-last-of-type)\(\s*([+-]?)\s*(.+?)\s*([+-]?)\s*(.*?)\s*\)/g, ':$1($2$3$4$5)')

		return string;
	} 

	// removes all ;s right before }
	function stripLastSemiColons(string) {
		return string.replace(/;}/g, '}');
	}

	function shortenColors(string) {

		// #ffeedd to #fed
		string = string.replace(/(?<=[: ])#([0-9a-z])\1([0-9a-z])\2([0-9a-z])\3(?:([0-9a-z])\4)?(?=[; }])/ig, '#$1$2$3$4');

		// unwanted alpha
		string = string.replace(/(?<=[: ])#([0-9a-z]{6})ff?(?=[; }])/ig, '#$1'); 	// for 6 digit
		string = string.replace(/(?<=[: ])#([0-9a-z]{3})f?(?=[; }])/ig, '#$1');		// for 3 digit

		return string;
	}

	function shortenZeros(string) {

		var before = '([:(, ])',
        	after = '([ ,);}])',
        	units = '(em|ex|%|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin|vmax|vm)';

        // 0.0px to 0
        var reg = new RegExp(before + "(-?0*0(?:\\.0+)?)px" + after, 'g');
        string = string.replace(reg, '$1$2$3');

        // .0 => 0
        var reg = new RegExp(before + "\\.0+" + units + "?" + after, 'g');
        string = string.replace(reg, '$10$2$3');

        // 20.100 => 20.1
        var reg = new RegExp(before + "(-?[0-9]+\\.[0-9]+?)0+" + units + "?" + after, 'g');
        string = string.replace(reg, '$1$2$3$4');

        // 20.00 => 20
        var reg = new RegExp(before +  '(-?[0-9]+)\\.0+' + units +  '?' + after , 'g');
        string = string.replace(reg, '$1$2$3$4');

        // 0.2 => .2
        var reg = new RegExp(before +  '(-?)0+([0-9]*\\.[0-9]+)' + units +  '?' + after , 'g');
        string = string.replace(reg, '$1$2$3$4$5');

        // a weird -0 to 0
        var reg = new RegExp(before +  '-?0+' + units +  '?' + after , 'g');
        string = string.replace(reg, '$10$2$3');

		return string;

	} 

	function stripEmptyTags(string) {
		string = string.replace(/^[^\{\};]+\{\s*\}/, '');
		string = string.replace(/(\}|;)[^\{\};]+\{\s*\}/, '$1');

		return string;
	}


	// ================ Main Functions
	function minify(string) {

		// reset variables
		reset();

		// register encoding patterns, if not
		registerEncodePatterns();
		// make use of encode patterns
		// encodes strings, comments, calc
		string = deployRegisteredPatterns(string);

		// remove whitespaces
		string = stripWhitespaces(string);

		// remove ; before }
		string = stripLastSemiColons(string);

		// shorten color codes
		string = shortenColors(string);

		// shorten zeros by removing unwanted zeros
		string = shortenZeros(string);	

		// {} to 
		string = stripEmptyTags(string);

		// decode encoded things (strings, comments, calc)
		string = decodeAll(string);

		return string;

	}

	function unminify(string) {

		// reset variables
		reset();

		// register encoding patterns, if not
		registerEncodePatterns();

		// make use of encode patterns
		// encodes strings, comments, calc
		string = deployRegisteredPatterns(string);


		string = string
	        .split('\t').join('    ')
	        .replace(/\s*{\s*/g, ' {\n    ')
	        .replace(/;\s*/g, ';\n    ')
	        .replace(/,\s*/g, ', ')
	        .replace(/[ ]*}\s*/g, '}\n')
	        .replace(/\}\s*(.+)/g, '}\n$1')
	        .replace(/\n    ([^:]+):\s*/g, '\n    $1: ')
	        .replace(/([A-z0-9\)])}/g, '$1;\n}');

	    // decode encoded things (strings, comments, calc)
		string = decodeAll(string);

	    return string;

	}


	return {
		minify: minify,
		unminify: unminify
	};

})();

var minify = minifyUnminify.minify;
var unminify = minifyUnminify.unminify;
