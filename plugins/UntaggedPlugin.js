/***
|''Name''|UntaggedPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|provides an """<<untagged>>""" macro<br>adds an untagged button to the tags tab<br>allows to hide (empty) tags / tagging|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/UntaggedPlugin.js|
|''Documentation''|http://untagged.tiddlyspace.com|
|''Version''|1.0.8 (2013-10-08)|
|''~CoreVersion''|2.5.2|
|''License''|Creative Commons 3.0|
!Options
|!Option|!Description|!Default|h
|<<option chkShowUntagged>> ''chkShowUntagged'' |show untagged with the """<<alltags>>""" macro, e.g. in the [[sidebar|TabTags]]| ☑ |
|<<option chkShowUntaggedShadows>> ''chkShowUntaggedShadows'' |also list untagged shadow tiddlers| ☐ |
|<<option chkHideEmptyTags>> ''chkHideEmptyTags'' |hide tags when empty| ☑ |
|<<option chkHideEmptyTagging>> ''chkHideEmptyTagging'' |hide tagging when empty| ☑ |
!Usage
{{{
<<untagged>>
}}}
<<untagged>>

{{{
<<untagged list>>
}}}
<<untagged list>>
!Code
***/
//{{{
(function ($) {

var co = config.options;

[
    'chkShowUntagged',
    'chkShowUntaggedShadows-',
    'chkHideEmptyTags',
    'chkHideEmptyTagging'
].map(function(o){
    o = o.split('-');
    if(undefined == co[o[0]]) co[o[0]] = !o[1];
})

//localisation
merge(config.views.wikified.tag,{
    untaggedButton: "untagged (%0)",
    untaggedTooltip: "Show untagged tiddlers...",  
    untaggedListTitle: "Untagged tiddlers:",
    untaggedNone: "There are no untagged tiddlers...",
    openUntagged: "Open '%0'"
});

//shortcut
var lingo = config.views.wikified.tag;

//define get macro
var me = config.macros.untagged = {
    selectorTags: '.tagged, .tidTags, .infoTags',
    selectorTagging: '.tagging, .infoTagging',
    noTagsWhenTagged:'no-tags',
    noTaggingWhenTagged:'no-tagging',
    untaggedTiddler: 'untagged',
    hideTags:'excludeLists excludeMissing excludePublisher excludeSearch no-tags no-tagging noLinkify',
    hideTagsReadOnly: 'systemConfig',

    //the macro handler
    handler: function (place, macroName, params, wikifier, paramString, tiddler) {
        //call the refresh handler
        me.refresh(place, paramString);
    },

    refresh: function (el, paramString) {
        var $out, tids = [], ul,
            //parse params
            p = paramString.parseParams('anon',null,true),
            //get unnamed params
            params = p[0]['anon'] || [],
            //check if the list is to be rendered
            list = params.contains('list'),
            //is this an actual refresh?
            refresh = $(el).attr('macroName') == 'untagged',
            //the element as jQuery object
            $el = $(el),
            //where to render stuff
            place = refresh ? $el.parent()[0] : el;

        //on refresh, hide previous element
        if(refresh) $el.hide();

        //get all tids
        store.getTiddlers('title').map(function(t){
            //skip shadows and has shadow?
            if(!co.chkShowUntaggedShadows &&
                config.shadowTiddlers[t.title])
                //skip
                return true;

            //add those w/o tags
            if(!t.tags||!t.tags.length)
                tids.push(t);
        });

        //render list or popup button
        $out = $(
            //render list?
            list ?
            //create ul
            createTiddlyElement(place,'ul') : 
            //render popup button?
            createTiddlyButton(
                place,
                lingo.untaggedButton.format([tids.length]),
                lingo.untaggedTooltip,
                me.showList,
                'tiddlyLink untagged'
            )
        )
            //remember tids
            .data('tids',tids)
            //set refresh params
            .attr({
                'tiddlyLink': me.untaggedTiddler ? me.untaggedTiddler : '',
                'refresh': 'macro',
                'macroName': 'untagged',
                'params': paramString
            });

        //render list
        if(list)
            me.showList(null, $out[0]);
        //or button into new li in sidebar
        else if(params.contains('alltags')) {
            $out.appendTo(
                $('<li/>').appendTo(
                    $out.prev()
                )
            )
        }

        //on refresh
        if(refresh){
            //append new
            $out.insertAfter($el);
            //remove old
            $el.remove();
        }
    },

    //renders the actual list either directly or into a popup
    showList: function(ev, place){
        var el,
            //get event
            e = ev || window.event,
            //get the tids
            tids = $(place?place:this).data('tids'),
            //where to render? when place defined => inline list
            out = place ? place : Popup.create(this),
            //the output container as a jQuery object
            $out = $(out);

        //set classes
        $out.addClass("taggedTiddlerList untaggedTiddlerList");

        //when there are untagged tids
        if(tids.length > 0) {
            //in the inline list
            if(place){
                //add the list title
                createTiddlyElement(out,'li',null,'listTitle',lingo.untaggedListTitle);
            //in the popup
            } else if (!co.chkSinglePageMode) {
                //add the open all link
                createTiddlyButton(
                    createTiddlyElement(out,"li"),
                    lingo.openAllText.format([lingo.untaggedButton]),
                    lingo.untaggedTooltip,
                    me.openAll
                );
                //spacer
                createTiddlyElement(createTiddlyElement(out,"li",null,"listBreak"),"div");
            }
            //loop all tids
            tids.map(function(t){
                //add link
                createTiddlyLink(createTiddlyElement(out,"li"),t.title,true);
            });
            //when link to untagged tiddler enabled and in popup
            if(me.untaggedTiddler && !place){
                //new separator
                createTiddlyElement(
                    createTiddlyElement(out,"li",null,"listBreak"),
                    'div'                    );
                //link to open the untagged tiddler
                el = createTiddlyLink(
                    createTiddlyElement(out,"li"),
                    me.untaggedTiddler,
                    false
                );
                //set link text
                createTiddlyText(el,lingo.openUntagged.format([me.untaggedTiddler]));
            }
        //no untagged tids
        } else {
            //render message
            createTiddlyElement(
                out,
                "li",
                null,
                "disabled",
                lingo.untaggedNone
            );
        }

        //append tids
        $out.data('tids',tids);

        //when popup
        if(!place){
            //show it and be done
            Popup.show();
            e.cancelBubble = true;
            if(e.stopPropagation) e.stopPropagation();
            return false;
        }
    },

    //opens all untagged tids
    openAll: function(){
        //open tids
        story.displayTiddlers(
            this,
            //from container
            $(this).closest('.taggedTiddlerList').data('tids')
        );
        return false;
    },

    //hides tag buttons on readOnly
    hide: function(place, what){
        //get tags to be hidden
        var hide = me.hideTags;
            hideR = me.hideTagsReadOnly;
        //get all buttons
        if(hide || hideR){
            //get as array
            hide = hide.readBracketedList();
            hideR = hideR.readBracketedList();
            //loop all buttons
            $('.button, .tiddlyLink',place).each(function(){
                //get tag button
                var $btn = $(this),
                    tag = $btn.attr('tag');
                //when to be hide
                if(
                    hide.contains(tag) ||
                    readOnly && hideR.contains(tag)
                ){
                    //hide
                    $btn.hide();
                    $btn = $btn.parent();
                    if($btn.is('li') && $btn.children().length < 2) $btn.hide();
                }
            });
            //when
            if(
                //this list to be hidden on empty
                co['chkHideEmpty' + what] && 
                //and there is no more button
                !$('.button, .tiddlyLink',place).filter(':visible').length
            ){
                //remove this place
                place.remove();
            }
        }
    }
}

//define stylesheet
config.shadowTiddlers.StyleSheetUntagged =
    '/*{{{*/\n' +
    '.untagged {color:[[ColorPalette::TertiaryDark]];}\n' +
    '/*}}}*/';
//activate stylesheet
store.addNotification("StyleSheetUntagged", refreshStyles);

//hijack tags tab
config.macros.allTags.handlerUNTAGGED = config.macros.allTags.handler;
config.macros.allTags.handler = function(place, macroName, params) {
    //run default
    config.macros.allTags.handlerUNTAGGED.apply(this, arguments);
    //hide readonly tags
    me.hide($(place).last());
    //show untagged?
    if(co.chkShowUntagged){
        //render it
        wikify('<<untagged alltags>>',place);
    }
};


//hijack tags handler
config.macros.tags.handlerUNTAGGED = config.macros.tags.handler;
config.macros.tags.handler = function(place,macroName,params,wikifier,paramString,tiddler){
    //run default
    config.macros.tags.handlerUNTAGGED.apply(this,arguments);
    //hide tags for tags list
    me.hide($(place).last(),'Tags');  
}


//hijack displayTiddler to hide tags or tagging when set or empty
Story.prototype.displayTiddlerUNTAGGED = Story.prototype.displayTiddler;
Story.prototype.displayTiddler = function(srcElement,tiddler,template,animate,unused,customFields,toggle,animationSrc){
    var
        //run default and get tid element
        el = Story.prototype.displayTiddlerUNTAGGED.apply(this, arguments),
        //get title
        title = (tiddler instanceof Tiddler) ? tiddler.title : tiddler,
        //get tiddler
        tid = store.getTiddler(title);

    //when
    if(
        //tid has tags and tag to hide tagged OR
        (tid && tid.tags && tid.tags.containsAny(me.noTagsWhenTagged.readBracketedList()))
        ||
        (
            //empty tags to be hidden AND
            co.chkHideEmptyTags &&
            //tid shows no tags
            $(me.selectorTags,el).find('a:visible').length == 0
        )

    ){
        //hide tags
        $(me.selectorTags, el).hide();
    }

    //when
    if(
        //tid has tags and has tag to hide tagging OR
        (tid && tid.tags && tid.tags.containsAny(me.noTaggingWhenTagged.readBracketedList()))
        ||
        (
            //empty tagging to be hidden AND
            co.chkHideEmptyTagging &&
            //tid shows no tids tagging to it
            $(me.selectorTagging,el).find('a:visible').length == 0
        )
    ){
        //hide tagging
        $(me.selectorTagging, el).hide();
    }
    return el;
}


})(jQuery);
//}}}