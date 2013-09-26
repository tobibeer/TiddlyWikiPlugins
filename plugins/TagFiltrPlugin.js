/***
|''Name''|TagFiltrPlugin|
|''Description''|tag-based faceted tiddler navigation based on FND's tagsplorer|
|''Documentation''|http://tagfiltr.tiddlyspace.com|
|''Author''|Tobias Beer|
|''Version''|1.4.6 (2013-09-25)|
|''CoreVersion''|2.6.2|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/TagFiltrPlugin.js|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
<<tagfiltr>>
***/
/*{{{*/
(function($) {

//reference to self
var me = config.macros.tagfiltr = {};

//define macro namespace
config.macros.tagfiltr = $.extend(me, {

	//the output format for a list item
	exclude: 'excludeLists',
	filter: '',
	listfiltr: true,

	tags: '',
	hide:'',
	fix: false,

	groups: 'TagFiltrConfig##Groups',
	onlyGroups: false,

	format: '[[%0]]',

	//translation
	lblTags: "tags:",
	lblAdd: "+",
	tipAdd: "add tag to filter",
	tipPrefix: "select tag from group",
	tipRemove: "remove tag from filter",
	tipFix: "this tag cannot be removed",

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var d={}, ref, $t, tx = {},
			//parse params
			px = paramString.parseParams('anon', null, true),
			//get template parameter
			tpl = getParam(px, 'template', ''),
			//find viewer
			inStory = $(place).closest('#tiddlerDisplay').length;

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
			'filter',
			'listfiltr|lf',

			'tags',
			'fix',
			'hide',

			'groups',
			'onlyGroups|bG',
			'lblTags',

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
			if (params.contains(x)) {
				//set as true anyways
				d[pa] = true;
			}
		});

		//all boolean params
		[
			//only tids in groups
			'bG',

			//listfiltr
			'lf'
		//loop params
		].map(function (b) {
			//set depending on whether true
			d[b] = 'true' == d[b].toString();
		});

		//create output
		$t = $('<div class="tagfiltr" />')
			.append('<b class="tp_tags_label" />')
			.children(":last")
			.text(d.lblTags).end()
			.append('<div class="tf-tags" />')
			.append('<ul class="tf-tids" />').attr({
				//set wrapper attributes for refresh
				'refresh': 'macro',
				'macroName': 'tagfiltr',
				'params': paramString
			});

		//turn string for excluded and tags into arrays
		d.ex = d.ex.readBracketedList();
		d.hide = d.hide.readBracketedList();

		d.tags = d.tags.readBracketedList();

		//if any to be fixed
		if(d.fix)
			//when fix:"foo bar" defined, turn into array
			//otherwise when just fix or fix==true, set given tags as fixed
			d.fix = typeof d.fix === 'string' ? d.fix.readBracketedList() : d.tags.slice();
		//otherwise
		else
			//set to empty array
			d.fix=[];


		//fix but no tags defined?
		if(d.fix.length && !d.tags.length)
			//take tags from fixed
			d.tags = d.fix.slice();

		//when external format contents
		if(d.fmt.toLowerCase().indexOf('tiddler=') == 0){
			//get fixed reference
			ref = me.getRef(d.fmt.substr(8), tpl);
			//fetch from tiddler, section or slice
			d.fmt = store.getTiddlerText( ref );
		}

		//set format as given, fetched or default
		d.fmt = d.fmt || me.format;

		//just to be safe, initialise all group indexes
		$.extend (d, {
			//defined
			g_def: {},
			//all
			g_all: {},
			//tag groups
			g_tags: {},
			// groups with matches
			g_match: {}
		});

		//get groups from fixed reference
		(store.getTiddlerText( me.getRef(d.groups, tpl) )  || '')
			//split by newline and loop
			.split('\n').map(function(g){
				//split group definition by pipe
				g = $.trim(g).split('|');
				var p = $.trim(g[0]),
					group = $.trim(g[1]),
					title = p && !g[2] ? p + group : $.trim(g[2]?g[2]:group),
					key = p ? p : group;
				//must be at least two, otherwise ignore line
				if(g.length > 1){
					//add group as object with title and prefix
					d.g_def[ key ] = {
						//set title and prefix properties
						'title': title,
						'group': group,
						'prefix': p
					}
				}
			});

		//output tagfiltr
		$t.appendTo(place)
			//no doubleclick
			.dblclick(function(e){return false;});

		//set data
		$t.data(d);

		//only refresh when not in story column on startup
		//otherwise invoked twice by core
		if ( !(startingUp && inStory) )
			//run refreshers
			me.refresh($t, true);
	},

	//refreshes tagfiltr upon changes
	refresh: function($t, init) {

		//when invoked by refresh handler
		if(!$t.html) $t = $($t);

		//update index of tags tagging to a group
		me.getGroupTags($t);

		var $li, tags, tids, $tls,
			d = $t.data(),
			$tags = $t.find(".tf-tags"),
			$tids = $t.find(".tf-tids"),
			$gs = $t.find('.tf-groups');

		//remove any non-group buttons from tags
		$('.tf-tag, .tf-add', $tags).remove();

		//no group wrapper yet
		if(0 == $gs.length){
			//add to tags
			$gs = $('<span class="tf-groups"/>').appendTo($tags);

			//loop groups as [group => group properties]
			$.each(d.g_def, function(g, ps) {
				var
					//get prefix from properties
					p = ps.prefix || '',
					//or title
					ti = ps.title,
					//get group title as either prefix+title or group tag
					title = ti ? ti : (p ? p + ps.group : g);

				//create tag button for this group
				me.newTagButton(
					$gs,
					title,
					me.tipPrefix,
					me.clickTag,
					'button'
				)
					.data({
						//the group title
						'group': title,
						//init matching tags
						'tags':[],
					})
					.attr({
						//group index is either prefix or group
						'group': p ? p : g
					});
			});
		}

		//loop tags
		d.tags.map(function (tag) {
			//tag fixed?
			var fix = d.fix.contains(tag);

			//only when
			if(
				//there's not yet a group button for that tag
				0 == $t.find('.tf-groups [tag="' + tag + '"]').length &&
				//and not hidden
				!d.hide.contains(tag)
			){
				//create button
				me.newTagButton(
					$tags,
					tag,
					fix ? me.tipFix : me.tipRemove,
					me.removeTag,
					'button tf-tag' + (fix ? ' tf-fix' : '')
				//remember tag
				).attr('tag', tag);
			}
		});

		//remove tids
		$tids.empty();

		$tls = $('<div class="tf-listfiltr"/>').appendTo($tids);

		if(d.fmt == me.format)$tids.addClass('tf-default');

		//get new tids
		tids = me.getTiddlers($t);

		//get tids for tags and loop them
		tids.map(function(tid) {
			$li = $('<li/>').appendTo($tls);
			//wikify
			wikify(
				//tiddler entry
				d.fmt.format([tid.title]),
				//into list item in tid list
				$li[0]);
		});

		//on init
		if(init){
			//loop all group buttons
			$('.tf-group',$t).each(function(){
				//the button
				var $tag = $(this);
				//when button hidden
				if(d.hide.contains($tag.attr('tag'))){
					//hide it
					$tag.hide();
				}
			})
		}

		//hide tag buttons in the list results, too
		d.hide.map(function(tag){
			$('a.button[tag="' + tag + '"]',$tids).hide();
		});

		//when listfitlr enabled and installed 
		if(d.lf && config.macros.listfiltr)
			//render it
			wikify('<<listfiltr>>', $tids[0]);

		//get tags for remaining tids
		tags = me.getTagSelection($t, tids);
		//when there are any
		if(tags.length){
			//create button to add one of the remaining tags (default tagsplorer)
			me.newTagButton(
				//in button container
				$tags,
				//with label and tooltip
				me.lblAdd,
				me.tipAdd,
				//define action via jQuery
				null,
				'button tf-add'
			)
				//add tags to button data
				.data('tags',tags)
				//add action
				.click(me.clickTag);
		}

	},

	//tag button click
	clickTag: function(ev) {
		var pop, was, $tag,
			$btn = $(this),
			$t = $btn.closest('.tagfiltr'),
			d = $t.data(),
			group = $btn.data('group');

		//fixed button? => do nothing
		if($btn.hasClass('tf-fix'))return false;

		//already selected group tag clicked?
		if($btn.hasClass('tf-selected')){

			//get text of all selected buttons
			was = $('.tf-selected',$t).text();

			//remove tag
			me.removeTag(0, $btn);

			//unselect
			me.setGroupButton($btn);

			//refresh tagfiltr
			me.refresh($t);

			//selection didn't change?
			if(was == $('.tf-selected',$t).text()){
				//get last tag-button
				$tag = $('.tf-tag', $t);

				//if there is any
				if ($tag.length){
					//try to remove that first
					$tag.click();

				//otherwise when there is a last clicked group button
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

		//otherwise when unselected tag
		} else {
			//show the popup
			me.openPopup($t, this);
			//no bubbling
			ev.stopPropagation();
			return false;
		}
	},

	openPopup: function($t, btn){
		var 
			//get button
			$btn = $(btn),
			//create new popup
			pop = Popup.create(btn, 'ul');
		
		//set popup data
		$(pop).data({
			//reference to tagfiltr and button
			'tagfiltr': $t,
			'button': $btn
		});
		
		//loop button tags
		$btn.data('tags').map(function(tag) {
			//add new popup button for this tag
			me.newTagButton(pop, tag , me.tipAdd, me.popClick);
		});

		//show the popup
		Popup.show();
	},

	//clicking a popup button
	popClick: function(ev) {

		var $tag = $(this),
			tag = $tag.text(),
			$popup = $tag.closest(".popup");
			d = $popup.data(),
			$t = d.tagfiltr,
			$btn = d.button,
			g = $btn.attr('group');
		
		//reuse the variable but now as tagfiltr data
		d = $t.data();

		//when group button => set button
		if(g) me.setGroupButton($btn, tag);

		//add tag to active tagfiltr tags
		d.tags.pushUnique( tag );

		//refresh tagfiltr, especially matching tiddlers
		me.refresh($t);

		//when group was clicked => remember last clicked button
		if(g) d.last = $btn;

		//scroll to the tagfilter
		if(config.options.chkAnimate && anim && typeof Scroller == "function")
			anim.startAnimating(new Scroller($t[0]));
		else
			window.scrollTo(0, ensureVisible($t[0]));
		
		if(ev.ctrlKey && $btn.hasClass('tf-add')){
			//close popup
			$popup.remove();
			//click add button agains
			$('.tf-add',$t).first().click();
		}

		//CTRL+CLick
		return !ev.ctrlKey;
	},

	//tag button click and general button removal
	//(e is event)
	removeTag: function(e, el) {
		var
			//get tag either as passed or as clicked element
			$btn = el ? $(el) : $(this),
			//get outer tagfiltr
			$t = $btn.closest(".tagfiltr"),
			//tagfiltr data
			d = $t.data();

		//when fixed
		if($btn.is('.tf-fix')){
			//remove all non-fixed
			//(that's what you get for clicking me ;-)
			$('.tf-tag', $t).not('.tf-fix').each(function(){
				d.tags.remove( $(this).text() );
			});

		//otherwise remove this tag from tags
		} else d.tags.remove( $btn.text() );

		//refresh only when actual button click
		if(!el) me.refresh($t);

		//no bubbling
		return false;

	},

	//gets tiddlers for current tags
	getTiddlers: function($t) {

		var $btn, $tag, t,
			tids = [],
			d = $t.data();

		//reset the index for all group tags
		d.g_all = {};
		//reset matches
		gm = d.g_match = {};

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
				//not a tids with excluded tags AND
				!(tid.tags && tid.tags.containsAny( d.ex )) &&

				//no tags selected yet OR tid has all those tags AND
				(1 > d.tags.length || tid.tags.containsAll( d.tags ) ) &&

				//not just group tids OR this tiddler is in a group
				(!d.bG || me.inGroup($t, tid, true) )
											//true = also index groups
			)
				//add
				tids.push(tid);
		})

		//only when any groups matched
		if(!$.isEmptyObject(gm)){

			//loop group definitions
			$.each(d.g_def, function(g, ps){

				//initialise array for matching tags
				var m = [];

				//if there are any matches
				if(gm[g])
					//loop keys from matches for this group
					$.each(gm[g], function(item){
						//add to matching tags
						m.push(item);
					})

				//find group button
				$btn = $t.find('.tf-tags [group="' + g + '"]');

				//when there are matching tags for this group
				if(m.length) {
					//sort them
					m.sort();
					//add all matched tags
					m.map(function(tag){
						//add to all tags index
						d.g_all[tag] = g;
					})
					//only when
					if(
						//one matching group tag AND
						1 == m.length &&
						//number of tids for it same as number of all tids AND
						tids.length == gm[g][m[0]].length &&
						//and no duplicate around yet
						!me.hasFixedDuplicate($t, m[0], g)
					//thus not yet active
					){
						//set tag
						me.setGroupButton($btn, m[0]);
					//otherwise
					} else {
						//unselect
						me.setGroupButton($btn);
					}

					//turn into visible group button
					$btn.addClass('tf-group')
						//and store the matching tags
						.data('tags', m);

					//any non-group tag button for the same tag?
					$tag = $('.tf-tag[tag="' + m[0] + '"]', $t);

					//if there is one
					if($tag.length){
						//out with it
						$tag.remove();
						//reset last clicked tag to this button
						d.last = $btn;
					}
				//when there are no matching tags
				} else {
					//hide group-button
					$btn.removeClass('tf-group')
						//remove matching tags
						.data('tags', undefined);
				}
			});
		}
		return tids;
	},

	//gets remaining tags of current tid selection
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
					//in excluded OR
					d.ex.contains(tag) ||
					//already in the prefix index OR
					d.g_all[tag] ||
					//already in the tagged index OR
					d.g_tags[tag] ||
					//already selected OR
					d.tags.contains(tag) ||
					//hidden from tagadder
					d.hide.contains(tag)
				)){
					//add unique tag to remaining tags
					tags.pushUnique(tag);
				}				
			})
		});
		//sort remaining tags
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

	//updates group index gor groups that are not prefix indexes
	getGroupTags :function($t){
		//get data
		var d = $t.data();

		//reset tag groups
		d.g_tags = {};

		//loop defined groups as [group => properties]
		$.each(d.g_def, function (g, ps) {
			//only unprefixed
			if (!ps.prefix) {
				//loop tags tagging to group
				store.getTaggedTiddlers(g).map(function (tag) {
					//add to group tag index, pointing to group
					d.g_tags[tag.title] = g;
				});
			}
		});
	},

	//checks a tiddlers tags for belonging to any group and also
	//1. searches for and indexes matchin group tags
	//2. sets fixed group tags
	inGroup: function($t, tid, index){
		var $btn,
			any = 0,
			//get groups
			d = $t.data();

		//when tid has tags
		if(tid.tags){
			//loop tid tags
			tid.tags.map(function (tag) {
				//loop groups
				$.each(d.g_def, function (g, ps) {
					var 
						//get prefix
						p = ps.prefix,
						//shortcut to matches
						gm = d.g_match;

					//when
					if (
						//this is a prefix group and tag starts with prefix OR
						p && tag.indexOf(g) == 0 ||
						//not a prefix group and tag matches a group tag
						!p && d.g_tags[tag] == g
					){
						//ok, found
						any = 1;
						//find the corresponding group button
						$btn = $t.find('.tf-tags [group="' + g + '"]');

						//but not one that already exists
						if(!p && me.hasFixedDuplicate($t, tag, g)){
							//hide it
							$btn.hide();
						//otherwise when this is a fixed tag
						} else if ( d.fix.contains(tag) ){
							//preselect...
							me.setGroupButton(
								//set fixed flag
								$btn.data('fixed',true)
									//set fixed class
									.addClass('tf-fix')
									//set fixed title
									.attr('title', me.tipFix),
								//with this tag
								tag
							);
						};

						//also index?
						if (index) {
							//if not existing, init collection of matching tids in this group
							if (!gm[g]) gm[g] = {};
							//if not existing, initialize tag entry as empty array
							if (!gm[g][tag]) gm[g][tag] = [];
							//add tiddler to matches
							gm[g][tag].push(tid.title);
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

	setGroupButton: function($btn, tag, force){
		//tag defined? => select
		if(tag){
			//set button text to tag
			$btn.text(tag)
				//also the tag attribute
				.attr('tag', tag)
				//set selected class
				.addClass('tf-selected');
		//tag undefined => deselect (only when not fixed or forced)
		} else if ( !$btn.data('fixed') || force) {
			//set button text to group text
			$btn.text( $btn.data('group') )
				//remove tag attribute
				.attr('tag', undefined )
				//and selected class
				.removeClass('tf-selected');
		}
	},

	//find duplicate buttons set to same tag
	hasFixedDuplicate: function($t, tag, g){
		var has,
			//find selected group tag buttons
			$tags = $t.find('.tf-tags .tf-selected');

		//loop all tag buttons
		$tags.each(function(){
			var $b = $(this);
			//when
			if(
				//not same button
				g != $b.attr('group') &&
				//is fixed
				$b.data('fixed') &&
				//but has same tag
				tag == $b.attr('tag')
			){
				//found one
				has = true;
			}
			return !has;
		});

		return has;
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
'!Groups\n' +
' -|realm\n' +
' &|area\n' +
' $|project' +
' +|opportunity\n' +
' §|stage\n' +
' ?|who\n' +
' /|where\n' +
' !|resolution\n' +
' #|status\n' +
' ^|prio\n' +
' @|context\n' +
' =|type\n';

config.shadowTiddlers.StyleSheetTagFiltr = '/*{{{*/\n' +
'.filtr {display:block;}\n' +
'.tagfiltr {padding:5px;}\n' +
'.tagfiltr ul {margin: 0;padding: 0;}\n' +
'.tagfiltr > b,\n' +
'.tf-tags,\n' +
'.tf-tags .button {float: left;margin: 0 0.25em 0 0;padding: 0 0.25em;}\n' +
'.tf-tags .tf-fix {border-color:[[ColorPalette::TertiaryPale]];pointer:default;}\n' +
'.tf-tags {padding-bottom: 0.5em;}\n'+
'.tf-tag {\nborder-top-right-radius:7px;\n-webkit-border-top-right-radius: 7px;\n-moz-border-radius-topright: 7px;\nborder-bottom-right-radius: 7px;\n-webkit-border-bottom-right-radius: 7px;\n-moz-border-radius-bottomright: 7px;}\n'+
'.tf-groups {padding-right:7px;float:left;}\n' +
'.tf-groups .button {display:none;}\n' +
'.tf-groups .tf-group {display:block;}\n' +
'.tf-groups .tf-selected {color:[[ColorPalette::SecondaryMid]];}\n' +
'.tagfiltr .tf-tids {clear:left;}\n' +
'.tf-default li {list-style-type:none;}\n'+
'.tf-default .tiddlyLink{display:block; padding: 1px 1px 1px 7px;}\n'+
'/*}}}*/';

store.addNotification("StyleSheetTagFiltr", refreshStyles);

})(jQuery);
/*}}}*/