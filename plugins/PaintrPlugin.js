/***
|''Name''|PaintrPlugin|
|''Description''|allows to conditionally style internal links, tag buttons, titles and entire tiddlers depending on tiddler tags or title|
|''Documentation''|http://paintr.tiddlyspace.com|
|''Configuration''|PaintrConfig|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Version''|2.1.0 (2013-10-04)|
|''CoreVersion''|2.5.2|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/PaintrPlugin.js|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
!Code
***/
//{{{
(function($){

config.shadowTiddlers.PaintrConfig = [
"Need help with PaintrPlugin? [[Visit the documentation!|http://paintr.tiddlyspace.com]]",
"!Defaults",
"''what:'' links tags titles",
"''exclude:'' no-paint",
"''defaultClass:'' paintr",
"''titleSelector:'' div.title",
"''allow:''",
"''transclude:'' tiddler section",
"''nopaint:'' .nopaint, .header",
"''inside:''",
"!StyleSheet",
"/* demo styles, can be safely deleted or adapted*/",
"/*{{{*/",
".viewer .paintr.tiddlyLink {padding:0 2px; margin: 0 -2px;}\n",
".demo, .demo.title {color:red !important;}",
"a.demo:hover {background:red !important; color:white !important;}",
".tiddler.beach, .beach.paintr-transclude {background:lightyellow;}",
".beach.paintr-transclude {display:block;padding:10px;}",
".beach .tagInfo {background:#eef;}",
"/*}}}*/",
"!Definitions",
"systemConfig + GettingStarted demo",
"----",
"tiddler=PaintrConfig title:demo tiddler:beach"].join('\n');

//the extension
var me = config.macros.paint = {

    //default fallbacks
    defaults: {
        what: 'links tags titles',
        exclude: 'no-paint',
        defaultClass: 'paintr',
        titleSelector: 'div.title',
        allow: '',
        transclude: 'tiddler section',
        nopaint: '.nopaint .header',
        inside: '',
        when:''
    },

    //macro handler
    handler: function (place, macroName, params, wikifier, paramString, tiddler) {

        //get macro
        macroName = params[1];

        var
            //remember place
            where = place,
            //get class
            c = params[0];

        //no macro
        if(!config.macros[macroName]){
            //show macro error
            createTiddlyError(
                place,
                config.messages.macroError.format([macroName]),
                config.messages.macroErrorDetails.format([
                    macroName,
                    config.messages.missingMacro
            ]));
            //out
            return;
        }
        //remove first two params
        params.splice(0,2);
        //get new paramString as rest
        paramString = params.join(' ');

        //create pseudo-place
        place = $('<span/>')[0];

        //run macro
        config.macros[macroName].handler(place, macroName, params, wikifier, paramString, tiddler);
        //take place as
        place =
            //just one child?
            $(place).children().length == 1 ?
            //take it
            $(place).children(':first') :
            //otherwise, take the wrapper
            $(place);

        //take it
        $(place)
            //and add it to the original place
            .appendTo(where)
            //either with nopaint when the class was "!" or with the given class
            .addClass(c == '!' ? 'nopaint' : c || '');
    },

    /* paints links, tags, titles, tiddlers and transclusion
            el: dom element for which it was triggered
            id: tag or tiddler for which it was triggered
          what: type of the element, e.g. 'link', 'tag', 'title' or 'tiddler'
    transclude: type of transclusion, e.g. 'tiddler', 'section' or 'slice' or undefined */
    setStyle: function (el, id, what, transclude) {
        var
            //init vars
            allow, c = '', p, px = [],
            //global defaults
            D = me.defaults,
            //get exclude as array
            ex = D.exclude.readBracketedList(),
            //get tiddler object for
            t = store.getTiddler(
                //tiddler within which the element is placed
                $(el).parents('[tiddler]').last().attr('tiddler') || ''
            );

        if (
            //when inside nopaint container OR
            $(el).closest(D.nopaint).length ||
            //when there is an outer tiddler object to the element AND
            t && (
                //it's excluded OR
                ex.contains(t.title) ||
                //has an exclude tag
                t.tags && t.tags.containsAny(ex)
        //do nothing
        ) ) return;

        //get the definition tiddler
        t = store.getTiddler(id);

        //loop definitions
        me.definitions.map(function(def){
            //when
            if(
                (
                    //MATCHING DEF

                    //tid is the def id OR
                    id == def.id ||
                    //tid is thus tagged (except for single tiddler)
                    t && t.tags && t.tags.contains(def.id) && !def.single

                //AND
                ) && (
                    //ALLOWED

                    //when not empty AND
                    allow !== '' &&
                    (
                        //no match yet OR
                        !allow ||
                        //all allowed OR
                        allow == '*' ||
                        //in allow
                        allow.contains(def.id)
                    )

                //AND
                ) && (
                    //TRANSCLUSION

                    //not defined OR
                    !transclude ||
                    //allowed for given type
                    def.transclude.indexOf(transclude) >= 0
    
                //AND
                ) && (
                    //INSIDE CONTAINER

                    //not defined OR
                    !def.inside ||
                    //within the given container
                    $(el).closest(def.inside).length
                
                //AND
                ) && (
                    //WHEN CUSTOM FUNCTION SAYS SO
                    
                    //not defined OR
                    !def.when ||
                    //not a function and truthy OR
                    typeof window[def.when] != 'function' && window[def.when] ||
                    //a function returning a truthy value
                    typeof window[def.when] == 'function' && window[def.when](el, id, what, transclude, def)
                )

            ){
                //init <allow> when not set or when all allowed
                //when '*', any further matching allow overwrites previous
                if(allow == undefined || allow == '*') {
                    //get allowed for def
                    allow = def.allow;
                    //when allow is list of definition ids
                    if(allow && allow != '*')
                        //turn into array
                        allow = allow.readBracketedList();
                }
                //add class to final class string
                c += def[what] + ' ';
            }
        });

        //if there are any classes => apply
        if(c) $(el).addClass(
            //defined classes
            c +
            //default paintr class
            D.defaultClass +
            //any applicable transclusion classes
            (transclude ? ' paintr-transclude paintr-' + transclude : '')
        );
    },

    updatePaintr : function(){
        //global defaults
        var D = me.defaults;
        //init definitions, allows and classes
        me.definitions = [];

        //loop defaults
        $.each(D,function(def){
            //try to read slice from config tiddler
            var d = $.trim(store.getTiddlerText( 'PaintrConfig::' + def) || '');
            //if existing, set global default accordingly
            if(d) D[def] = d;
        });
        //get config and split by horizontal rules
        (store.getTiddlerText('PaintrConfig##Definitions') || '').split('\n----\n')
        //loop definition blocks
        .map(function(d) {
            var a, all, def, j=[], qi=0, t, tid;

            //skip blank or block starting with blanks (can be comments)
            if(!d.length || ' ' == d.substr(0,1)) return true;

            //parse params for block
            d = d.parseParams('anon', null, true);

            //get simple params
            a = d[0]['anon'];

            //no simple params? => next
            if(!a) return true;

            //while joined
            while('+' == a[qi+1]){
                //add tid
                j.pushUnique(a[qi]);
                //next pair
                qi = qi + 2;
            }

            //join last tid 
            j.pushUnique(a[qi]);

            //loop joined
            j.map(function(tid){
                //if starts with tiddler=, use single tiddler
                t = 0 == tid.indexOf('tiddler=');

                //create new definition object
                def = {
                    //add id as tiddler or tag
                    id: tid.substr(t ? 8 : 0),
                    //add allow index
                    allow: getParam( d, 'allow', D.allow ),
                    //remember if for single tiddler
                    single: t,
                    //transclusion switches from config or global defaults
                    transclude: getParam(d, 'transclude', D.transclude),
                    //only paint when inside this selector
                    inside: getParam(d, 'inside', D.inside),
                    //only paint when custom function defined and returns true
                    when: getParam(d, 'when', D.when),
                };

                //get class for all things to be painted...
                //either as named param or as (second) unnamed param or empty
                all = getParam( d, 'all', a[qi + 1] || '');

                //loop elements
                ['link','tag','title','tiddler'].map(function(what){
                    //set class for element
                    def[what] =
                        //get from params otherwise all 
                        getParam( d, what,
                            //only when globally allowed, fall back to global class(es)
                            0 > D.what.indexOf(what) ? '' : all
                        )
                });

                //add definition to global index
                me.definitions.push(def);
            }); 
        });

        //remove old styles
        removeStyleSheet('PaintrStyles');

        //set new styles
        setStylesheet(store.getTiddlerText('PaintrConfig##StyleSheet'), 'PaintrStyles');
    }
}

//initial index
me.updatePaintr();

createTiddlyLinkPAINTR = createTiddlyLink;
createTiddlyLink = function (place, title, includeText, className, isStatic, linkedFromTiddler, noToggle) {
    var b = createTiddlyLinkPAINTR.apply(this, arguments);
    me.setStyle(b, title, 'link');
    return b;
}

createTagButtonPAINTR = createTagButton;
createTagButton = function (place, tag, excludeTiddler, title, tooltip) {
    var b = createTagButtonPAINTR.apply(this, arguments);
    addClass(b, store.getTaggedTiddlers(tag).length > 0 ? 'hastags' : 'hasnotags');
    me.setStyle(b, tag, 'tag');
    return b;
}

config.macros.allTags.handlerPAINTR = config.macros.allTags.handler;
config.macros.allTags.handler = function (place, macroName, params) {
    config.macros.allTags.handlerPAINTR.apply(this, arguments);
    $('.button, .tiddlyLink', place).each(function (i) {
        var btn = $(this),
            title = btn.attr('tiddlyLink');

        if (title)
            me.setStyle(this, title, 'link');
        else if(
            btn.hasClass('hastags') ||
            btn.hasClass('hasnotags')
        )
            me.setStyle(this, btn.attr('tag'), 'tag');
    });
};

Story.prototype.refreshTiddlerPAINTR = Story.prototype.refreshTiddler;
Story.prototype.refreshTiddler = function (title, template, force, customFields, defaultText) {
    var el = Story.prototype.refreshTiddlerPAINTR.apply(this, arguments);

    //paint the title for this tiddler
    me.setStyle( $(el).find(me.defaults.titleSelector)[0], title, 'title');

    //paint the tiddler
    me.setStyle( $(el), title, 'tiddler');

    //loop all transclusions
    $('[refresh="content"]', $(el)).each(function(){
        var tid, pos,
            //default: tiddler transclusion
            type = 'tiddler',
            //the transcluded element
            $t = $(this);

        //get tiddler reference
        tid = $t.attr('tiddler') || '';
        //no tid? => do nothing
        if(!tid) return true;

        //find section separator
        pos = tid.indexOf('##');
        //section?
        if(pos >= 0) {
            //get tid
            tid = tid.substr(0,pos);
            //set transclusion type
            type ='section';
        //when no section
        } else {
            //find slice separator
            pos = tid.indexOf('::');
            //slice?
            if(pos >= 0) {
                //get tid
                tid = tid.substr(0,pos);
                //set transclusion type
                type ='slice';
            }
        }
        //color the transclusion
        me.setStyle(this, tid, 'tiddler', type);
    })
    return el;
}

//hijack save tiddler
TiddlyWiki.prototype.saveTiddlerPAINTR = TiddlyWiki.prototype.saveTiddler;
TiddlyWiki.prototype.saveTiddler = function (title, newTitle, newBody, modifier, modified, tags, fields, clearChangeCount, created, creator) {
    //invoke core and fetch result
    result = this.saveTiddlerPAINTR.apply(this, arguments);
    //changed config?
    if(newTitle == 'PaintrConfig'){
        //update config
        me.updatePaintr();
        //refresh all
        story.refreshAllTiddlers(true);
    }
    //return
    return result;
}


})(jQuery);
//}}}