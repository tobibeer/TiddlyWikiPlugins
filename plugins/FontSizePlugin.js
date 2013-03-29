/***
|Name|FontSizePlugin|
|Created by|[[Tobias Beer|http://tobibeer.tiddlyspace.com]] / branched from [[Saq Imtiaz' code|http://tiddlywiki.squize.org/#FontSizePlugin]]|
|Source|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/FontSizePlugin.js|
|Documentation|http://fontsize.tiddlyspace.com|
|Version|1.1.0|
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
    config.fontsize = {
        //where to apply fontsize => use '.tiddler .viewer' for tiddler contents only
        selector: 'body',

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

    //shortcut
    var cfg = config.fontsize;

    //init option
    if (!config.options.txtFontSize) {
        //set to default
        config.options.txtFontSize = cfg.defaultSize;
        //save cookie
        saveOptionCookie('txtFontSize');
    }

    //other styles
    config.shadowTiddlers.StyleSheetFontSize =
        '.font-controls {display:block;}\n' +
        '#sidebarOptions .font-controls {float:right;clear:none;}' +
        '#contentWrapper .font-controls-label {display:block;float:left;}\n' +
        '#contentWrapper .font-controls .button {display:block; float:left; padding: 0 0.2em; margin:0 0.2em; width:1em; text-align:center !important}\n';

    //update on changes
    store.addNotification('StyleSheetFontSize', refreshStyles);

    //the macro
    config.macros.fontsize = {
        //the handler
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            var controls = createTiddlyElement(place, "span", null, "font-controls");
            if (params[0])
                createTiddlyText(
                    createTiddlyElement(controls, "span", null, "font-controls-label"),
                    params[0]
                );

            createTiddlyButton(controls, cfg.increase, cfg.tooltipIncrease, this.set, 'button font-increase');
            createTiddlyButton(controls, cfg.reset, cfg.tooltipReset, this.set, 'button font-reset');
            createTiddlyButton(controls, cfg.decrease, cfg.tooltipDecrease, this.set, 'button font-decrease');
            setStylesheet(cfg.selector + ' {font-size:' + config.options.txtFontSize + '%;}', 'StylesFontSize');
        },

        //sets the fontsize
        set: function () {
            var btn = $(this);
            if (btn.hasClass('font-increase')) {
                if (config.options.txtFontSize < cfg.maxSize)
                    config.options.txtFontSize = (config.options.txtFontSize * 1) + cfg.stepSize;
            }
            if (btn.hasClass('font-decrease')) {
                if (config.options.txtFontSize > cfg.minSize)
                    config.options.txtFontSize = (config.options.txtFontSize * 1) - cfg.stepSize;
            }
            if (btn.hasClass('font-reset')) {
                config.options.txtFontSize = cfg.defaultSize;
            }
            //save cookie
            saveOptionCookie("txtFontSize");
            //update styles
            setStylesheet(cfg.fmtCSS.format([cfg.selector, config.options.txtFontSize]), 'StylesFontSize');
        }
    }

    //startup paramifier 'font'
    config.paramifiers.font = {
        onstart: function (size) {
            //save and set font
            config.options.txtFontSize = size;
            config.macros.fontsize.set();
        }
    }
})(jQuery);
//}}}