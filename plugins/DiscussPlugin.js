// TODO: use StyleSheet! FIX CSS!

/***
|''Name''|DiscussPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|outputs the (modified) html representation with disqus in an iframe for a tiddler on TiddlySpace|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/DiscussPlugin.js|
|''Documentation''|http://discuss.tiddlyspace.com|
|''Version''|0.9.3 (2013-09-06)|
|''~CoreVersion''|2.5.2|
|''Requires''|TiddlySpace / TiddlyWeb|
|''License''|Creative Commons 3.0|
!Code
***/
//{{{
(function($){

//define discuss macro
config.macros.discuss = {

    config:{

        //whether to always show comments or put them in a slider
        always: false,

        //slider template
        //%0 — tiddler title | %1 — the number
        tplSlider: 'Show comments for \'\'"""%0"""\'\'  \"\"\"//\"\"\" <<discuss count [[%0]]>>',

        //%0 = tiddler title
        tipSlider: "Click to show comments for %0...",

        //the url to the space
        //to not modify the HTML representation of your main space
        //create a "discussions only" space, e.g.
        //* create <yourspace-discuss>
        //* have it include <yourspace>
        //* make the adaptations to HtmlJavascript and HtmlCss there
        url: '',

        //header above the frame
        header : '{{discuss_header{\nLeave a comment at tiddler [[%0]]...\n}}}',

        //default css for the iframe
        css: {
            width: '100%',
            height: '400px',
            border: '0',
            marginTop: '1em'
        }
    },

    //the macro handler
    handler: function (place, macroName, params, wikifier, paramString, tiddler) {
        var $btn, $p, tid,
            //reference to config
            cfg = this.config,
            //tiddler title
            title = tiddler ? tiddler.title : '',
            //get params
            p = paramString.parseParams('anon',null,true),
            //whether to always show comments directly
            always = getParam(p, 'always',cfg.always),
            //try to get template 
            template = store.getTiddlerText(getParam(p,'template',''));

        //when count
        if (params[0] == 'count'){
            //render count
            this.count(params[1], place);
            //done
            return;
        }

        //no tiddler no disqus
        if(!title||!store.getTiddler(title)) return;

        //create panel
        $p = $('<div class="discuss_panel"/>')
            //store details in attribs
            .attr({
                url: getParam(p, 'url', cfg.url) + '/' +
                encodeURIComponent(title),
                title: title
            })
            .css('marginTop','1em')
            //add to place
            .appendTo( $(place) );

        //when always shown
        if(always){
            //output the header only when there's slider button
            wikify(
                cfg.header.format([title]),
                $p[0]
            );
            //render iframe into panel
            this.render($p[0]);

        //otherwise
        } else {
            //render slider button
            $btn = $('<div/></div>')
                //with tooltip
                .attr({
                    'class': 'button discuss_button',
                    title: cfg.tipSlider.format([title])
                })
                //looks clickable
                .css({
                    cursor:'pointer',
                    padding:'0.5em 1%',
                    width:'98%'
                })
                //add to panel
                .appendTo($p)
                //assign click handler
                .click(this.show);

            //render slider button template
            wikify(
                //take user defined or default
                (template ? template : cfg.tplSlider).format([title]),
                $btn[0]
            )
        }
    },

    //rendering the comments iframe
    render: function(place, toggle){
        var
            //reference to config
            cfg = config.macros.discuss.config,
            //find panel
            $panel = $(place).closest('.discuss_panel');

        //create the iframe
        $('<iframe/>')
            //don't show yet
            .hide()
            //apply the styles
            .css(cfg.css)
            //set source
            .attr({ src: $panel.attr('url') })
            //add to frame
            .appendTo($panel)
            //now show
            .slideDown();
    },

    //how iframe
    show: function(e){
        console.log('click');
        var
            //the button
            $btn = $(this),
            //the actual click-target
            $target = $(resolveTarget(e || window.event));

        //link inside was clicked
        if(!$target.is('.discuss_button, .discuss_count') && $target.is('a') )
            // don't handle
            return true;

        //render the comments panel
        config.macros.discuss.render($btn[0], true);
        //no toggle, just leave
        $btn.remove();
        //in any way, get out without redirect
        return false;
    },

    //outputs a comment count as a link
    count: function(title, place){
        config.extensions.tiddlyweb.getStatus(function(){
            var s,
                spacename = config.extensions.tiddlyspace.currentSpace.name,
                host = config.extensions.tiddlyspace.getHost(
                    config.extensions.tiddlyweb.status.server_host,
                    spacename
                );

            $('<a/>').attr({
                'class': 'discuss_count',
                'data-disqus-identifier': title,
                'href': host + "/" + encodeURIComponent(title) + "#disqus_thread"
            }).appendTo(place);
            
            s = document.createElement('script');
            s.async = true;
            s.type = 'text/javascript';
            s.src = 'http://' + spacename + '-tiddlyspace.disqus.com/count.js';
            console.log(s);
            (document.getElementsByTagName('HEAD')[0] || document.getElementsByTagName('BODY')[0])
                .appendChild(s);
        });
    }
}

})(jQuery);
//}}}