/***
|''Name''|FindrPlugin|
|''Description''|display search results in a list with more flexibility|
|''Documentation''|http://findr.tiddlyspace.com|
|''Authors''|Tobias Beer|
|''Version''|1.1.0 (2013-10-11)|
|''CoreVersion''|2.5.2|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/FindrPlugin.js|
|''License''|[[Creative Commons Attribution-ShareAlike 3.0 License|http://creativecommons.org/licenses/by-sa/3.0/]]|
!Code
***/
//{{{
(function($){

//shortcut to self
var me = config.macros.findr = {

	//SETTINGS
	config:{
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
		//whether to also search in these custom fields
		fields:'',
		//exclude
		exclude:'excludeSearch',
		//whether to show items by these categories in this order
		//leave empty to not show categories at all
		categories: 'title tags text fields',
		//the field by which to sort (any standard field)
		sort: 'title',

		//IDs & classes
		id: "searchResults",
		idClose: "search_close",
		idOpenAll: "search_open",

		//LOCALISATION
		fmtHeader: "\n!Search Results",
		fmtMessage: "\n''%0''",						//%0 the message
		fmtItems: "\n{{search_list{%0\n}}}\n",		//%0 all items
		fmtItem: "\n* [[%0]]",						//%0 the tiddler title
		fmtCategory: "\n;%0",						//%0 the cat, e.g. title, tags, text or fields
		fmtItemByCat: "\n:[[%0]]%1",				//%0 the item when displayed by category
													//%1 the cat details, i.e. tags or fields
		fmtDetails: " {{search_details{(%0)}}}",	//%= the details, either tags fields
		fmtQuery: "'%0'",							//%0 the query
		fmtRegExp: "/%0/",							//%0 the regexp query

		btnCloseLabel: "close",
		btnCloseTooltip: "dismiss search results",
		btnOpenLabel: "open all",
		btnOpenTooltip: "open all search results",

		cattitle: "in the title...",
		cattags: "in tags...",
		cattext: "in the text...",
		catfields: "in fields...",

		//category details
		catfieldsField: "''%0'' ",
		cattagsTag: "<<tag [[%0]]>> "
	}
}

merge(config.macros.findr, {

	//the macro handler
	handler: function (place, macroName, params, wikifier, paramString, tiddler) {
		wikify('<<search>>', place);
	},

	//handles search output
	displayResults: function (matches, query, re, options) {
		var btns, msg, out, items = '',
			//get categories
			cats = options.categories || '',
			//where to render the search results
			where = $(options.where).first(),
			//init matches
			numResults = 0,
			//and tids
			tids = [],
			//all matches
			all = [];


		//loop all matched categories
		$.each(matches, function (cat, catMatches) {
			//add to any
			numResults += catMatches.length;
			//no categories => add to all
			if(!cats) all.concat(catMatches);
		});

		//first => close, if existing
		$('#' + options.id).remove();

		//update highlighting
		story.refreshAllTiddlers(true);

		// prevent WikiLinks
		query = '"""%0"""'.format(
			options[re ? 'fmtQuery' : 'fmtRegExp'].format(
				re ? options.fmtRegExp.format(query) : query
			)
		);

		//hide elements to be hidden
		$(options.hide).hide();

		//fallback: use defined fallback as parent
		if (!where.length)
			where = $(options.fallback);

		//empty when desired
		if (options.empty)
			where.empty();

		//create results container
		el = $("<div/>").attr('id', options.id);

		//depending how to insert the results, add as...
		switch (options.how) {
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

		//create inner wrapper
		el = $('<div class="findr"/>').appendTo(el);

		//get non-jquery object
		el = el[0];

		//any results?
		if (numResults) {
			//add success message
			msg = options.fmtMessage.format(
				config.macros.search.successMsg.format([numResults,query])
			);
			//init results
			options.results = [];

			//loop given categories (or default order)
			(cats ? cats : 'tids')
				.readBracketedList()
				.map(function (cat) {
					//get results for this category
					var catMatches = cat == 'tids' ? all : matches[cat]||[],
						field = options.sort,
						desc = field.substr(0,1) == '-';
					if(desc)field=field.substr(1);

					//sort by default field
					catMatches.sort(function(a, b) {
						var result =
							a[0][field].toLowerCase() < b[0][field].toLowerCase() ?
							(desc ? +1 : -1) :
							(
								a[0][field].toLowerCase() == b[0][field].toLowerCase() ?
								0 :
								(desc ? -1 : +1)
							);

						return result;
					});
					//when global categories defined and having entries
					if (cats && catMatches.length) {
						//show category header
						items += options.fmtCategory.format(options['cat' + cat]);
					}
					//loop result category items
					catMatches.map(function (result) {
						var
							//init details strin
							d = '',
							//the tid
							tid = result[0];

						//loop details
						(result[1] || []).map(function (detail) {
							d += options[cat == 'tags' ? 'cattagsTag' : 'catfieldsField']
								.format(detail);
						});
						//add item
						tids.push(tid.title);
						//add either catitem order standard item to output
						items += options[cats ? 'fmtItemByCat' : 'fmtItem']
							//formatted with
							.format(
								//the tiddler title
								tid.title,
								//and any details, if present, or none
								d ? options.fmtDetails.format($.trim(d)) : ''
							);
					});
				});
		//not found
		} else {
			//add failure message
			msg = options.fmtMessage.format(
				config.macros.search.failureMsg.format([query])
			);
		}

		//create button group
		btns = createTiddlyElement(el, 'div', 'findr-buttons');
		//create close button
		createTiddlyButton(
			btns,
			options.btnCloseLabel,
			options.btnCloseTooltip,
			me.closeResults,
			"button",
			options.idClose
		);
		//when there are results
		if (numResults) {
			//create open-all button
			createTiddlyButton(
				btns,
				options.btnOpenLabel,
				options.btnOpenTooltip,
				me.openAll,
				"button",
				options.idOpenAll
			);
		}

		//format the output
		out =
			options.fmtHeader +
			msg +
			options.fmtItems.format(items) +
			(options.listfiltr && config.macros.listfiltr ? '<<listfiltr>>' : '');

		//render the results
		wikify(out, el);

		//remember all tids
		$(el).data({
			tids: tids,
			options: options
		});
	},


	//close search results
	closeResults: function (ev) {
		//the result list
		var
			//get the options
			options = $(this).closest('.findr').data('options'),
			//the search results panel
			panel = $('#' + options.id),
			//find any tiddler it is be contained in
			tid = panel.closest('[refresh="content"]')[0];

		//show previous container contents
		$(options.hide).show();

		//outer tid? => refresh
		if (tid) config.refreshers.content(tid);

		//remove search results
		panel.remove();

		highlightHack = null;
	},

	//open all search results
	openAll: function (ev) {
		//get result tids as stored in data
		tids = $(this).closest('.findr').data('tids');
		//display all
		story.displayTiddlers(null, tids);
		return false;
	},

	// custom search leaving core search unaffected
	search: function (searchRegExp, match, options) {
		var results = {
			title: [],
			tags: [],
			text: [],
			fields: [],
		},
		//get excluded as array
		ex = options.exclude.readBracketedList(),
		//get search fields as array
		fx = options.fields.readBracketedList(),
		//helper function to add to results by category
		add = function (tid, cat, details) {
			results[cat].push([tid, details]);
		};
		//loop all tids
		store.forEachTiddler(function (title,tid) {

			//when excluded
			if (
				ex.contains(tid.title) ||
				ex.containsAny(tid.tags)
			//next
			) return true;

			//primary
			if (-1 != tid.title.search(searchRegExp)) {
				//add matching title
				add(tid, 'title');

			//secondary
			} else 
			//add matching tag
			if (-1 != tid.tags.join(", ").search(searchRegExp)) {
				add(tid, 'tags', tid.tags);
			} else 
			//tertiary
			if (-1 != tid.text.search(searchRegExp)) {
				//add matching text
				add(tid, 'text');
			//quaternary
			} else
			//add matching fields
			if (fx.length && tid.fields) {

				//initialise array of matching fields
				var fields = [];
				//loop tiddler fields
				$.each(tid.fields || {}, function (key, val) {
					//when
					if (
						//contained in search fields
						fx.contains(key) &&
						//and content matches query
						-1 != (val||'').search(searchRegExp)
					) {
						//remember matching field
						fields.push(key);
					}
				})
				//any matching fields found?
				if (fields.length)
					//add to results
					add(tid, 'fields', fields);
			}
		});

		//return the results object
		return results;
	}
});

//override Story.search()
Story.prototype.search = function(text, useCaseSensitive, useRegExp) {
	//create a regexp to match against
	highlightHack = new RegExp(
		useRegExp ? text : text.escapeRegExp(),
		useCaseSensitive ? "mg" : "img"
	);
	//display the search results
	me.displayResults(
		//for this query, using the global options
		me.search(highlightHack, 'text', me.config),
		//the query term
		text,
		//whether or not regexp search is enabled
		useRegExp,
		//pass down global configuration options
		me.config
	);
};

//hijack keypress in search to remove when empty
config.macros.search.onKeyPressFINDR = config.macros.search.onKeyPress;
config.macros.search.onKeyPress = function(ev) {
	//set search event
	$(this).off('search').on('search', config.macros.search.onKeyPress);

	if(this.value.length < 3){
		var panel = $('#' + me.config.id);
		if(panel.length){
			$('#' + me.config.idClose).click();
		}
	} else {
		config.macros.search.onKeyPressFINDR.apply(this, arguments);
	}
};


})(jQuery);
//}}}