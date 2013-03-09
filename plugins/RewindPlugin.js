/***
|''Name''|RewindPlugin|
|''Description''|Renders $target message with $target link to the last tiddler you came from|
|''Author''|Tobias Beer|
|''Version''|0.5.2|
|''Documentation:''|http://rewind.tiddlyspace.com/|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/RewindPlugin.js|
|''License''|[[Creative Commons Attribution-ShareAlike 2.5 License|http://creativecommons.org/licenses/by-sa/2.5/]]|
|''~CoreVersion''|2.5.3|
!Code
***/
/*{{{*/
(function ($) {
    //create plugin namespace
    config.extensions.rewind = {
        //only show for pretty links
        onlyPrettyLinks: false,
        //where to insert the message
        insertAt: ".subtitle",
        //whether to insert after or before
        insertAfter: true,
        //a customer message class
        msgClass: "",
        //the message => %0 = source tiddler | %1 = txtRewindPrettyLink | $2 = link title
        tplRewindMessage: "« go back to [[%0]]%1",
        //link details => %0 = link title | %1 = source tiddler
        txtRewindPrettyLink: " where you clicked [[%0|%1]]"
    };
    //hijack core function
    onClickTiddlerLink_Rewind = onClickTiddlerLink;
    onClickTiddlerLink = function (ev) {
        //reun core function
        onClickTiddlerLink_Rewind.apply(this, arguments);
        var $msg,
            //ref to extension
            re = config.extensions.rewind,
            //clicked link
            lnk = resolveTarget(ev || window.event),
            //the link text
            text = $(lnk).text(),
            //the target tiddler title
            target = lnk.getAttribute("tiddlyLink"),
            //whether or not this is a pretty link
            pretty = text != target,
            //the target tiddler
            $target = $(story.getTiddler(target)),
            //the previous tiddler dom element
            tid = story.findContainingTiddler(lnk),
            //the place where to insert the message
            //=> must be inside the target tiddler
            $place = $(re.insertAt, $target);

        //get the last tiddler title
        tid = tid ? tid.getAttribute("tiddler") : "";
        //do not render when...
        if (
            //only pretty links but this isn't one
            !pretty && re.onlyPrettyLinks ||
            //the link is inside a rewind message
            $(lnk).closest(".rewind_message")[0] ||
            //the link was not in a tiddler
            !tid ||
            //the output element is invalid
            $place.length == 0
        ) return;
        //find existing message
        $msg = $(".rewind_message", $target);
        //tiddler was already open
        if ($msg.length) {
            //clear message
            $msg.empty()
        //tiddler opened
        } else {
            //create message, apply custom class
            $msg = $('<span class="rewind_message ' + re.msgClass + '"/>');
            //insert after or before reference
            re.insertAfter ? $place.after($msg) : $place.before($msg)
        }
        //render message
        wikify(
            //using the message format
            re.tplRewindMessage.format([
                //with the current tiddler title
                tid,
                //and the pretty source link, only if it was pretty
                pretty ? re.txtRewindPrettyLink.format([text, tid]) : '',
                //and just the source link text, if anyone needs it
                text
            ]),
            //into message
            $msg[0]
        )
    };
    //write styles to shadow
    config.shadowTiddlers.StyleSheetRewind = store.getTiddlerText("RewindPlugin##CSS");
    //activate styles
    store.addNotification("StyleSheetRewind", refreshStyles)
})(jQuery)
/*}}}*/

//{{{
/*
!CSS
.rewind_message{
    display:block;
    background-color:[[ColorPalette::TertiaryPale]];
    margin:3px 0 10px 0;
    padding:3px;
}
!END
*/
//}}}