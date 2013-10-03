/***
|''Name''|PaintrPlugin|
|''Description''|allows to conditionally style internal links, tag buttons, titles and entire tiddlers depending on tiddler tags or title|
|''Documentation''|http://paintr.tiddlyspace.com|
|''Configuration''|PaintrConfig|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Version''|2.0.0 (2013-10-02)|
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
var me = config.extensions.paintr = {

    //the paint config tiddler
    config: 'PaintrConfig',

    //default fallbacks
    what: 'links tags titles',
    exclude: 'no-paint',
    defaultClass: 'paintr',
    titleSelector: 'div.title',
    transclude: 'tiddler section',
    allow: '',

    //function painting links, tags and titles
    paint: function (el, tid, what, transclude) {
        var
            //init vars
            c = '', p, px = [], allow,
            //get exclude as array
            ex = me.exclude.readBracketedList(),
            //find outer tiddler to element
            ti = $(el).parents('[tiddler]').last().attr('tiddler') || '',
            //get outer tiddler object
            t = store.getTiddler(ti);

        //if there is an outer tiddler object to the element
        if ( t && (
                //and it's excluded OR
                ex.contains(t.title) ||
                //has an exclude tag
                t.tags && t.tags.containsAny(ex)
        //do nothing
        ) ) return;

        //get the tiddler
        t = store.getTiddler(tid);

        //loop definitions
        me.definitions.map(function(def, i){
            var
                //the config for the definition
                cD = me.classes[def],
                //whether individual tiddler to be painted
                single = cD['single'],
                //allowed transclusion types
                types = cD['transclude'];

            //when
            if(
                (
                    //allowed

                    //when not empty AND
                    allow !== '' &&
                    (
                        //no match yet OR
                        !allow ||
                        //all allowed OR
                        allow == '*' ||
                        //in allow
                        allow.contains(def)
                    )

                // AND
                ) && (
                    //matching def

                    //when this is the def tid OR
                    tid == def ||
                    //when tid is thus tagged (except for single tiddler 
                    t && t.tags && t.tags.contains(def) && !single
    
                //AND
                ) && (
                    //transclusion allowed

                    //when not transcluded OR
                    !transclude ||
                    //transclusion allowed for type
                    types.indexOf(transclude) >= 0
                )
            ){
                //init allow when not set or when all allowed (next overwrites previous)
                if(allow == undefined || allow == '*') {
                    //get allowed for def
                    allow = me.allowed[def];
                    //when allow is list of definitions
                    if(allow && allow != '*')
                        //turn into array
                        allow = allow.readBracketedList();
                }
                //add to classes
                c += cD[what] + ' ';
            }
        });

        //if there are any classes => apply
        if(c) $(el).addClass(
            //defined classes
            c +
            //default class
            me.defaultClass +
            //transpainted if applicable
            (transclude ? ' paintr-transclude paintr-' + transclude : '')
        );
    },

    updatePaintr : function(){ 
        //init definitions, allows and classes
        me.definitions = [];
        me.allowed = {};
        me.classes = {};

        //loop defaults
        ['what', 'exclude', 'defaultClass', 'titleSelector', 'allow', 'transclude']
        .map(function(def){
            //try to read slice from config tiddler
            var cfg = $.trim(store.getTiddlerText(me.config + '::' + def) || '');
            //if existing, set global config accordingly
            if(cfg) me[def] = cfg;
        });

        //get config and split by horizontal rules
        (store.getTiddlerText('PaintrConfig##Definitions') || '').split('\n----\n')
        //loop definition blocks
        .map(function(d) {
            var a, all, cx, def, f, ftids, q=[], qi=0, t, tid;

            //skip blank or block starting with blanks (can be comments)
            if(!d.length || ' ' == d.substr(0,1)) return true;

            //parse params for block
            d = d.parseParams('anon', null, true);

            a = d[0]['anon'];

            //no simple params? => next
            if(!a) return true;

            //while queued
            while(a[qi+1] == '+'){
                //add tid to queue
                q.pushUnique(a[qi]);
                //next pair
                qi = qi + 2;
            }

            //add tid to queue
            q.pushUnique(a[qi]);

            //loop queue
            q.map(function(tid){
                //if starts with tiddler=, use single tiddler
                t = 0 == tid.indexOf('tiddler=');

                //add tiddler or tag
                def = tid.substr(t ? 8 : 0);

                //add def to index
                me.definitions.pushUnique(def);
                //add allow index
                me.allowed[def] = getParam( d, 'allow', me.allow );

                //get class for all things to be painted...
                //either as named param or as (second) unnamed param or empty
                all = getParam( d, 'all', a[qi + 1] || '');

                //init classes
                cx = me.classes[def] = {};
                //loop elements
                ['link','tag','title','tiddler'].map(function(what){
                    //set class for element
                    cx[what] =
                        //get from params otherwise all 
                        getParam(
                            d,
                            what,
                            //only when listed in <what>, fall back to global class(es)
                            0 > me.what.indexOf(what) ? '' : all
                        )
                });
                //check if single tiddler
                cx['single'] = t;
                //take transclusion switches from config or global defaults
                cx['transclude'] = getParam(d, 'transclude', me.transclude);
            }); 
        });

        //remove old styles
        removeStyleSheet('PaintrStyles');

        //set new styles
        setStylesheet(store.getTiddlerText(me.config + '##StyleSheet'), 'PaintrStyles');
    }
}

//initial index
me.updatePaintr();

createTiddlyLinkPAINTR = createTiddlyLink;
createTiddlyLink = function (place, title, includeText, className, isStatic, linkedFromTiddler, noToggle) {
    var b = createTiddlyLinkPAINTR.apply(this, arguments);
    me.paint(b, title, 'link');
    return b;
}

createTagButtonPAINTR = createTagButton;
createTagButton = function (place, tag, excludeTiddler, title, tooltip) {
    var b = createTagButtonPAINTR.apply(this, arguments);
    addClass(b, store.getTaggedTiddlers(tag).length > 0 ? 'hastags' : 'hasnotags');
    me.paint(b, tag, 'tag');
    return b;
}

config.macros.allTags.handlerPAINTR = config.macros.allTags.handler;
config.macros.allTags.handler = function (place, macroName, params) {
    config.macros.allTags.handlerPAINTR.apply(this, arguments);
    $('.button, .tiddlyLink', place).each(function (i) {
        var btn = $(this),
            title = btn.attr('tiddlyLink');

        if (title)
            me.paint(this, title, 'link');
        else if(
            btn.hasClass('hastags') ||
            btn.hasClass('hasnotags')
        )
            me.paint(this, btn.attr('tag'), 'tag');
    });
};

Story.prototype.refreshTiddlerPAINTR = Story.prototype.refreshTiddler;
Story.prototype.refreshTiddler = function (title, template, force, customFields, defaultText) {
    var el = Story.prototype.refreshTiddlerPAINTR.apply(this, arguments);

    //paint the title for this tiddler
    me.paint( $(el).find(me.titleSelector)[0], title, 'title');

    //paint the tiddler
    me.paint( $(el), title, 'tiddler');

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
        me.paint(this, tid, 'tiddler', type);
    })
    return el;
}

//hijack save tiddler
TiddlyWiki.prototype.saveTiddlerPAINTR = TiddlyWiki.prototype.saveTiddler;
TiddlyWiki.prototype.saveTiddler = function (title, newTitle, newBody, modifier, modified, tags, fields, clearChangeCount, created, creator) {
    //invoke core and fetch result
    result = this.saveTiddlerPAINTR.apply(this, arguments);
    //changed config?
    if(newTitle == me.config){
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