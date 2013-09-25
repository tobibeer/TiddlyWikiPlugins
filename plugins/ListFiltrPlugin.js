/***
|Name|ListFiltrPlugin|
|Author|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|Documentation|http://listfiltr.tiddlyspace.com|
|Version|1.1.6 (2013-09-25)|
|~CoreVersion|2.6.5|
|License|Creative Commons 3.0|
|Source|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/ListFiltrPlugin.js|
!Info
This plugin allows to filter lists based on a search term and to browse through filter results.
!Example
{{myclass{
*a list item
*another list item
*foo bar
#one
#two
#three
Great!
}}}
<<listfiltr>>
***/
//{{{
(function ($) {

me = config.macros.listfiltr = {

        //localisation
        InputPlaceholder: 'filter list',
        InputLabel: 'Filter list:',
        InputTooltip: 'enter a search term to filter the list',

        //any items to preserve by default
        defaultPreserve: '',

        //macro handler
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            var box, boxwrap, dd, el, list, lt, placeholder, prev,
                p = paramString.parseParams('anon', null, true),
                appendTo = getParam(p, 'appendTo', this.appendTo),
                preserve = getParam(p, 'preserve', this.defaultPreserve);

            //when appendTo defined 
            if(appendTo){
                //find tiddler
                list = $(place).closest('.tiddler');
                //find element in list
                place = $(appendTo, list).first()[0] || place;
            }

            //get list as last element
            list = $(place).children().last();
            //ignore any linebreaks
            while (list.is('br')) list = list.prev();

            //when not ol ul, take contents
            if (list.is('span, div')) list = list.contents();

            //wrap the contents in a class
            list.wrapAll('<div class="lf-list"/>');

            //get the list wrapper
            list = list.closest('.lf-list');

            //if module present
            if ($.fn.outline)
                //outline any inner ordered lists to preserve original numbering
                $("ol:not(ol li > ol)", list).outline();

            //add preservation class
            $(preserve, list).addClass('lf-preserve');

            //loop all content elements that are not iframes
            list.find(":not(iframe)").addBack().contents().filter(function () {
                //the element
                var $el = $(this);
                //when
                return (
                    //text node AND
                    this.nodeType == 3 &&
                    // preceded or followed by a linebreak AND
                    ($el.prev().is('br') || $el.next().is('br')) &&
                    //not inside preserve
                    0 == $el.closest('.lf-preserve').length &&
                    //not after a pseudo order list item
                    0 == $el.prevAll('.pseudo-ol-li').length
                )
            }).wrap('<span class="lf-p"/>');

            boxwrap = $('<div class=lf-search/>').insertBefore(list);
            placeholder = placeholderIsSupported() ? me.InputPlaceholder : '';

            if(!placeholder){
                $('<span class=lf-label/>').html(me.InputLabel + ':').appendTo(boxwrap);
            }
            box = $('<input type="search"/>').attr({
                'title': me.InputTooltip,
                'placeholder' : placeholder
            }).appendTo(boxwrap);

            box.bind('keyup search', function () {
                var els, found, text, until,
                box = $(this),
                term = box.val(),
                list = box.closest('.lf-search').next();

                term.length > 1 ?
                    list.addClass('lf-filtered') :
                    list.removeClass('lf-filtered');
                
                $('li,dd,dt,span,div', list
                ).removeClass('lf-h lf-hide lf-found lf-not'
                ).each(function (i) {
                    var dt, dd, 
                        li = $(this);

                    if (term.length > 1) {

                        text = li.clone().children().remove().end().text();
                        els = li.children().not('dl,ol,ul').clone().remove('dl,ol,ul,dl *,ol *,ul *');
                        text = text + ' ' + els.text();
                        els.each(function (i) {
                            var el = $(this),
                                link = el.hasClass('externalLink') ? el.attr('href').replace('http://', '') : null;
                            tid = el.attr('tiddlyLink');
                            text += ' ' + (link ? link : '') + (tid ? ' ' + tid : '');
                        })
                        found = text.toLowerCase().indexOf(term.toLowerCase()) > -1;

                        li.not('br, .pseudo-ol-li').addClass('lf-' + (found ? 'found' : 'h'));

                        if (li.is('dt')) {
                            dd = li.nextUntil('dt','dd');
                            if (found) {
                                dd.addClass('lf-not');
                            }
                        };
                        dd = li.closest('dd');
                        if (dd.length) {
                            dt = dd.prevAll('dt:first');
                            if (found) {
                                if (!dt.hasClass('lf-found'))
                                    dt.addClass('lf-not').removeClass('lf-h');
                            } else if (dt.hasClass('lf-found')) {
                                dd.removeClass('lf-h');
                            }
                        }

                        if(found){
                            //keep timeline items
                            if(li.is('.listTitle') && li.parent().hasClass('timeline')){
                                li.parent().find('> li').each(function(){
                                    var li = $(this);
                                    if(!li.hasClass('lf-found'))
                                        li.addClass('lf-not');
                                })
                            }
                            //keep listTitle when found
                            lt = li.closest('li').parent().find('> .listTitle');
                            if(lt.length && !lt.hasClass('lf-found')){
                                lt.addClass('lf-not');
                            }
                        }
                    }
                });

                $('.highlight:not(.tiddlyLink,.externalLink)', list).each(function () {
                    $(this).after($(this).text());
                }).remove();
                $('.highlight', list).removeClass('highlight');
                if (term.length > 1) {
                    $('.lf-found', list).each(function (i) {
                        $(this).parentsUntil(until, '.lf-h').removeClass('lf-h').not('.pseudo-ol-li').addClass('lf-not');
                        $('.lf-h', this).removeClass('lf-h').not('.pseudo-ol-li').addClass('lf-not');
                    });

                    $.fn.highlight = function (term) {
                        var pattern = new RegExp('(\\b\\w*' + term + '\\w*\\b)', 'gi'),
                             repl = '<span class="highlight">$1</span>';

                        this.each(function () {
                            $(this).contents().each(function () {
                                if (this.nodeType === 3 && pattern.test(this.nodeValue)) {
                                    $(this).replaceWith(this.nodeValue.replace(pattern, repl));
                                }
                                else if (!$(this).hasClass('highlight')) {
                                    $(this).highlight(term);
                                }
                            });
                        });
                        return this;
                    };

                    $('*', list).highlight(term);

                    //highlight links
                    $('.externalLink, .tiddlyLink', list).each(function () {
                        var l = $(this),
                            link = l.hasClass('tiddlyLink') ? l.attr('tiddlyLink') : l.attr('href').replace('http://', '');
                        if (term.length > 1 && link.indexOf(term) > -1) l.addClass('highlight');
                    })
                }

                //do not hide (links) inside definition terms or timeline list items related to match 
                $('dt.lf-not .lf-h, li.lf-not.lf-h', list).removeClass('lf-h');

                //do not hide stuff under list items except further ul ol
                $('.lf-not', list)
                    .children()
                    .not('ol, ul')
                    .find('.lf-h')
                    .removeClass('lf-h');
                //except when in preserved, hide all of class lf-h 
                $('.lf-h', list).addClass('lf-hide');
    
                return true;
            });
        },
    }

    config.shadowTiddlers['StyleSheetListFiltr'] =
    '/*{{{*/\n' +
    '.lf-search {padding:5px;background:#eef;}\n' +
    '.lf-hide {display: none !important;}\n' +
    '.lf-found {background:#F5F5DC;}\n' +
    '.lf-list + br {display:none;}\n' +
    '.lf-label {margin-right:5px;font-weight:bold;}\n' +
    '.lf-filtered .lf-p {display:block;}\n' +
    '.lf-filtered br {display: none;}\n' +
    '.lf-preserve.lf-found br {display: block;}\n' +
    '/*}}}*/';
    store.addNotification('StyleSheetListFiltr', refreshStyles);

    //check for placeholder support
    function placeholderIsSupported() {
        var test = document.createElement('input');
        return ('placeholder' in test);
    }

})(jQuery);
//}}}