/***
|''Name''|CustomTitlePlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|display a different title than is actually used as the tiddler title|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/CustomTitlePlugin.js|
|''Documentation''|http://customtitle.tiddlyspace.com|
|''Version''|0.1 alpha|
|''~CoreVersion''|2.5.1|
|''License''|Creative Commons 3.0|
!Code
***/
/*{{{*/

(function ($) {
    //Hijack core view macro
    config.macros.view.handler_CustomTitle = config.macros.view.handler;

    config.macros.view.customTitle = 'customtitle';

    //override view macro
    config.macros.view.handler = function (place, macroName, params, wikifier, paramString, tiddler) {
        //get field to be viewed
        var core, custom, handler, type,
            what = params[0];

        //when title field and custom title required and this is a tiddler
        if (what == 'title' && this.customTitle != undefined && tiddler instanceof Tiddler) {
            //get default core title
            core = store.getValue(tiddler, what);
            //see if we can get the custom title
            custom = store.getValue(tiddler, this.customTitle);
            //set custom to core when undefined
            if (!custom) custom = core;
            //get the view type
            type = params[1];
            //none given or first param is named
            if (!type || type.indexOf(':') > 0)
                //use default view
                type = config.macros.view.defaultView;
            //get the handler
            handler = config.macros.view.views[type];
            //if there is a handler
            if (handler) {
                //render the custom title
                handler((type == 'link' ? core : custom), place, params, wikifier, paramString, tiddler);
                //when creating a link
                if (type == 'link') {
                    //fix displayed title
                    $(place.lastChild).empty().html(custom);
                }
            }
            //done
            return;
        }

        //nothing happened so far? => call core view handler
        config.macros.view.handler_CustomTitle.apply(this, arguments);
    };

    /* TODO: FAILS AT THE MOMENT, NO IDEA WHY 
    //hijack createTiddlyLink
    createTiddlyLink_CustomTitle = createTiddlyLink;
    //overwrite core function
    createTiddlyLink = function (place, title, includeText, className, isStatic, linkedFromTiddler, noToggle) {
        //if there is no such tiddler
        if (!store.fetchTiddler(title)) {
            //take title as custom title or as is
            title = window.customTitles[title] || title;
        }
        //call core function
        createTiddlyLink_CustomTitle.apply(this, arguments);
    }
    */

    //create global index for custom titles
    window.customTitles = {};
    //get all custom titles
    store.forEachTiddler(function (title) {
        //get custom title
        var custom = store.getValue(title, config.macros.view.customTitle);
        //if it exists => add to index
        if (custom) window.customTitles[custom] = title;
    });

})(jQuery);
/*}}}*/