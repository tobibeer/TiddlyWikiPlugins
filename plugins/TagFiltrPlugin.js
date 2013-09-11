/***
|''Name''|TagFiltrPlugin|
|''Description''|tag-based faceted tiddler navigation based on FND's tagsplorer|
|''Author''|Tobias Beer|
|''Documentation''|http://tagfiltr.tiddlyspace.com|
|''Version''|1.4.0|
|''Status''|beta|
|''CoreVersion''|2.6.0|
|''License''|Creative Commons 3.0|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/TagFiltrPlugin.js|
***/
/*{{{*/
(function($) {

//reference to self
var me = config.macros.tagfiltr = {};

//define macro namespace
config.macros.tagfiltr = $.extend(me, {

	//the output format for a list item
	exclude: 'excludeLists',

	tags: '',
	fix: false,

	prefixes: 'TagFiltrConfig##Prefixes',
	onlyPrefixed: false,

	format: '[[» %0|%0]]',

	//translation
	lingo: {
		lblTags: "tags:",
		lblAdd: "+",
		tipAdd: "add tag to filter",
		tipPrefix: "select tag from prefix",
		tipRemove: "remove tag from filter",
		tipFix: "this tag cannot be removed"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
	    var d={}, ref, $t, tx = {},
            //parse params
            px = paramString.parseParams('anon', null, true),
            //get template parameter
            tpl = getParam(px, 'template', '');

        //fetch template
        (store.getTiddlerText(tpl)||'')
            //split by newline
            .split('\n')
            //loop all lines
            .map(function(v){
                //split line by colon
                var l = v.split(':');
                //store into template vars
                tx[l[0]] = undefined != l[1] ? l[1] : true;
            });

        //all code vars as 'prettyName|short'
        [
            'exclude|ex',
            'tags',
            'fix',

            'prefixes',
            'onlyPrefixed|bP',

            'format|fmt'

        //loop all these vars
        ].map(function (v) {
            //split by pipe
            v = v.split('|');
            var
                //get parameter name
                x = v[0],
                //get short (or take full)
                pa = v[1] || v[0];

            //initialize param variable as given by params
            d[pa] = getParam( px, x,
                //fallback to template, if defined
                tpl && tx[x] ? tx[x] :
                    //otherwise fallback to default
                    (me[x] != undefined ? me[x] : '')
            );

            //if not a named parameter
            if (px[0]['anon'].contains(x)) {
                //set as true anyways
                d[pa] = true;
            }

        });

        //all boolean params
	    [
	        //prefixed only
	        'bP'
	    //loop params
	    ].map(function (b) {
	        //set depending on whether true
	        d[b] = 'true' == d[b].toString();
	    });

		//create output
		$t = $('<div class="tagfiltr" />')
			.append('<b class="tp_tags_label" />')
			.children(":last")
			.text(me.lingo.lblTags).end()
			.append('<div class="tf-tags" />')
			.append('<div class="tf-tids" />').attr({
			    //set wrapper attributes for refresh
			    'refresh': 'macro',
			    'macroName': 'tagfiltr',
			    'params': paramString
			});

		//turn string for excluded and tags into arrays
		d.ex = d.ex.readBracketedList();
		d.tags = d.tags.readBracketedList();

		//sewhen tags to be fixed are defined, turn into array
		//otherwise when fix==true, take tags as to be fixed
		d.fix = typeof d.fix === 'string' ? d.fix.readBracketedList() : d.tags.slice();

		//when external format contents
		if(d.fmt.toLowerCase().indexOf('tiddler=') == 0){
			//get fixed reference
			ref = me.getRef(d.fmt.substr(8), tpl);
			//fetch from tiddler, section or slice
			d.fmt = store.getTiddlerText( ref );
		}

		//set format as given, fetched or default
		d.fmt = d.fmt || me.format;

		//initialise prefix index
	    d.px = {
	    	//whith list for all prefix tags for easy access
	        tf_a: [],
	        //and list for all matching prefix tags
	        tf_m : {}
	    };

		//get prefixes from fixed reference
		(store.getTiddlerText( me.getRef(d.prefixes, tpl) )  || '')
			//split by newline and loop
			.split('\n').map(function(prefix){
			    //split prefix definition by pipe
			    prefix = $.trim(prefix).split('|');
			    //must be at least two, otherwise ignore line
			    if(prefix.length < 3){
			        //add prefix as object with title
			        d.px[ prefix[0] ] = {
			            title: prefix[1]
			        }
			    }
			});

		//output tagfiltr
		$t.appendTo(place)
			//no doubleclick
			.dblclick(function(e){return false;});

		//set data
		$t.data(d);

		//only when not on startup (otherwise invoked twice!)
		if(!startingUp)
			//run refreshers
			me.refresh($t, false);
	},

	//refreshes tagfiltr upon changes
	refresh: function($t, paramString) {

		//when invoked by refresh handler
		if(paramString) $t = $($t);

		var $li, tags, tids,
			d = $t.data(),
			$tags = $t.find(".tf-tags"),
			$tids = $t.find(".tf-tids"),
			$px = $t.find('.tf-prefixes');

		//empty tags panel
		$('.tf-tag, .tf-add', $tags).remove();

		//no prefix wrapper yet
		if(0 == $px.length){
			//add to tags
			$px = $('<span class="tf-prefixes"/>').appendTo($tags);

			//loop prefixes
			$.each(d.px, function(p, attr) {
				var cat = p + attr.title;

				//skip all and matched lists
				if(['tf_a','tf_m'].contains(p))return true;

				//create button
				me.newTagButton(
					$px,
					cat,
					me.lingo.tipPrefix,
					me.addTag,
					'button'
				)
					.data('tags',[])
					.attr({
					    'prefix': p,
					    'category': cat
					});
			});
		}

		//loop tags
		d.tags.map(function (tag) {
			//tag fixed?
			var fix = d.fix.contains(tag);
			//only when there's not yet a prefix button for that tag
			if(0 == $t.find('.tf-prefixes [tag="' + tag + '"]').length){
				//create button
				me.newTagButton(
					$tags,
					tag,
					fix ? me.lingo.tipFix : me.lingo.tipRemove,
					me.removeTag,
					'button tf-tag' + (fix ? ' tf-fix' : '')
				//remember tag
				).attr('tag', tag);
			}
		});

		//remove tids
		$tids.empty();
		if(d.fmt == me.format)$tids.addClass('tf-default');

		//get new tids
		tids = me.getTiddlers($t);

		//get tids for tags and loop them
		tids.map(function(tid) {
			//add button
			wikify(d.fmt.format([tid.title]), $tids[0]);
		});

		//get tags for remaining tids
		tags = me.getTagSelection($t, tids);
		//when there are any
		if(tags.length){
			//create button
			me.newTagButton(
				//in button container
				$tags,
				//with label and tooltip
				me.lingo.lblAdd,
				me.lingo.tipAdd,
				//add action
				me.addTag,
				'button tf-add'
			//add tags to button data
			).data('tags',tags);
		}
	},

	addTag: function(ev) {
	    var pop, was, $tag,
	    	$btn = $(this),
			$t = $btn.closest('.tagfiltr'),
			d = $t.data(),
			p = $btn.attr('prefix');

		//selected prefix tag click
		if($btn.hasClass('tf-selected')){

			//get text of all selected buttons
			was = $('.tf-selected',$t).text();

			//remove tag
			me.removeTag(0, $btn);

			//reset text to category
			$btn.text( $btn.attr('category') )
				//remove tag attribute 
				.attr('tag',undefined)
				//unselect
				.removeClass('tf-selected');
			//refresh tagfiltr
			me.refresh($t);

			//nothing changed?
			if(was == $('.tf-selected',$t).text()){
				//if there's a last tag-button
				$tag = $('.tf-tag', $t);

				//if there is any
				if ($tag.length){
					//remove that first
					$tag.click();

				//otherwise when there is a last clicked prefix button
				} else if(d.last && d.last.is('.tf-selected')) {
					//simulate clicking it
					d.last.click();

				//stuck?!?
				} else {

					//remove all tags and set to fixed
					d.tags = d.fix.slice();
					//refresh
					me.refresh($t);
				}
			}
			//out we go, closing any popups
			return true;

		//otherwise
		} else {

			//create new popup
			pop = Popup.create(this, 'ul');
			
		    //set popup data
		    $(pop).data({
				//pointing to tagfiltr
				'tagfiltr': $t,
		    	//remembering any prefix
				'prefix': p,
		    	//reference to button
				'button': $btn
	    	});
			
			//loop buttont ags
			$btn.data('tags').map(function(tag) {
				//add new button for all options
				me.newTagButton(pop, tag , me.lingo.tipAdd, me.popClick);
			});

			//show the popup
			Popup.show();
			//no bubbling
			ev.stopPropagation();
			return false;
		}
	},

	popClick: function(ev) {

		var $tag = $(this),
			tag = $tag.text(),
			$popup = $tag.closest(".popup");
			pd = $popup.data(),
			p = pd.prefix,
			$btn = pd.button,
			$t = pd.tagfiltr,
			d = $t.data();

		//when prefix button
		if(p){
			//set tag value as button text
			$btn.text(tag)
				//and attr
				.attr('tag',tag)
				//add selected class
				.addClass('tf-selected');
		}

		//add tag to tagiltr tags
		d.tags.pushUnique( tag );

		if(config.options.chkAnimate && anim && typeof Scroller == "function")
			anim.startAnimating(new Scroller($t[0]));
		else
			window.scrollTo(0, ensureVisible($t[0]));

		//refresh tagfiltr
		me.refresh($t);

		//when prefix was clicked => remember last clicked button
		if(p) d.last = $btn;

		//keep open unless control clicked
		return !ev.ctrlKey;
	},

	//tag button click and general button removal
	removeTag: function(e, el) {
		var
			//get tag either as passed or as clicked element
			$tag = el ? $(el) : $(this),
			//get outer tagfiltr
			$t = $tag.closest(".tagfiltr"),
			//tagfiltr data
			d = $t.data();

		//when fixed
		if($tag.is('.tf-fix')){
			//remove all non-fixed
			$('.tf-tag', $t).not('.tf-fix').each(function(){
				d.tags.remove( $(this).text() );
			});
		//otherwise remove this tag from tags
		} else d.tags.remove( $tag.text() );

		//update only when this button clicked
		if(!el) me.refresh($t);
		return false;

	},

	//gets tiddlers for current tags
	getTiddlers: function($t) {

		var $btn, $tag, t,
			tids = [],
			d = $t.data(),
			px = d.px;

		//reset matches
		pm = px.tf_m = {};
		px.tf_a = [];

		//with
		(
			//when filter
			d.filter ?
			//filtered tids
			store.filterTiddlers(d.filter) :
			//otherwise all tids
			store.getTiddlers('title')

		//loop tids
		).map(function(tid){

			//when
			if(
				//tids has tags but not any excluded tags AND
				!(tid.tags && tid.tags.containsAny( d.ex )) &&

				//no tags selected OR tid has all tags
				(1 > d.tags.length || tid.tags.containsAll( d.tags ) ) &&

			    //only prefixed tids and this tiddler has any prefix
				(!d.bP || me.hasPrefix($t, tid, true) )
                                //also indexes prefixes
			)
				//add
				tids.push(tid);
		})

		//only when any prefixes matched
		if(!$.isEmptyObject(pm)){

			//loop prefixes
			$.each(px, function(p, attr){

				//skip all and matches
				if(['tf_a','tf_m'].contains(p)) return true;

				//get matches for prefix
				var m = [];

				//if there are any matches
				if(pm[p])
					//get only prefix keys from matches
					$.each(pm[p], function(item){
						m.push(item);
					})

				//find button
				$btn = $t.find('.tf-tags [prefix="' + p + '"]');

				//sort them
				if(m.length) {
					m.sort();
					//add all matched tags
					m.map(function(tag){
						//to all prefixed tags
						px.tf_a.push(tag);
					})
					//only one matching prefix tag and
					//number of tids for it same as number of all tids
					if(1 == m.length && tids.length == pm[p][m[0]].length ){

						$btn.text(m[0])
							.attr('tag',m[0])
							.addClass('tf-selected');
					} else {
						$btn.text( $btn.attr('category') )
						.attr('tag', undefined )
						.removeClass('tf-selected');						
					}

					//set to visible prefix button
					$btn.addClass('tf-prefix')
						//remember tag
						.data('tags', m);

					//any actual tag button for the same tag?
					$tag = $('.tf-tag[tag="' + m[0] + '"]', $t);

					//if there is one
					if($tag.length){
						//out with it
						$tag.remove();
						//set last to this button
						d.last = $btn;
					}
				} else {
					//set button tags to matches
					$btn.removeClass('tf-prefix')
						.data('tags', undefined);
				}
			});
		}
		return tids;
	},

	//gets remaining tags of current tids
	getTagSelection: function($t, tids) {
		//initiate
	    var tags = [],
	    	d = $t.data();

		//loop tids
        tids.map(function(tid){
			//loop tid tags
			tid.tags.map(function(tag){
				//only when not...
			    if (!(
			    	//already an indexed prefix tag
			    	d.px.tf_a.contains(tag) ||
			    	//in excluded OR
			    	d.ex.contains(tag) ||
			    	//already in tags
			    	d.tags.contains(tag)
		    	)){
					//add  unique tag to tags
					tags.pushUnique(tag);
				}				
			})
		});
		//sort tags
		return tags.sort();
	},

	//creates a tag button
	newTagButton: function(where, label, tooltip, action, className) {
		//wrap in list item in popup
		if($(where).hasClass('popup'))
			where = $('<li/>').appendTo(where);

		//output tag link
		return $('<a href="javascript:;" />')
			.addClass(className || '')
			.attr('title', tooltip || '')
			.text(label)
			.click(action || null)
			.appendTo(where);
	},

	//checks a tiddlers tags for having a prefix
	//also searches for and collects all prefix tags
	hasPrefix: function($t, tid, index){
		var any = 0,
			px = $t.data('px');


		//when tid has tags
		if(tid.tags){
			//loop tid tags
		    tid.tags.map(function (tag) {
		        //loop prefixes
		        $.each(px, function (p, attr) {
		            //if tag starts with any prefix
		            if (tag.indexOf(p) == 0) {
		                //ok
		                any = 1;
		                //also index?
		                if (index) {
		                    //init object for matching tags
		                    if (!px.tf_m[p]) px.tf_m[p] = {};
		                    //when key not present
		                    if (!px.tf_m[p][tag]) px.tf_m[p][tag] = [];
		                    //add tag to matches
		                    px.tf_m[p][tag].push(tid.title);
		                }
		            }
		            return index || !any;
		        });
		        return index || !any;
		    });
		}
		//any found?
		return any;
	},

	//get reference, potentially to same tid
	getRef: function(r, tid){
		//strip outer lblanks
		r = $.trim(r);
		//when section of same tiddler => correct reference
		return (0 == r.indexOf('##') ? tid + r : r);
	}
})

//helper function to check if array contains all given items
Array.prototype.containsAll = function(items) {
	for(var i = 0; i < items.length; i++) {
		if (!this.contains(items[i])) {
			return false;
		}
	}
	return true;
};

config.shadowTiddlers.TagFiltrConfig =
'!Prefixes\n' +
' #|status\n' +
' ^|prio\n' +
' @|context\n' +
' &|area\n' +
' ?|who\n' +
' -|realm\n' +
' =|type\n' +
' !|resolution\n' +
' §|stage\n' +
' +|opportunity\n' +
' /|where\n' +
' $|project';

config.shadowTiddlers.StyleSheetTagFiltr = '/*{{{*/\n' +
'.filtr {display:block;}\n' +
'.tagfiltr {padding:5px;}\n' +
'.tagfiltr ul {margin: 0;padding: 0;}\n' +
'.tagfiltr > b,\n' +
'.tf-tags,\n' +
'.tf-tags .button {float: left;}\n' +
'.tf-tags .tf-fix {border-color:[[ColorPalette::TertiaryPale]];pointer:default;}\n' +
'.tf-tags {padding-bottom: 0.5em;}\n'+
'.tf-prefixes {padding-right:7px;float:left;}\n' +
'.tf-prefixes .button {display:none;}\n' +
'.tf-prefixes .tf-prefix {display:block;}\n' +
'.tf-prefixes .tf-selected {color:[[ColorPalette::SecondaryMid]];}\n' +
'.tagfiltr .tf-tids {clear:left;}\n' +
'.tf-default li {list-style-type:none;}\n'+
'.tf-default .tiddlyLink{display:block; padding: 1px 1px 1px 7px;}\n'+
'/*}}}*/';

store.addNotification("StyleSheetTagFiltr", refreshStyles);

})(jQuery);
/*}}}*/