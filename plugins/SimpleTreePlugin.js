/***
|''Name''|SimpleTreePlugin|
|''Description''|Creates a simple expandable / collapsible tree|
|''Documentation''|http://simpletree.tiddlyspace.com|
|''Version''|0.9.0 BETA|
|''Core''|2.5.2|
|''Author''|Tobias Beer|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/SimpleTreePlugin.js|
!Usage
Append the {{{<<simpletree>>}}} to any list.
!Code
***/
//{{{
(function ($) {

    config.macros.simpletree = {

        //
        //PARAMETER DEFAULTS
        //
        bulletSubNone: '-',
        bulletSubClosed: '+',
        bulletSubOpen: '>',
        showLinksAsBlocks: false,
        collapseSiblings: true,
        slideOpenClose: false,
        slideDuration: '400',

        //
        //TRANSLATIONS
        //
        txtAltClick: 'ALT+cLick or double click a list bullet to expand all...',

        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            var closed, list, none, open, styles = '',
                cms = this,
                //get params
                p = paramString.parseParams('st', null, true),
                //custom class
                css = getParam(p, 'class', ''),
                //whether or not to display items as block items
                block = params.contains('block') || this.showLinksAsBlocks,
                //whether or not to display items as block items
                slide = params.contains('slide') || this.slideOpenClose,
                duration = this.slideDuration,
                //get bullets as param or default
                bullets = getParam(p, 'bullets', this.bulletSubNone + '|' + this.bulletSubClosed + '|' + this.bulletSubOpen).split('|'),
                //get collaps
                collapse = params.contains('collapse') || this.collapseSiblings && !params.contains('nocollapse'),
                //get custom styles
                style = getParam(p, 'css', '')
                    + store.getTiddlerText(getParam(p, 'template', '')),
                //a random wrapper class
                listClass = 'st-' + new Date().formatString('YYYYMMDDhhmmss') + Math.random().toString().substr(6);

            //get the preceding list
            list = $(place).children().last();
            while (list.is('br')) list = list.prev();

            //wrap the list
            list.wrapAll('<div class="st-tree ' + listClass + '"/>');
            //get the list
            list = $('.' + listClass).attr('title', this.txtAltClick);

            //no doubleclick editing
            list.dblclick(function () { return false; });

            //analyse bullets
            none = (bullets[0] || '').trim();
            closed = (bullets[1] || '').trim();
            open = (bullets[2] || '').trim();

            $('<span class="st-bullets" style="display:none;">' +
                '<span class="st-bullet-none">' + none + '</span>' +
                '<span class="st-bullet-closed">' + closed + '</span>' +
                '<span class="st-bullet-open">' + open + '</span>').prependTo(list);

            //add custom class to list
            if (css) list.addClass(css);

            console.log(list.html());
            //add bullet to all li
            $('li', list).filter(function () {
                return $(this).parent().is('ul');
            }).prepend($('<span class="st-bullet"/>'));

            //expand list on double clicking
            $('.st-bullet', list).dblclick(function () {
                cms.expandAll(list);
            });

            //all list items are closed first
            $('li:has(> ul, > span > ul, > ol, > span > ol)', list).addClass('st-closed').find('.st-bullet').html(closed);
            //li without subitems gets a different bullet and class
            $('li:not(:has(> ul, > span > ul, > ol, > span > ol))', list).addClass('st-no-childs').find('.st-bullet').html(none);

            //only blockify simple links
            $('a', list).filter(function () {
                return $(this).parent().is('li') && $(this).text().replace(/\s/, '') == $(this).parent().clone().children(':not(a)').remove().end().text().replace(/\s/, '');
            }).addClass(block ? 'st-block' : 'st-noblock');

            $('ol > li').each(function () {
                $(this).contents().wrapAll('<span class="st-ol-wrap"/>');
            });

            //clicking a list item
            $('li', list).click(function (e) {
                var had = false,
                    el = $(this),
                    e = e || window.event,
                    t = $(e.target),
                    list = $(this).closest('.st-tree'),
                    a = t.is('a') ? t : t.closest('a');

                //take over handling of links
                if (a.is('a')) {
                    if (a.is('.internalLink')) {
                        if (block) a.closest('li').is('.st-closed').removeClass('st-closed').addClass('st-open').find('st-bullet:first').html(open);
                        return false;
                    } else {
                        if (a.is('.externalLink') || (a.attr('href') || '').indexOf('javascript:') != 0 && a.attr('href') != '#') {
                            window.open(a.attr('href'));
                            return false;
                        }
                    }
                }

                if (list.hasClass('st-all')) {
                    had = true;
                    list.removeClass('st-all');
                    $('ul, ol', list).css('display', '');
                    $('.st-bullet', list).each(function () {
                        var b = $(this),
                            li = b.parent();
                        if (li.is(':not(.st-no-childs)'))
                            b.html(li.is('.st-open') ? open : closed);
                    });
                    el.parents().each(function () {
                        var el = $(this);
                        if (el.is('.st-tree')) return;
                        if (el.is('li')) {
                            el.removeClass('st-closed').addClass('st-open').find('.st-bullet:first').html(open);
                            el.siblings('.st-open').removeClass('st-open').addClass('st-closed').find('.st-bullet:first').html(closed);
                        }
                    });
                    return cms.show(el);
                }

                if (e.altKey) {
                    if (!had) cms.expandAll(list);
                    return cms.show(el);
                }

                //no childs no click
                if (el.hasClass('st-no-childs')) return false;

                //when closed
                if (el.hasClass('st-closed')) {
                    //when siblings are to be collapsed
                    if (collapse) {
                        //do it
                        el.siblings(':not(".st-no-childs")').removeClass('st-open').addClass('st-closed').find('.st-bullet:first').html(closed);
                        if (slide) el.siblings().each(function () {
                            $(this).find('ul, ol').first().css('display', 'none');
                        });
                    }
                    //slide? -> slide open
                    if (slide) el.children('ul,ol').slideDown(duration, function () {
                        $(this).css('display', '');
                    });
                    //open subitems
                    el.removeClass('st-closed').addClass('st-open').find('.st-bullet:first').html(open);
                    //when open
                } else {
                    //close subitems
                    el.removeClass('st-open').addClass('st-closed').find('.st-bullet:first').html(closed);
                    //slide? -> slide to close
                    if (slide) el.children('ul,ol').slideUp(duration, function () {
                        $(this).css('display', '');
                    });
                }
                return cms.show(el);
            });

            css = '';
            $.each(style.split('}'), function (i, s) {
                var r = s.split('{');
                if (!r[1]) return;
                $.each(r[0].split(','), function (i, sel) {
                    css += '.' + listClass + ' ' + sel + ',';
                });
                css = css.substr(0, css.length - 1) + '{' + r[1] + '}';
            });

            //apply custom styles
            setStylesheet(css, 'StyleSheet' + listClass);
        },

        show: function (el) {
            window.scrollTo(0, ensureVisible(el[0]));
            return false;
        },

        expandAll: function (list) {
            list.each(function () {
                l = $(this);
                l.addClass('st-all');
                $('.st-closed', l).find('.st-bullet:first').empty().append(l.find('.st-bullet-open').clone());
                $('ul, ol', l).css('display', '');
            });
        }
    }

    //shadow tiddler for styles
    config.shadowTiddlers.StyleSheetSimpleTree =
    '/*{{{*/\n' +
    '.st-tree ul {\n\tlist-style-type:none;\n\tmargin-left:7px !important;\n\tpadding-left:0 !important;\n}\n' +
    '.st-tree ol {\n\tmargin-left:5px !important;\n\tpadding-left:0 !important;\n}\n' +
    '.st-tree li {\n\tborder:1px solid transparent;\n\tborder-left: 1px solid #eee;\n\tpadding:3px 0 3px 12px;\n\tcursor:pointer;\n}\n' +
    '.st-tree li:hover {\n\tborder-color:#eee;\n\tborder-left-color:#ddd;\n\tbackground:#f3f3f3;\n}\n' +
    '.st-tree ul ul:hover li:hover {\n\tborder-right-color:transparent;\n\tbackground:#f5f5f5}\n' +
    '.st-tree ul ul ul:hover li:hover {\n\tbackground:#f7f7f7}\n' +
    '.st-tree ul ul ul ul:hover li:hover {\n\tbackground:#f9f9f9}\n' +
    '.st-tree ul:hover ul li {\n\tbackground:#fff;\n}\n' +
    '.st-bullet {\n\tdisplay:inline-block;\n\twidth:18px;\n\tmargin-left:-14px;\n\tpadding-left:8px;\n\tbackground-color:transparent;\n\tcolor:#ccc;\n}\n' +
    '.st-tree li:hover > .st-bullet {\n\tcolor:#666;\n}\n' +
    '.st-closed > ul, .st-closed > span > ul, .st-closed > ol, .st-closed > span > ol {\n\tdisplay:none;\n}\n' +
    '.st-tree ol {\n\tlist-style-position:inside;\n}\n' +
    '.st-open > ul,.st-open > ol {\n\tdisplay:block;\n}\n' +
    '.st-closed ul, .st-open ul, .st-closed ol,.st-open ol {\n\tmargin:3px 0 3px 10px;\n}\n' +
    '.st-block {\n\tdisplay:inline-block;\n\twidth:85%;\n\tpadding-left:7px;margin-left:-7px;\n}\n' +
    '.st-noblock {\n\tpadding: 1px 20px 1px 3px;margin-left:-3px;\n}\n' +
    '.st-tree li.st-no-childs, .st-tree dd, .st-tree div {\n\tcursor:default;\n}\n' +
    '.st-tree li div {\n\tpadding-left:10px;\n}\n' +
    '.st-tree ul:hover li.st-closed > .st-bullet {\n\tcolor:#BBB;\n}\n' +
    '.st-all .st-closed ul,.st-all .st-closed ol {\n\tdisplay:block;\n}\n' +
    '.st-tree +br {\n\tdisplay:none;\n}\n' +
    '/*}}}*/';
    store.addNotification("StyleSheetSimpleTree", refreshStyles);

})(jQuery);
//}}}