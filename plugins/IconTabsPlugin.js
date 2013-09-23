/***
|''Name''|IconTabsPlugin|
|''Description''|extends the tabs macro to replace tabnames with icons|
|''Documentation''|http://icontabs.tiddlyspace.com|
|''Author''|Tobias Beer|
|''Version''|1.0.3|
|''CoreVersion''|2.6.1|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/IconTabsPlugin.js|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
!Code
***/
//{{{
(function ($) {

    config.macros.tabs.handler_IconTabsPlugin = config.macros.tabs.handler;
    config.macros.tabs.IconTabsConfig = {
        defaultPath: '%0.gif',
        defaultWrapperClass: 'iconTabs',
        defaultIconClass: 'tabIcon',
        hSpace: '20px',
        vSpace: '20px'
    }
    config.macros.tabs.handler = function (place, macroName, params, wikifier, paramString, tiddler) {
        var arrSpacer = [], hspace, icons, iconParams, next, p=0, pa, pal, path,
            cfg = this.IconTabsConfig;
        //loop params
        while(p < params.length) {
            //get param
            pa = params[p];
            //hidden on readonly?
            if (pa.indexOf('--') == 0) {
                //when on readOnly
                if (readOnly) {
                    //get param
                    pal = pa.substr(2).toLowerCase();
                    //remove from params, either spacer or set
                    params.splice(p, pal == 'hspace' || pal == 'vspace' ? 1 : 3);
                    //next
                    continue;
                //not on readOnly
                } else {
                    //remove from param
                    params[p] = pa = pa.substr(2);
                }
            }

            //get param as lowercase
            pal = pa.toLowerCase();
            
            //is spacer
            if(pal == 'hspace' || pal == 'vspace'){
                //remember if horizontal space
                hspace = pal == 'hspace';
                //remove spacer
                params.splice(p, 1);
                //get next param
                next = params[p];
                //add if existing
                if(next) arrSpacer.push(next.replace(/^\-{2}/,''));
                //next param
                continue;
            }

            //next params
            p++;
        }
        icons = params.indexOf('icons:');
        if (icons > 0) {
            iconParams = params.splice(icons);
            iconParams.shift();
            paramString = '[[' + params.join(']] [[') + ']]';
        }
        config.macros.tabs.handler_IconTabsPlugin.apply(this, arguments);
        if (icons > 0) {
            var path = iconParams[0],
                css = iconParams[1],
                space = iconParams[2],
                $tabs = $(place.lastChild);

            if (!path) path = cfg.defaultPath;
            $tabs.addClass(cfg.defaultWrapperClass + (css ? ' ' + css : ''));
        }
        $('.tab', $tabs).each(function () {
            var img,
                $t = $(this),
                txt = $t.text().trim(),
                tab = $t.attr('content').replace(/\#\#/, '__').replace(/\:\:/, '__');
            if (icons > 0) {
                //check for AttachFormatterPlugin image
                img = store.getTiddlerText(path.format([tab]) + '##data');
                img = img ? img : store.getTiddlerText(path.format([tab]) + '##file');
                img = img ? img : store.getTiddlerText(path.format([tab]) + '##url');
                $t.html(
                '<img src="' + (img ? img : path.format([tab])) +
                    '" class="' + cfg.defaultIconClass + (txt ? ' icon' + txt.trim().replace(/(\s|\W)/mg, '_') : '') +
                '"/>');
            }
            if (arrSpacer.contains(txt)) {
                $t.css(
                        'margin-' + (hspace ? 'left' : 'top'),
                        space ? space : (hspace ? cfg.hSpace : cfg.vSpace)
                );
            }
        });
    }

    config.shadowTiddlers['StyleSheetIconTabs'] =
        '/*{{{*/\n' +
        '.tabIcon {\n' +
        '   width:28px;\n' +
        '   height:28px;\n' +
        '   margin:3px 3px 0 3px;\n' +
        '}\n' +
        '.iconTabs {\n' +
        '   margin-top:10px;\n' +
        '}\n' +
        '.iconTabs .iconTabs {\n' +
        '   margin:3px;\n' +
        '}\n' +
        '.iconTabs .tabset{\n' +
        '   padding:0;\n' +
        '}\n' +
        '.iconTabs .tab {\n' +
        '   outline: 0;\n' +
        '   margin: 0;\n' +
        '   padding: 22px 0 1px 0;\n' +
        '   border: 1px solid transparent;\n' +
        '}\n' +
        '.iconTabs .tabUnselected {\n' +
        '   background: transparent;\n' +
        '}\n' +
        '.iconTabs .tabSelected,\n' +
        '.iconTabs .tabSelected:hover,\n' +
        '.iconTabs .tabUnselected:hover {\n' +
        '   background: [[ColorPalette::TertiaryPale]];\n' +
        '   border: 1px solid [[ColorPalette::TertiaryLight]];\n' +
        '   border-bottom-color: transparent;\n' +
        '}\n' +
        '.iconTabs .spacer {\n' +
        '   margin-left: 20px;\n' +
        '}\n' +
        '/*}}}*/';
    store.addNotification('StyleSheetIconTabs', refreshStyles);
})(jQuery);
//}}}