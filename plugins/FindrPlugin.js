/***
|''Name''|FindrPlugin|
|''Description''|display search results in a list with more flexibility|
|''Documentation''|http://findr.tiddlyspace.com|
|''Authors''|Tobias Beer|
|''Version''|1.0.0 (2013-10-10)|
|''CoreVersion''|2.5.2|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/FindrPlugin.js|
|''License''|[[Creative Commons Attribution-ShareAlike 3.0 License|http://creativecommons.org/licenses/by-sa/3.0/]]|
!Code
***/
//{{{
(function($){

var me = config.extensions.findr = {
	//SETTINGS

	//a selector for where to insert the search results, non-destructively
	where:'',
	//where to prepend by default (if where is undefined)
	fallback: "#displayArea",
	//how to insert the results, either prependTo, appendTo, insertBefore or insertAfter
	how: 'prependTo',
	//a selector to hide while search results are displayed
	hide: '',
	//whether to empty the container
	empty: false,
	//enable listfiltr
	listfiltr: true,

	//the ids
	id: "searchResults",
	idClose: "search_close",
	idOpenAll: "search_open",

	//LOCALISATION
	fmtHeader: "\n!Search Results",
	fmtMessage: "\n''%0''",						//%0 the message
	fmtItem: "\n* [[%0]]",						//%0 the tiddler title
	fmtItems: "\n{{search_list{%0\n}}}\n",		//%0 all items
	fmtQuery: "'%0'",							//%0 the query
	fmtRegExp: "/%0/",							//%0 the regexp query

	btnCloseLabel: "close",
	btnCloseTooltip: "dismiss search results",
	btnOpenLabel: "open all",
	btnOpenTooltip: "open all search results",

	displayResults: function(matches, query, re) {
		var btns, msg, out, items = '',
			//where to render the search results
			where = $(me.where).first();
		
		//first close
		$('#' + me.id).remove();

		//update highlighting
		story.refreshAllTiddlers(true);

		// prevent WikiLinks
		query = '"""%0"""'.format(
			me[re ? 'fmtQuery' : 'fmtRegExp'].format(
				re ? me.fmtRegExp.format(query) : query
			)
		);

        //hide elements to be hidden
        $(me.hide).hide();

		//fallback: use defined element as parent
		if(!where.length)
			where = $(me.fallback);

		//empty when desired
		if(me.empty)where.empty();

		//create results container
		el = $("<div/>").attr('id', me.id);

		//how to insert the results
		switch(me.how){
			case 'insertAfter':
				el.insertAfter(where);
				break;
			case 'insertBefore':
				el.insertBefore(where);
				break;
			case 'appendTo':
				el.appendTo(where);
				break;
			default:
				el.prependTo(where);
		}

		//get non-jquery object
		el = el[0];

		//found results
		if(matches.length > 0) {
			//add success message
			msg = me.fmtMessage.format(
				config.macros.search.successMsg.format([
					matches.length.toString(),
					query
				])
			);
			//init results
			me.results = [];
			//loop results
			matches.map(function(match){
				//add item
				me.results.push(match.title);
				//add to output
				items += me.fmtItem.format(match.title);
			});
		//not found
		} else {
			//add failure message
			msg = me.fmtMessage.format(
				config.macros.search.failureMsg.format([query])
			);
		}

		btns = createTiddlyElement(el,'div', "findrButtons");
		//create close button
		createTiddlyButton(
			btns,
			me.btnCloseLabel,
			me.btnCloseTooltip,
			me.closeResults,
			"button",
			me.idClose
		);
		//when there are results
		if(matches.length > 0) {
			//create open-all button
			createTiddlyButton(
				btns,
				me.btnOpenLabel,
				me.btnOpenTooltip,
				me.openAll,
				"button",
				me.idOpenAll
			);
		}
		
		out = 
			me.fmtHeader + 
			msg +
			me.fmtItems.format(items) +
			(me.listfiltr && config.macros.listfiltr ? '<<listfiltr>>' : '');


		wikify(out,el);
	},

	//close search results
	closeResults: function() {

		//show previous container contents
		$(me.hide).show();
		//the result list
		var results = $('#' + me.id),
			//a tiddler it may be contained in
			tid = results.closest('[refresh="content"]')[0];

		//is there any? => refresh
		if(tid) config.refreshers.content(tid);

		//remove search results
		results.remove();

		//empty array
		me.results = null;
		highlightHack = null;
	},


	//open all search results
	openAll: function(ev) {
		story.displayTiddlers(null, me.results);
		return false;
	}
}

//override Story.search()
Story.prototype.search = function(text, useCaseSensitive, useRegExp) {
	highlightHack = new RegExp(
		useRegExp ? text : text.escapeRegExp(),
		useCaseSensitive ? "mg" : "img"
	);
	me.displayResults(
		store.search(highlightHack, null, "excludeSearch"),
		text,
		useRegExp
	);
};

// override TiddlyWiki.search() to sort by relevance
TiddlyWiki.prototype.search = function(searchRegExp, sortField, excludeTag, match) {
	var results,
		prio = [ [], [], [] ],
		results = this.reverseLookup("tags", excludeTag, !!match);

	//something to sort by
	if(sortField) {
		//sort
		results.sort(function(a, b) {
			return
				a[sortField] < b[sortField] ?
				-1 :
				(a[sortField] == b[sortField] ? 0 : +1);
		});
	//no sort field
	} else {
		//use priority search
		results.map(function(c){
			//primary = matching title
			if(-1 != c.title.search(searchRegExp)) {
				prio[0].push(c);
			} else
			//secondary = matching tag
			if(-1 != c.tags.join(",").search(searchRegExp)) {
				prio[1].push(c);
			} else
			//tertiary = matching text
			if(-1 != c.text.search(searchRegExp)) {
				prio[2].push(c);
			}
		});
		results = prio[0].concat(prio[1]).concat(prio[2]);
	}
	return results;
};


})(jQuery);
//}}}