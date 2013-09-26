/***
|''Name''|ColoredLinksPlugin|
|''Description''|adds color to tiddlyLinks depending on the tag assigned to the corresponding tiddler|
|''Documentation''|http://ColoredLinks.tiddlyspot.com|
|''Version''|1.1.0 (2013-09-25)|
|''Author''|[[TobiasBeer]]|
|''CoreVersion''|2.5.2|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/ColoredLinksPlugin.js|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
!Code
***/
//{{{
(function($){

var me = config.extensions.coloredLinks = {
    colorTags: true,
    colorTitles: true,
    titleSelector: 'div.title',
    excludeTagged: 'noColor',

    color: function (btn, title, takeTitle) {
        var bd, f, l = '', t, ta, ti = '', tg,
            e = btn,
            c = config.options;

        if (takeTitle) {
            ti = title;
        } else {
            do {
                ti = e && e.getAttribute ? e.getAttribute('tiddler') : null;
                l = ti ? e : l;
                e = e.parentNode;
            } while (e);
            ti = l ? l.getAttribute('tiddler') : '';
        }
        t = store.getTiddler(ti);
        if (t && t.tags.containsAny(this.excludeTagged.readBracketedList())) return;

        t = store.getTiddler(title);
        //check tiddler tags
        if (t && t.tags) {
            ta = 0;

            while (!tg && ta < t.tags.length) {
                f = store.getValue(t.tags[ta], 'tagcolor');
                tg = f ? t.tags[ta] : '';
                ta++;
            }
            if (!tg) tg = t.tags[0]; //none? -> take first
        }
        //none found ?-> check tiddler itself
        f = f ? f : store.getValue(title, 'tagcolor');
        //when tags to be colored, take title
        if (!tg && this.colorTags && f) tg = title;
        if (f) {
            f = f.replace(/\s*;\s*/g, '","').replace(/\s*:\s*/g, '":"').trim();
            if (f.substr(f.length - 2, 2) == ',"') f = f.substr(0, f.length - 2);
            f = '{"' + f + '}';
            $(btn).css($.parseJSON(f)).addClass('coloredLink');
        }
        //always assign firsttag accordingly
        if (tg)$(btn).attr('firsttag', tg);
    }
}

createTiddlyLink_COLOR = createTiddlyLink;
createTiddlyLink = function (place, title, includeText, className, isStatic, linkedFromTiddler, noToggle) {
    var b = createTiddlyLink_COLOR.apply(this, arguments);
    me.color(b, title);
    return b;
}

createTagButton_COLOR = createTagButton;
createTagButton = function (place, tag, excludeTiddler, title, tooltip) {
    var b = createTagButton_COLOR.apply(this, arguments);
    addClass(b, store.getTaggedTiddlers(tag).length > 0 ? 'hastags' : 'hasnotags');
    me.color(b, tag);
    return b;
}

config.macros.allTags.handler_COLOR = config.macros.allTags.handler;
config.macros.allTags.handler = function (place, macroName, params) {
    config.macros.allTags.handler_COLOR.apply(this, arguments);
    $('.button, .tiddlyLink', place).each(function (i) {
        var btn = $(this),
            title = btn.attr('tiddlyLink');
        if (
            !title && btn.hasClass('hastags') ||
            btn.hasClass('hasnotags')
        )
            title = btn.attr('tag');

        if (title)
            me.color(this, title);
    });
};


Story.prototype.refreshTiddler_COLOR = Story.prototype.refreshTiddler;
Story.prototype.refreshTiddler = function (title, template, force, customFields, defaultText) {
    var el = Story.prototype.refreshTiddler_COLOR.apply(this, arguments);
    //titles to be colored?
    if (me.colorTitles)
        //color it
        me.color(
            //the title
            $(el).find(me.titleSelector)[0],
            title,
            true
        );
    return el;
};

})(jQuery);
//}}}