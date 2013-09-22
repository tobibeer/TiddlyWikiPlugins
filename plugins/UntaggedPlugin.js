/***
|''Name''|UntaggedPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|provides an """<<untagged>>""" macro and adds an untagged button to the tags tab|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/UntaggedPlugin.js|
|''Documentation''|http://untagged.tiddlyspace.com|
|''Version''|0.9 (2013-09-22)|
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

if(!config.options.chkShowUntagged){
    config.options.chkShowUntagged = true;
}

merge(config.views.wikified.tag,{
        untaggedButton: "untagged (%0)",
        untaggedTooltip: "Show untagged tiddlers...",  
        untaggedListTitle: "Untagged tiddlers:" 
});

var lingo = config.views.wikified.tag;

//define get macro
var me = config.macros.untagged = {

        //the macro handler
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            me.refresh(place, paramString);
        },

        refresh: function (el, paramString) {
            var $out, tids = [], ul,
                p = paramString.parseParams('anon',null,true),
                params = p[0]['anon'] || [],
                list = params.contains('list'),

                refresh = $(el).attr('macroName') == 'untagged',
                $el = $(el),
                place = refresh ? $el.parent()[0] : el;

            if(refresh)$el.hide();

            store.getTiddlers('title').map(function(t){
                if(!t.tags||!t.tags.length)
                    tids.push(t);
            });

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
                .data('tids',tids)
                .attr({
                    'refresh': 'macro',
                    'macroName': 'untagged',
                    'params': paramString
                });

            //render list
            if(list)
                me.showList(null, $out[0]);
            //or button into li
            else if(params.contains('alltags')) {
                $out.appendTo(
                    $('<li/>').appendTo(
                        $out.prev()
                    )
                )
            }

            if(refresh){
                $out.insertAfter($el);
                $el.remove();
            }
        },

        showList: function(ev, place){
            var e = ev || window.event,
                tids = $(place?place:this).data('tids'),
                out = place ? place : Popup.create(this),
                $out = $(out);

            $out.addClass("taggedTiddlerList untaggedTiddlerList");

            if(tids.length > 0) {
                if(place){
                    createTiddlyElement(out,'li',null,'listTitle',lingo.untaggedListTitle);
                } else {
                    createTiddlyButton(
                        createTiddlyElement(out,"li"),
                        lingo.openAllText.format([lingo.untaggedButton]),
                        lingo.untaggedTooltip,
                        me.openAll,
                        'tiddlyLink'
                    );
                    createTiddlyElement(createTiddlyElement(out,"li",null,"listBreak"),"div");
                }
                tids.map(function(t){
                    createTiddlyLink(createTiddlyElement(out,"li"),t.title,true);
                });
            } else {
                createTiddlyElement(
                    out,
                    "li",
                    null,
                    "disabled",
                    lingo.popupNone.format([lingo.untaggedButton])
                );
            }

            $out.data('tids',tids);

            if(!place){
                Popup.show();
                e.cancelBubble = true;
                if(e.stopPropagation) e.stopPropagation();
                return false;
            }
        },

        openAll: function(){
            story.displayTiddlers(
                this,
                $(this).closest('.taggedTiddlerList').data('tids')
            );
            return false;
        }
    }


config.shadowTiddlers.StyleSheetUntagged = '/*{{{*/\n' +
    '.untagged {color:[[ColorPalette::TertiaryDark]];}\n' +
    '/*}}}*/';
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