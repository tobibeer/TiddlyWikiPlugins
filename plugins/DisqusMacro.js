/***
|''Name''|DiscussPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|outputs the (modified) html representation with disqus in an iframe for a tiddler on TiddlySpace|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/DiscussPlugin.js|
|''Documentation''|http://talk.tiddlyspace.com|
|''Version''|0.9.0 2013-08-28|
|''~CoreVersion''|2.5.2|
|''Requires''|TiddlySpace / TiddlyWeb|
|''License''|Creative Commons 3.0|
!Code
***/
//{{{
//define discuss macro
config.macros.discuss = {

    config:{
        //the url to the space
        //to not modify the HTML representation of your main space
        //create a "discussions only" space, e.g.
        //* create <yourspace-discuss>
        //* have it include <yourspace>
        //* make the adaptations to HtmlJavascript and HtmlCss there
        url: '',

        //the template for the iframe
        //%0 = space url
        //%1 = the tiddler url slug
        //%2 = css for the iframe
        iframe: '<html><iframe class="discuss" src="%0/%1" style="%2"></html>',

        //default css for the iframe
        css: 'width:100%;height:400px;border:none;margin-top:1em;',

        header : '{{discuss_header{\nLeave a comment at tiddler [[%0]]...\n}}}'
    },

    //the macro handler
    handler: function (place, macroName, params, wikifier, paramString, tiddler) {
        var p = paramString.parseParams('anon',null,true);

        //output the frame
        wikify(
            this.config.header.format([tiddler.title]) + 
            this.config.iframe.format([
                getParam(p,'url',this.config.url),
                encodeURIComponent(tiddler ? tiddler.title : ''),
                getParam(p,'css',this.config.css)
            ]),
            place
        );
    }
};
//}}}