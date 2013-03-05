/***
|''Name:''|TypeWithMePlugin|
|''Description:''|Provides a toolbar button that lets you create [[etherpad-style|http://de.wikipedia.org/wiki/EtherPad]] documents for any tiddler|
|''Documentation:''|http://tobibeer.tiddlyspace.com/#TypeWithMe|
|''Version:''|0.9.3 (2013-03-05)|
|''Status:''|stable|
|''Author:''|[[Tobias Beer]]|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/TypeWithMePluginSource.js|
|''~CoreVersion:''|Version 2.5.3 or better|
***/
//{{{
(function ($) {
    config.commands.typeWithMe = {
        serviceURL: 'http://willyou.typewith.me/p/%0',
        target: '_blank',
        inline: true,
        iframe: '<html><a href="%0" target="_blank" class="externalLink" style="margin-left:1em;">open pad in new window</a><iframe src="%0" class="frmTypeWithMe"/></html>',
        fmtPrefix: '%date',
        fmtDate: 'YYYY-0MM-0DD',
        text: 'discuss',
        tooltip: 'show typewith.me discussion',

        handler: function (event, src, title) {
            var i, c = config.commands.typeWithMe,
                e = event || window.event,
                el = story.getTiddler(title),
                ts = config.extensions.tiddlyspace,
                tid = store.getTiddler(title),
                doc = [c.fmtPrefix.replace(/%date/, (new Date().formatString(c.fmtDate))), title],
                ty = store.getValue(title, 'typewithme');
            if (ts) doc.unshift(ts.currentSpace.name);
            doc = doc.join('-').replace(/\s/mg, '-');
            if (!tid || !ty) {
                store.saveTiddler(
                title,
                title,
                tid ? tid.text : '',
                tid ? tid.modifier : config.options.txtUserName,
                tid ? tid.modified : new Date(),
                tid ? tid.tags : '',
                merge({ typewithme: doc }, tid ? tid.fields : config.defaultCustomFields));
                if (config.options.chkAutoSave) autoSaveChanges();;
            } else doc = ty;
            url = c.serviceURL.format([doc]);
            if (!e.ctrlKey && c.inline) {
                i = $('.frmTypeWithMe', el);
                if (i[0]) i.parent().parent().remove();
                else {
                    i = $('<span/>').insertBefore($(el).find('.viewer').first());
                    wikify(c.iframe.format([url]), i[0]);
                }
            } else window.open(url, c.target);
        }
    }
})(jQuery);
//}}}