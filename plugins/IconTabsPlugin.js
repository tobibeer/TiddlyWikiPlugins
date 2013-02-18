/***
|''Name''|IconTabsPlugin|
|''Author''|Tobias Beer|
|''Version''|0.5.1 beta|
|''Description''|extends the tabs macro to replace tabnames with icons|
!Usage
Add {{{icons:}}} after your tabs followed by a parameter specifying the icon-path and an optional css class added to the tabsetWrapper...
{{{
<<tabs
  Tab1
  'Tab1 Tooltip'
  Tab1Source
  Tab2
  'Tab2 Tooltip'
  Tab2##Source
  icons:
  'some/path/%0_thumb.jpg'
  myClass
>>
}}}
The image path is defined with %0 being replaced with the defined tab __contents__ -- any {{{##}}} or {{{::}}} are replaced with {{{__}}}.

For example, for the image for Tab2 would be fetched from {{{some/path/Tab2__Source_thumb.jpg}}}

''Note:'' While there can be two (nested) tabs that have the same __name__, the actual content must be unique, otherwise they will show the same icon!
!Code
***/
//{{{
(function ($) {

    config.macros.tabs.handler_IconTabsPlugin = config.macros.tabs.handler;
    config.macros.tabs.iciconTabConfig = {
        defaultPath: '%0.jpg',
        defaultWrapperClass: 'icontabs',
        defaultIconClass: 'tabicon'
    }
    config.macros.tabs.handler = function (place, macroName, params, wikifier, paramString, tiddler) {
        var iconParams, path,
            cfg = this.iciconTabConfig,
            icons = params.indexOf('icons:');
        if (icons < 4) return;
        else {
            iconParams = params.splice(icons);
            iconParams.shift();
            paramString = '[[' + params.join(']] [[') + ']]';
        }
        config.macros.tabs.handler_IconTabsPlugin.apply(this, arguments);
        if (icons) {
            var path = iconParams[0],
                css = iconParams[1],
                $tabs = $(place.lastChild);

            if (!path) path = cfg.defaultPath;
            $tabs.addClass(cfg.defaultWrapperClass + (css ? ' ' + css : ''));
            $('.tab', $tabs).each(function () {
                var $t = $(this),
                tab = $t.attr('content').replace(/\#\#/, '__').replace(/\:\:/, '__');
                $t.html(
                    '<img src="' + path.format([tab]) +
                       '" title="' + $t.text() +
                       '" class="' + cfg.defaultIconClass + ' icon' + $t.text().replace(/(\s|\W)/mg, '_') +
                    '"/>');
            });
        }
    }

    config.shadowTiddlers['StyleSheetIconTabs'] =
        '/*{{{*/\n' +
        '.tabicon {\n' +
        '   width:24px;\n' +
        '}\n' +
        '.icontabs {\n' +
        '   margin-top:10px;\n' +
        '}\n' +
        '.icontabs .icontabs {\n' +
        '   margin:3px;\n' +
        '}\n' +
        '.icontabs .tabset{\n' +
        '   padding:0;\n' +
        '}\n' +
        '.icontabs .tab {\n' +
        '   outline: 0;\n' +
        '   margin: 0;\n' +
        '   padding: 17px 3px 1px 3px;\n' +
        '   border: 1px solid transparent;\n' +
        '}\n' +
        '.icontabs .tabUnselected {\n' +
        '   background: transparent;\n' +
        '}\n' +
        '.icontabs .tabSelected,\n' +
        '.icontabs .tabSelected:hover,\n' +
        '.icontabs .tabUnselected:hover {\n' +
        '   background: [[ColorPalette::TertiaryPale]];\n' +
        '   border: 1px solid [[ColorPalette::TertiaryLight]];\n' +
        '   border-bottom-color: transparent;\n' +
        '}\n' +
        '/*}}}*/';
    store.addNotification('StyleSheetIconTabs', refreshStyles);
})(jQuery);
//}}}