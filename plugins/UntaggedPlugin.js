/***
|''Name''|UntaggedPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|provides an """<<untagged>>""" macro and adds an untagged button to the tags tab|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/UntaggedPlugin.js|
|''Documentation''|http://untagged.tiddlyspace.com|
|''Version''|0.9.1 (2013-09-22)|
|''~CoreVersion''|2.5.2|
|''License''|Creative Commons 3.0|
<<option chkShowUntagged>> show in [[sidebar tags|TabTags]]
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

//optionfor sidebar tags
if(!config.options.chkShowUntagged){
    config.options.chkShowUntagged = true;
}

//localisation
merge(config.views.wikified.tag,{
        untaggedButton: "untagged (%0)",
        untaggedTooltip: "Show untagged tiddlers...",  
        untaggedListTitle: "Untagged tiddlers:",
        untaggedNone: "There are no untagged tiddlers..."
});

//shortcut
var lingo = config.views.wikified.tag;

//define get macro
var me = config.macros.untagged = {

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
            var e = ev || window.event,
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
                } else {
                    //add the open all link
                    createTiddlyButton(
                        createTiddlyElement(out,"li"),
                        lingo.openAllText.format([lingo.untaggedButton]),
                        lingo.untaggedTooltip,
                        me.openAll,
                        'tiddlyLink'
                    );
                    //spacer
                    createTiddlyElement(createTiddlyElement(out,"li",null,"listBreak"),"div");
                }
                //loop all tids
                tids.map(function(t){
                    //add link
                    createTiddlyLink(createTiddlyElement(out,"li"),t.title,true);
                });
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
    config.macros.allTags.handlerUNTAGGED.apply(this, arguments);
    //show untagged?
    if(config.options.chkShowUntagged){
        //render it
        wikify('<<untagged alltags>>',place);
    }
};

})(jQuery);
//}}}