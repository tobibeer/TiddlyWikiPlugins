/***
|''Name:''|TabScrollMacro|
|''Description:''|makes the vertical tabset in SideBarTabs in ~TiddlySpace scrollable|
|''Documentation:''|http://tobibeer.tiddlyspace.com/#TabScroll|
|''Author:''|[[Tobias Beer]]|
|''Version:''|1.0.2 (2010-10-09)|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/TabScrollMacro.js|
|''Original Idea''|http://valums.com/vertical-scrolling-menu|
|''~CoreVersion:''|version 2.6 or better|
***/
//{{{
(function ($) {

    config.macros.tabscroll = {
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            el = $('#sidebarTabs').empty();
            wikify(
                store.getTiddlerText('SideBarTabs##TABS').format(
                    [
                        store.getTiddlerText('SideBarTools') ? store.getTiddlerText('SideBarTabs##TOOLS') : '',
                        store.getTiddlerText('TabFollowing') ? store.getTiddlerText('SideBarTabs##FOLLOW') : ''
                    ]
                ), place);
            var scroll = $('#sidebarTabs').find('.tabset').addClass('tabScroll');
            scroll.wrap('<div class="tabScrollWrapper" />');

            var wrap = scroll.parent(),
                i = 100,
                ww = wrap.width(),
                wh = wrap.height(),
                sh = scroll.outerHeight() + 2 * i;

            wrap.mousemove(function (e) {
                var wo = wrap.offset(),
                    top = (e.pageY - wo.top) * (sh - wh) / wh - i;
                if (top < 0) top = 0;
                wrap.scrollTop(top);
            });
        }
    }

    //rewritte "jQuery-Style" ...needed to create an extra wrapper around the tabset
    config.macros.tabs.switchTab = function (tabset, tab) {
        var $sel, $tab, ti,
            $ts = $(tabset),
            $wr = $ts.closest('.tabsetWrapper'),
            co = $ts.attr("cookie");
        $ts.children('.tab').each(function () {
            var t = $(this), b = t.attr('tab') == tab;
            if (b) $tab = t;
            t.attr('class', 'tab ' + (b ? 'tabSelected' : 'tabUnselected'));
        });

        if ($tab) {
            $sel = $wr.children('.tabContents');
            if ($sel[0]) $sel.empty();
            else $sel = $(createTiddlyElement($wr[0], 'div', null, 'tabContents'));
            ti = $tab.attr("content");
            wikify(store.getTiddlerText(ti), $sel[0], null, store.getTiddler(ti));
            if (co) { config.options[co] = tab; saveOptionCookie(co); }
        }
    };

    config.shadowTiddlers.StyleSheetTabScroll = '/*{{{*/\n' +
        '#sidebarTabs .tabsetWrapper .tabset .tab {display:block;padding:7px 7px 7px 3px;text-align:right;}\n' +
        '#sidebarTabs .tabsetWrapper .tabset,' +
        '.tabScroll{padding:15px 0;display:block;height:auto;padding:0;width:6em;}\n' +
        '.tabScrollWrapper{position:relative;overflow:hidden;display:block;' +
        'height:220px;width:6em;float:left;top:0;}\n/*}}}*/';
    store.addNotification("StyleSheetTabScroll", refreshStyles);

})(jQuery);
//}}}