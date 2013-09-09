/***
|''Name''|CodePlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|shows or runs a (commented) code block|
|''Documentation''|http://tobibeer.tiddlyspace.com/#Code|
|''Version''|0.3.1 (2013-09-09)|
|''~CoreVersion''|2.5.2|
|''License''|Creative Commons 3.0|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/CodePlugin.js|
{{{
<<code>>
}}}
outputs as...
<<code>>/%
!Code
***/
//code macro
config.macros.code = {

    //localisation
    lingo: {
        err: "No Code!",
        errDetails: "No contents found at '%0'!"
    },

    //the default section holding the code
    at: '##Code',
    //the output format
    show: '<html><pre>\n%0\n</pre></html>',

    //the macro handler
    handler: function (place, macroName, params, wikifier, paramString, tiddler) {
        var where,
	    	//this tiddler dom element
	    	tid = story.findContainingTiddler(place),
	    	//parse params
	    	p = paramString.parseParams('anon', null, true),
	    	//get code to run from tiddler, section or slice
	    	run = getParam(p, 'run', ''),
			//get tiddler, section or slice to be shown
			at = getParam(p, 'at', '');

        //get code from
        where =
			//code to be run
			run ?
            run :
			(
				//code elsewhere...
				at ?
            at :

				//or default code for current tid
				(tid ? tid.getAttribute('tiddler') : '') + this.at
			);

        //run when defined via named param or as simple "run" command
        run = run || params.contains('run');

        //try to get it
        code = store.getTiddlerText(where);

        //code not found?
        if (!code) {
            //error
            createTiddlyError(
				place,
				this.lingo.err,
				this.lingo.errDetails.format([where])
			)

        //no code found?
        } else {
            //sanitize => remove any end of hidden or formatted section
            code = code.replace(/^(\*\*\*\/)|^(\%\/)/, '');

            //remove any comment wrap
            if (code.substr(0, 3) == '{{{' && code.substr(code.length - 3) == '}}}')
                code = code.substr(3, code.length - 6);

            //remove leading or  trailing blanks
            code = jQuery.trim(code);

            //run code?
            if (run) {
                //output
                wikify(code, place);

                //show code
            } else {
                //render wrapped
                wikify(this.show.format([code.htmlEncode()]), place)
            }
        }
    }
}
//%/