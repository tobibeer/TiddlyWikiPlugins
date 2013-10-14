/***
|''Name:''|SinglePageHistoryPlugin|
|''Description:''|Limits to only one tiddler open (mostly). Manages an history stack and provides macro to navigate in this history (<<history>><<history back>><<history forward>>).|
|''Author:''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Version:''|1.0.5 (2013-10-14)|
|''~CoreVersion:''|2.5.2|
|''Documentation:''|http://singlepagehistory.tiddlyspace.com|
|''Source:''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/SinglePageHistoryPlugin.js|
|''License''|Creative Commons 3.0|

!Code
***/
//{{{

(function($){

var co=config.options;

//default options
$.each({
    //whether or not to display the first default tiddler when the last one is closed
    chkOpenDefaultOnEmpty: true,
    //whether to enable SinglePageMode
    chkSinglePageMode: true,
    //whether to always open tiddlers at the top when not in singlepage mode
    chkOpenTop: true
//loop and create
}, function(option, value){
    //doesn't exist?
    if (co[option] === undefined)
        //initialize
        co[option] = value;
});

//the macro
var me = config.macros.history = {

    //SETTINGS

    //how many entries you want to allow to go back
    maxHistory : 30,
    //milliseconds for checking URL changes    
    intervalUpdateURL: 500,

    //LOCALISATION
    lingo :{
        historyLbl : 'History',
        historyTip : 'Click to show history...',
        forwardLbl : '>',
        forwardTip : 'Forward to previous in history...',
        backLbl    : '<',
        backTip    : 'Back to last in history...',
        cancelEdit : '\'%0\' is being edited.\n\n' + 
                     'OK saves and closes it.\n' + 
                     'CANCEL leaves it open.'
    },


    //DO NOT CHANGE! (functional helper properties)

    //history array of tiddler titles
    history: [],
    //current position in history
    historyIndex: -1,
    //a reference to the currently open tiddler
    currentTiddler: null,
    //a flag whether button clicked or not
    button: false,
    //the refresh handler handler
    timeoutChangedURL: 0,
    //the last visited url
    lastURL: window.location.href,
    //set when a tag button asks to open all
    openAll: false,

    //macro handler
    handler: function(place, macroName, params){
        var btn,
            //what type?
            what = params[0],
            //get current position in history
            index = me.historyIndex,
            //default classes
            cls = 'button btn-history btn-history-';
        
        //when there's a type (fwd or back)
        if(what){
            //get type
            type = what == 'back' ? what : 'forward';
            //create button
            btn = createTiddlyButton(
                place,
                me.lingo[type + 'Lbl'],
                me.lingo[type + 'Tip'],
                me.go,
                cls + type
            )
            //when
            if(
                //back button and first
                what=='back' && index == 0 ||
                //or forward button and last
                what!='back' && index == me.history.length - 1
            )
                //disable button
                $(btn).addClass('btn-history-none');

        //otherwise when there's no type
        } else {
            //create history popup button
            createTiddlyButton(
                place,
                me.lingo.historyLbl,
                me.lingo.historyTip,
                me.showPopup,
                'button btn-history btn-history-popup'
            )
        }
    },

    //history button click handler
    showPopup: function(ev) {
        var i, btn, tid,
            //get event
            e = ev || window.event,
            //new popup
            popup = Popup.create(this);

        //loop history
        for (i=0; i<me.history.length; i++ ){
            //get history tid
            tid = me.history[i];
            //create button for tid
            btn = createTiddlyButton(
                //in new li
                createTiddlyElement(popup,"li"),
                //label
                tid,
                //and tip = tiddler name
                tid,
                //set click handler
                me.go
            );
            //set history position for item
            $(btn).attr("historyIndex",i);
            //when this is the currently displayed tiddler
            if(tid == me.currentTiddler)
                //set item class
                $(btn).addClass('btn-history-current');
        }

        //show the popup
        Popup.show(popup,false);
        //stop any further event handling
        e.cancelBubble = true;
        if (e.stopPropagation) e.stopPropagation();
        return false;
    },

    //click handler for any actual history action
    go: function() {

        var tid, btn = $(this),
            //length of history
            len = me.history.length,
            //whether forward button
            forward = btn.hasClass('btn-history-forward'),
            //get index in hostory
            index = btn.attr("historyIndex"),
            //current tiddler
            current = me.currentTiddler,

        //get next position in history
        index =
            //history button clicked?
            undefined != index ?
            //from button
            parseInt(index):
            //or from global position
            (me.historyIndex + (forward ? 1 : -1));

        //get next tiddler
        tid = me.history[index];

        //current tiddler or aborted?
        if (!tid || tid == current || me.checkDirty()) {
            //abort
            return false;
        }

        //set new history position
        me.historyIndex = index;

        //flag as button click
        me.button = true;
        //show the tiddler from history
        story.displayTiddler(null, tid);
        //remove flag
        me.button = false;

        //disable both buttons
        $('.btn-history-back, .btn-history-forward')
            .addClass('btn-history-none');  

        //when first or any greater selected and not last
        if(index >= 0 && index < len - 1)
            //enable forward button
            $('.btn-history-forward').removeClass('btn-history-none');

        //when last or smaller selected and not first
        if(index <= len - 1 && index > 0)
            //enable back
            $('.btn-history-back').removeClass('btn-history-none');

        //no bubble
        return false;
    },

    //checks whether story is dirty
    checkDirty: function () {
        var dirty = false;
        //loop all tids in the story column
        story.forEachTiddler(function(tid, elem) {
            //when dirty => edit mode
            if ('true' == elem.getAttribute('dirty')) {
                //when permission given to save and close edit mode
                if ( confirm( me.lingo.cancelEdit.format([tid]) ) )
                    //save it
                    story.saveTiddler(tid)
                //if not confirmed
                else {
                    //treat as dirty
                    dirty = true;
                    return false;
                }
            }
        });
        return dirty;
    },

    //check whether we're at the start url
    startURL: function(returnURL){
        var hashes = window.location.href.split('#');
        return returnURL ? hashes[0] : (!hashes[1] ||hashes.length == 1);
    },

    //opens default tiddlers
    openTiddlers: function(tids){
        //enable open all
        me.openAll = true;

        //show defaults
        story.displayTiddlers(
            null,
            tids ? tids : store.getTiddlerText("DefaultTiddlers").readBracketedList()
        );
        //set permaview
        story.permaView();
        //disable open all
        me.openAll = false;
    }
}

checkChangedURL = function() {
    var inStory, tids,
        //the url
        href = window.location.href,
        //find hashes
        pos = href.indexOf('#'),
        //single-page mode
        single = co.chkSinglePageMode;

    //no change in location => out
    if(href == me.lastURL) return;

    //get tids
    tids = decodeURIComponent(href.substr(pos+1)).readBracketedList();

    // permalink for
    if (
        //single tiddler and tiddler not open yet
        single && tids.length == 1 && !story.getTiddler(tids[0]) ||
        //or no single page mode but open top and already open (make top)
        !single && co.chkOpenTop && story.getTiddler(tids[0])
    )
        //display tiddler
        story.displayTiddler(null,tids[0]);

    //restore permaview for default tiddlers only in singlepagemode 
    else if (single){
        //remember url
        me.lastURL = href;
        //when tids in story
        inStory = tids.length;
        //check if any of them not in story yet
        tids.map(function(tid){
            inStory = inStory && story.getTiddler(tid);
            return inStory;
        });
        //if tids 
        if(!inStory){
            //tids in hashes? => open
            if (tids.length) me.openTiddlers(tids);
            //otherwise default
            else me.openTiddlers();
        }
    }
}

//get story prototype
var sp = Story.prototype;

//hijack displayTiddler
sp.displayTiddlerSINGLEPAGEHISTORY = sp.displayTiddler;
sp.displayTiddler = function(srcElement,title,template,animate,slowly) {
    var
        $next, a = [], enc, el, i, t =0, top,
        //whether or not single page mode is enabled
        single = co.chkSinglePageMode,
        //get current position
        index = me.historyIndex,
        //get history length
        len = me.history.length,
        //get current
        current = me.currentTiddler,
        //get title of next tiddler  as either string or from tiddler
        next = ((typeof title === "string") ? title : title.title);

    //when other than current and not going to display edit mode
    if (current != next && template != 2) {

        //no history button clicked
        if (!me.button) {

            //when dirty, do nothing
            if (me.checkDirty() && single) {
                return false;
            }
            //when middle of stack
            if (len > 0 && index < len - 1) {
                //loop current entries
                for (i = 0; i <= index;i++)
                    a.push(me.history[i]);
                //add last
                a.push(next);
                //increment counter
                me.historyIndex += 1;
                //cut rest from history
                me.history = a;
            //end of stack    
            } else {
                //add to history
                me.history.push(next);
                //max reached? => remove first
                if (len > me.maxHistory) me.history.shift();
                //otherwise add increment
                else me.historyIndex += 1;
            }

            //disable forward button
            $('.btn-history-forward').addClass('btn-history-none');

            //open another?
            if (next != current && index >= 0)
                //enable back button
                $('.btn-history-back').removeClass('btn-history-none');
        }

        //tiddler open && single page mode and not overruled?
        if (current && !me.openAll && single && template != 2){
            //make it really close
            me.openAll = true;
            //close ALL
            story.closeAllTiddlers();
            //make it really close
            me.openAll = false;
        }
        
        //save current tiddler
        me.currentTiddler = next;

        //set location to permalink
        if(!me.openAll){
            //construct permalink as base url + # and...
            href = me.startURL(true) + '#' +
                //encode tiddler name as url slug
                encodeURIComponent( String.encodeTiddlyLink(next) );
            //set it
            window.location.href = href;
        }

        //remember url
        me.lastURL = window.location.href;

        //set document title
        document.title = wikifyPlain("SiteTitle") + " - " + next;
    }

    //display tiddler
    el = story.displayTiddlerSINGLEPAGEHISTORY('top',next,template,single?false:animate);

    //find open tiddlers
    this.forEachTiddler(function(){t++;return t < 3;});

    //only when not opening edit mode and single tiddler
    if(template!=2 && t < 2 || !single){
        //get tiddler to open
        open = story.getTiddler(next);
        //put first if desired
        if(co.chkOpenTop)$('#tiddlerDisplay').prepend($(open));

        //determine new top position
        top = single || !open || co.chkOpenTop ? 0 : ensureVisible(open);

        //anim
        if(co.chkAnimate)
            $(document.body).animate({scrollTop: top});
        //no anim
        else
            window.scrollTo(0,top);
    }

    //activate timer for browser back forth
    if (!me.timeoutChangedURL)
        //set timeout handler
        me.timeoutChangedURL =
            window.setInterval(function() { checkChangedURL();},
            me.intervalUpdateURL
        );

    //return the tiddler
    return el;
}

sp.closeTiddlerSINGLEPAGEHISTORY = sp.closeTiddler;
sp.closeTiddler = function(title,animate,unused) {
    //invoke core
    sp.closeTiddlerSINGLEPAGEHISTORY.apply(this,arguments);

    //when single page mode enabled and there's no tiddler left
    if( unused != 'OPENING' && co.chkOpenDefaultOnEmpty && !me.openAll){
        var t=0;
        //find open tiddlers
        this.forEachTiddler(
            function(title,element){t++; return t<2;}
        );
        //none open
        if(t == 0) me.openTiddlers();
    }
}

//hijack tag click to allow opening multiple tiddlers
onClickTagOpenAllSINGLEPAGEHISTORY =  onClickTagOpenAll;
onClickTagOpenAll = function(ev){
    //enable open all
    me.openAll = true;
    //close tiddlers
    story.closeAllTiddlers();
    //open tagged
    onClickTagOpenAllSINGLEPAGEHISTORY.apply(this, arguments);
    //update permaview
    story.permaView();
    //disable openall
    me.openAll = false;
}

//hijack saveTiddler to prevent closing other tiddlers
config.commands.saveTiddler.handlerSINGLEPAGEHISTORY = config.commands.saveTiddler.handler;
config.commands.saveTiddler.handler = function(event,src,title){
    me.openAll = true;
    var result = config.commands.saveTiddler.handlerSINGLEPAGEHISTORY.apply(this,arguments);
    me.openAll = false;
    return result;
};

//hijack and fix ALL paramifiers
var cp = config.paramifiers;
$.each(config.paramifiers, function(key, p){
    p.onstartSINGEPAGEHISTORY = p.onstart;
    p.onstart = function(v){
        me.openAll = true;
        p.onstartSINGEPAGEHISTORY.apply(this,arguments);
        me.openAll = false;
    }
});

})(jQuery);
//}}}