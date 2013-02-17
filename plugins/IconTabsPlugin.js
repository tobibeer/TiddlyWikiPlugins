/***
|''Name''|IconTabsPlugin|
|''Author''|Tobias Beer|
|''Version''|0.5 beta|
|''Description''|extends the tabs macro to replace tabnames with icons|
!Usage
Add {{{icontabs:}}} after your tabs followed by the icon-path...
{{{
<<tabs
  Tab1
  'Tab1 Tooltip'
  Tab1Source
  Tab2
  'Tab2 Tooltip'
  Tab2##Source
  tabicons:
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
    config.macros.tabs.handler = function (place, macroName, params, wikifier, paramString, tiddler) {
        var iconParams, path,
            icons = params.indexOf('icontabs:');
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
            $tabs.addClass('icontabs ' + css);
            $('.tab', $tabs).each(function () {
                var $t = $(this),
                tab = $t.attr('content').replace(/\#\#/, '__').replace(/\:\:/, '__');
                $t.html('<img src="' + path.format([tab]) + '" title="' + $t.text() + '" class="tabicon tabicon' + $t.text().replace(/(\s|\W)/mg, '_') + '"/>');
            });
        }
    }

})(jQuery);
//}}}