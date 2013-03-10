/***
|''Name''|RewindPlugin|
|''Description''|Renders $target message with $target link to the last tiddler you came from|
|''Author''|Tobias Beer|
|''Version''|0.8.0|
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
        //where to insert the message
        insertAt: ".subtitle",
        //whether to insert after or before
        insertAfter: true,
        //whether to ignore links to the same message
        noMessageForSelf: true,
        //only show message for pretty links
        onlyPrettyLinks: false,
        //a customer message class
        msgClass: "",
        //the message => %0 = source tiddler | %1 = txtRewindPrettyLink | $2 = link title
        tplRewindMessage: "« go back to [[%0]]%1",
        //link details => %0 = link title | %1 = source tiddler
        txtRewindPrettyLink: " where you clicked [[%0|%1]]",

        //gets a reference to the pretty link or goes back to it
        handleLink: function (title, link, tiddler) {
            var l, result, links,
                //whether or not to go to the source link
                open = !tiddler;

            //opening a tiddler?
            if (open) {
                //get target tiddler title
                title = this.getAttribute('tiddlylink');
                //get link number
                link = this.getAttribute('linkNo');
                //get tid by opening it
                tiddler = story.displayTiddler(null,title);
            }

            //get all tiddlyLinks inside the source tiddler
            links = $('a.tiddlyLink', tiddler);
            //when going to the link
            if (open) {
                //set link
                link = $(links[link]);
                //scroll to element
                ensureVisible(link[0]);
                //blink some
                link.fadeOut(400).fadeIn(300).fadeOut(200).fadeIn(300)
            //when fetching the link number
            } else {
                //loop all links
                for(l = 0; l < links.length; l++)
                    //link found? => return number
                    if (link == links[l]) return l;
            }
        }
    };
    //hijack core function
    onClickTiddlerLink_Rewind = onClickTiddlerLink;
    onClickTiddlerLink = function (ev) {
        //reun core function
        onClickTiddlerLink_Rewind.apply(this, arguments);
        var $msg, iLink,
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
            tiddler = story.findContainingTiddler(lnk),
            //get the last tiddler title
            ti = tiddler ? tiddler.getAttribute("tiddler") : '',
            //the place where to insert the message
            //=> must be inside the target tiddler
            $place = $(re.insertAt, $target);

        //do not render when...
        if (
            //no mesages for links in current tiddler
            re.noMessageForSelf && ti == target || 
            //only pretty links but this isn't one
            re.onlyPrettyLinks && !pretty ||
            //the link is inside a rewind message
            $(lnk).closest(".rewind_message")[0] ||
            //the link was not in a tiddler
            !ti ||
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
                ti,
                //and the pretty source link, only if it was pretty
                pretty ? re.txtRewindPrettyLink.format([text, ti]) : '',
                //and just the source link text, if anyone needs it
                text
            ]),
            //into message
            $msg[0]
        );

        //loop all tids
        $('a.tiddlyLink', $msg).each(function (i, link) {
            var link, l = $(link);
            if (l.text() != l.attr('tiddlyLink')) {
                //set link attribute
                l.attr({
                    //get link number
                    linkNo: re.handleLink(l.text(), lnk, tiddler)
                //set click handler
                }).click(re.handleLink);
            };
        });
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