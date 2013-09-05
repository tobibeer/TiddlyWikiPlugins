/***
|''Name:''|SinglePageHistoryPlugin|
|''Description:''|Limits to only one tiddler open. Manages an history stack and provides macro to navigate in this history (<<history>><<history back>><<history forward>>).|
|''Author:''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Version:''|0.7.1 (2013-09-05)|
|''~CoreVersion:''|2.5.2|
|''Documentation:''|http://singlepagehistory.tiddlyspace.com|
|''Source:''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/SinglePageHistoryPlugin.min.js|
|''License''|Creative Commons 3.0|

!Code
***/
//{{{

(function($){

//default options
var defaults = {
    //whether or not to display the first default tiddler when the last one is closed
    chkOpenDefaultOnEmpty: true,
    //whether to enable SinglePageMode
    chkSinglePageMode: true
};

//loop defaults
for (var id in defaults)
    //doesn't exist?
    if (config.options[id] === undefined)
        //initialize
        config.options[id] = defaults[id];

//the macro
config.macros.history = {

    //localisation
    lingo :{
        historyLbl : 'History',
        historyTip : 'Click to show history...',
        forwardLbl : '>',
        forwardTip : 'Forward to previous tiddler...',
        backLbl    : '<',
        backTip    : 'Back to last tiddler...',
        cancelEdit : '\'%0\' is being edited.\n\n' + 
                     'OK saves and closes the tiddler,\n' + 
                     'cancel leaves it open.'
    },

    maxHistory : 30,    //how many entries you want to allow to go back
    headerHeight : 150, //pixels

    handler: function(place, macroName, params){
        var btn,
            //what type?
            what = params[0],
            //get current position in history
            index = story.historyIndex
            //default classes
            cls = 'button btn-history btn-history-';
        
        //when there's a type (fwd or back)
        if(what){
            //get type
            type = what == 'back' ? what : 'forward';
            //create button
            btn = createTiddlyButton(
                place,
                this.lingo[type + 'Lbl'],
                this.lingo[type + 'Tip'],
                config.macros.history.go,
                cls + type
            )
            //when
            if(
                //back button and first
                what=='back' && index == 0 ||
                //or forward button and last
                index == story.tiddlerHistory.length - 1
            )
                //disable button
                $(btn).addClass('btn-history-none');

        //otherwise when there's no type
        } else {
            //create history popup button
            createTiddlyButton(
                place,
                this.lingo.historyLbl,
                this.lingo.historyTip,
                config.macros.history.showPopup,
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
        for (i=0; i<story.tiddlerHistory.length; i++ ){
            //get history tid
            tid = story.tiddlerHistory[i];
            //create button for tid
            btn = createTiddlyButton(
                //in new li
                createTiddlyElement(popup,"li"),
                //label
                tid,
                //and tip = tiddler name
                tid,
                //set click handler
                config.macros.history.go
            );
            //set history position for item
            $(btn).attr("historyIndex",i);
            //when this is the currently displayed tiddler
            if(tid == story.currentTiddler)
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

        var 
            //reference to namespace
            cmh = config.macros.history;
            //length of history
            len = story.tiddlerHistory.length,
            //whether forward button
            forward = $(this).hasClass('btn-history-forward'),
            //or history button  was clicked
            history = $(this).attr('historyIndex') != undefined,
            //get current position,
            p0 = story.historyIndex,
            //get next position in history
            index = history ?
                // either from button
                parseInt(this.getAttribute("historyIndex")) :
                //or from global position
                (forward ? p0 + 1 : p0 - 1),
            current = story.currentTiddler,
            //get next tiddler
            next = story.tiddlerHistory[index];

        //current tiddler or aborted?
        if (!next || next == current || cmh.checkDirty()) {
            //abort
            return false;
        }

        //set new history position
        story.historyIndex = index;

        //flag as button click
        story.button = true;
        //show the tiddler from history
        story.displayTiddler(null, next);
        //remove flag
        story.button = false;

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
                if (confirm(
                    config.macros.history.lingo.cancelEdit.format([tid])
                    ))
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
    }
}

//get story prototype
var sp=Story.prototype;
//set new global properties
//history array of tiddler titles
sp.tiddlerHistory = [];
//current position in history
sp.historyIndex = -1;
//a reference to the currently open tiddler
sp.currentTiddler = null;
//a flag whether button clicked or not
sp.button = false;

//hijack displayTiddler
sp.displayTiddlerSINGLEPAGEHISTORY = sp.displayTiddler;
sp.displayTiddler = function(srcElement,title,template,animate,slowly) {
    var
        i, a = [],
        //whether or not single page mode is enabled
        single = config.options['chkSinglePageMode'],
        //reference to history macro
        cmh = config.macros.history;
        //get current position
        index = this.historyIndex,
        //get history length
        len = this.tiddlerHistory.length,
        //get current
        current = this.currentTiddler,
        //get title of next tiddler  as either string or from tiddler
        next = ((typeof title === "string") ? title : title.title);

    //when other than current and not going to display edit mode
    if (current != next && template != 2) {

        //no history button clicked
        if (!this.button) {
            //when dirty, do nothing
            if (cmh.checkDirty() && single) {
                return false;
            }
            //when middle of stack
            if (len > 0 && index < len - 1) {
                //loop current entries
                for (i = 0; i <= index;i++)
                    a.push(this.tiddlerHistory[i]);
                //add last
                a.push(next);
                //increment counter
                this.historyIndex += 1;
                //cut rest from history
                this.tiddlerHistory = a;
            //end of stack    
            } else {
                //add to history
                this.tiddlerHistory.push(next);
                //max reached? => remove first
                if (len > cmh.maxHistory) this.tiddlerHistory.shift();
                //otherwise add increment
                else this.historyIndex += 1;
            }

            //disable forward button
            $('.btn-history-forward').addClass('btn-history-none');

            //open another?
            if (next != current && index >= 0)
                //enable back button
                $('.btn-history-back').removeClass('btn-history-none');
        }

        //tiddler open? => close
        if (current && single) story.closeTiddler(current);

        //save current tiddler
        this.currentTiddler = next;

        //encode tiddler name as url slug
        var encoded = encodeURIComponent(String.encodeTiddlyLink(next));
        //set location as url + # + tid
        window.location.href =
            location.protocol + '//' + 
            location.host +
            location.pathname + "#" +
            encoded;
        //set document title
        document.title = wikifyPlain("SiteTitle") + " - " + next;
    }

    //display tiddler
    story.displayTiddlerSINGLEPAGEHISTORY('top',next,template,animate,slowly);

    //and scroll to it
    var container = $(document.body),
        whereTo = $(story.getTiddler(next));

    //smoothly
    container.animate({
        scrollTop:
            whereTo.offset().top -
            container.offset().top -
            cmh.headerHeight
    });
}


Story.prototype.closeTiddlerSINGLEPAGEHISTORY = Story.prototype.closeTiddler;
Story.prototype.closeTiddler = function(title,animate,unused) {
    //invoke core
    Story.prototype.closeTiddlerSINGLEPAGEHISTORY.apply(this,arguments);
    //when single page mode enabled and there's no tiddler left
    if(config.options.chkOpenDefaultOnEmpty){
        var t=0;
        //find open tiddlers
        this.forEachTiddler(function(title,element){
            t++;
            return t>1;
        });
        //none open?
        if(t<2){
            //show first default tiddler when tiddler is closed
            this.displayTiddler(
                'top',
                store.getTiddlerText('DefaultTiddlers').readBracketedList()[0]
            )
        }
    }
}

})(jQuery);
//}}}