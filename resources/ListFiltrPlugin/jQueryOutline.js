/***
|''Documentation''|http://listfiltr.tiddlyspace.com|
|''Idea''|http://stackoverflow.com/questions/1852816/nested-ordered-lists|
|''Version''|2013.03.01|
!Use
{{{$(selector).outline();}}}
!Options
Either override the defaults globally...
{{{
$.fn.outline.defaults.olClass = 'myClass';
}}}
Or on an individual basis:...
{{{
$(selector).outline({olClass: 'myClass'});
}}}
!Code
***/
/*{{{*/
(function ($) {
    $.fn.outline = function (options, counters) {
        var options = $.extend({}, $.fn.outline.defaults, options),
		counters = counters || [];

        function roman(num) {
            if (!+num) return false;
            var digits = String(+num).split(''),
			r = '',
			i = 3,
			key = ['', 'C', 'CC', 'CCC', 'CD', 'D', 'DC', 'DCC', 'DCCC', 'CM',
				'', 'X', 'XX', 'XXX', 'XL', 'L', 'LX', 'LXX', 'LXXX', 'XC',
				'', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
            while (i--)
                r = (key[+digits.pop() + (i * 10)] || '') + r;
            return Array(+digits.join('') + 1).join('M') + r;
        }

        function formatCounters(arrCt) {
            var a, c, ret = '', t,
				tpl = options.counterTemplates,
				plain = options.plain,
				from = plain ? arrCt.length - 1 : 0;

            for (a = from; a < arrCt.length; a++) {
                c = arrCt[a];
                t = a % tpl.length;
                switch (tpl[t].substr(0, 1)) {
                    case "a": c = String.fromCharCode(96 + c);
                        break;
                    case "A": c = String.fromCharCode(64 + c);
                        break;
                    case "i": c = roman(c).toLowerCase();
                        break;
                    case "I": c = roman(c);
                        break;
                }
                ret += c + tpl[t].substr(1);
            }
            return ret + ' ';
        }

        this.each(function () {
            $(this).children('li').each(function (i) {
                var ct = counters.concat([i + 1]);
                $('<span></span>')
					.addClass(options.liClass)
					.text(formatCounters(ct))
					.prependTo(this);
                $(this).children('ol').outline(options, ct);
            })
        });

        if (!counters.length) this.addClass(options.olClass)
    }

    $.fn.outline.defaults = {
        liClass: 'pseudo-ol-li',
        olClass: 'pseudo-ol',
        counterTemplates: ['1.', 'a.', 'i.'],
        plain: true
    }
})(jQuery);
/*}}}*/
/*{{{*/
config.shadowTiddlers['StyleSheetjQueryOutline'] =
	'/*{{{*/\n' +
	'ol .pseudo-ol-li { display: none }\n' +
	'ol.pseudo-ol, ol.pseudo-ol ol { list-style: none; margin-left: 1.5em; padding-left: 0.5em;}\n' +
	'ol.pseudo-ol {margin-left: 0.5em;padding-left:0em;}\n' +
	'ol.pseudo-ol .pseudo-ol-li { display: inline; font-weight: bold; padding-right:3px; }\n' +
	'/*}}}*/';
store.addNotification('StyleSheetjQueryOutline', refreshStyles);
/*}}}*/