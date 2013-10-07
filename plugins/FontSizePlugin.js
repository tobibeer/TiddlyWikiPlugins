/***
|Name|FontSizePlugin|
|Created by|[[Tobias Beer|http://tobibeer.tiddlyspace.com]] / fork of [[Saq Imtiaz' code|http://tiddlywiki.squize.org/#FontSizePlugin]]|
|Source|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/FontSizePlugin.js|
|Documentation|http://fontsize.tiddlyspace.com|
|Version|1.1.5 (2013-10-07)|
|Core|2.5.2|
!Usage
{{{
<<fontsize>>
}}}
<<fontsize>>
!Code
***/
//{{{
(function ($) {

var co = config.options,
    cfg = config.fontsize = {
    //where to apply fontsize => use '.tiddler .viewer' for tiddler contents only
    selector: '#contentWrapper',

    //all sizes in %
    defaultSize: 100,
    maxSize: 200,
    minSize: 40,
    stepSize: 10,

    //button labels
    increase: '+',
    decrease: '-',
    reset: '=',

    //button tooltips
    tooltipIncrease: 'increase font-size',
    tooltipDecrease: 'decrease font-size',
    tooltipReset: 'reset font-size',

    //format for styles
    fmtCSS: '%0 {font-size: %1%;}'
}

//init option
if (!co.txtFontSize) {
    //set to default
    co.txtFontSize = cfg.defaultSize;
    //save cookie
    saveOptionCookie('txtFontSize');
}

//the macro
config.macros.fontsize = {
    //the handler
    handler: function (place, macroName, params, wikifier, paramString, tiddler) {
        var controls = createTiddlyElement(place, "div", null, "font-controls");
        if (params[0])
            createTiddlyText(
                createTiddlyElement(controls, "span", null, "font-controls-label"),
                params[0]
            );

        createTiddlyButton(controls, cfg.increase, cfg.tooltipIncrease, this.set, 'button font-increase');
        createTiddlyButton(controls, cfg.reset, cfg.tooltipReset, this.set, 'button font-reset');
        createTiddlyButton(controls, cfg.decrease, cfg.tooltipDecrease, this.set, 'button font-decrease');
        setStylesheet(cfg.selector + ' {font-size:' + co.txtFontSize + '%;}', 'StylesFontSize');
    },

    //sets the fontsize
    set: function () {
        var btn = $(this),
            f = parseInt(co.txtFontSize);
        if (btn.hasClass('font-increase')) {
            if (f < cfg.maxSize)
                co.txtFontSize = (f * 1) + cfg.stepSize;
        }
        if (btn.hasClass('font-decrease')) {
            if (f > cfg.minSize)
                co.txtFontSize = (f * 1) - cfg.stepSize;
        }
        if (btn.hasClass('font-reset')) {
            co.txtFontSize = cfg.defaultSize;
        }
        //save cookie
        saveOptionCookie("txtFontSize");
        //update styles
        setStylesheet(cfg.fmtCSS.format([cfg.selector, co.txtFontSize]), 'StylesFontSize');
    }
}

//startup paramifier 'font'
config.paramifiers.font = {
    onstart: function (size) {
        //save and set font
        co.txtFontSize = size;
        config.macros.fontsize.set();
    }
}

//other styles
config.shadowTiddlers.StyleSheetFontSize = [
'/*{{{*/',
'#sidebarOptions .font-controls {',
'float:right;clear:none;',
'}',
'#contentWrapper .font-controls-label {',
'display:block;float:left;',
'}',
'#contentWrapper .font-controls .button {',
'display:block; float:left;',
'padding: 0 0.2em; margin:0;',
'width:1em; text-align:center !important',
'}',
'/*}}}*/'].join('\n');

//update on changes
store.addNotification('StyleSheetFontSize', refreshStyles);

})(jQuery);
//}}}