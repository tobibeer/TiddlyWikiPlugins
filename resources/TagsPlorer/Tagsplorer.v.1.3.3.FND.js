/***
|''Name''|TagsplorerMacro|
|''Description''|tag-based faceted tiddler navigation|
|''Author''|FND|
|''Version''|1.3.3|
|''Status''|stable|
|''Source''|http://svn.tiddlywiki.org/Trunk/contributors/FND/plugins/TagsplorerMacro.js|
|''CodeRepository''|http://svn.tiddlywiki.org/Trunk/contributors/FND/|
|''License''|[[BSD|http://www.opensource.org/licenses/bsd-license.php]]|
|''CoreVersion''|2.6.0|
|''Keywords''|navigation tagging|
!Usage
{{{
<<tagsplorer [exclude:<tagName>] [tag] [tag] ... >>
}}}
!!Examples
<<tagsplorer exclude:excludeLists systemConfig>>
!Revision History
!!v1.0 (2010-03-21)
* initial release
!!v1.1 (2010-03-26)
* added sorting for tag and tiddler collections
* added section headings
* adjusted styling
!!v1.2 (2010-03-27)
* added exclude parameter for excludeLists support
!!v1.3 (2010-03-29)
* added automatic scrolling after tag selection
!To Do
* refresh handling
* "open all" functionality
* animations for new/removed tags/tiddlers (requires array diff'ing)
!StyleSheet
.tagsplorer {
	border: 1px solid [[ColorPalette::TertiaryLight]];
	padding: 5px;
	background-color: [[ColorPalette::TertiaryPale]];
}

.tagsplorer h3,
.tagsplorer ul {
	margin: 0;
	padding: 0;
}

.tagsplorer h3 {
	margin: 0 -5px;
	padding: 0 5px;
	border: none;
}

.tagsplorer h3.tags {
	float: left;
	margin-right: 1em;
}

.tagsplorer h3.tiddlers {
	margin-top: 5px;
	border-top: 1px solid [[ColorPalette::TertiaryLight]];
	padding-top: 5px;
}

.tagsplorer .tagSelection {
	overflow: auto;
	list-style-type: none;
}

.tagsplorer .tagSelection li {
	float: left;
}

.tagsplorer .tagSelection li a.tag {
	border: 1px solid [[ColorPalette::TertiaryLight]];
	border-top-right-radius: 0.7em;
	-webkit-border-top-right-radius: 0.7em;
	-moz-border-radius-topright: 0.7em;
	border-bottom-right-radius: 0.7em;
	-webkit-border-bottom-right-radius: 0.7em;
	-moz-border-radius-bottomright: 0.7em;
	padding: 0 0.5em 0 0.3em;
}

.tagsplorer .tiddlerList {
	margin-left: 1.5em;
}
!Code
***/
//{{{
(function($) {

config.shadowTiddlers.StyleSheetTagsplorer = store.getTiddlerText(tiddler.title + "##StyleSheet");
store.addNotification("StyleSheetTagsplorer", refreshStyles);

var macro = config.macros.tagsplorer = {};

config.macros.tagsplorer = $.extend(macro, {
	locale: {
		tagsLabel: "Tags",
		tiddlersLabel: "Tiddlers",
		newTagLabel: "[+]",
		newTagTooltip: "add tag to filter",
		delTagTooltip: "remove tag from filter",
		noTagsLabel: "N/A",
		noTiddlersLabel: "N/A"
	},

	handler: function(place, macroName, params, wikifier, paramString, tiddler) {
		var prms = paramString.parseParams("anon", null, true);
		var excludeTag = getParam(prms, "exclude", null);
		var tags = prms[0].anon || [];
		var tiddlers = getTiddlers(tags, excludeTag);

		var container = $('<div class="tagsplorer" />').
			append('<h3 class="tags" />').children(":last").
				text(this.locale.tagsLabel).end().
			append('<ul class="tagSelection" />').
			append('<h3 class="tiddlers" />').children(":last").
				text(this.locale.tiddlersLabel).end().
			append('<ul class="tiddlerList" />').
			data("excludeTag", excludeTag);

		macro.refreshTags(tags, container);
		macro.refreshTiddlers(tiddlers, container);

		container.appendTo(place);
	},
	newTagClick: function(ev) {
		var btn = $(this);
		var container = btn.closest(".tagsplorer");

		var tags = container.find(".tagSelection").data("tags");
		var tiddlers = container.find(".tiddlerList").data("tiddlers");
		var tagSelection = getTagSelection(tiddlers, tags);

		var popup = Popup.create(this, "ul");
		if(tagSelection.length) {
			$.each(tagSelection, function(i, tag) {
				createTagElement(popup, tag, macro.locale.newTagTooltip, macro.onTagClick);
			});
		} else {
			createTagElement(popup, macro.locale.noTagsLabel);
		}
		$(popup).data({
			container: container,
			tags: tags,
			tiddlers: tiddlers
		});
		Popup.show();
		ev.stopPropagation();
		return false;
	},
	onTagClick: function(ev) {
		var btn = $(this);
		var popup = btn.closest(".popup");
		var data = popup.data();
		var tag = btn.text();
		data.tags.pushUnique(tag);
		data.tiddlers = filterTiddlers(data.tiddlers, tag);
		if(config.options.chkAnimate && anim && typeof Scroller == "function") {
			anim.startAnimating(new Scroller(data.container[0]));
		} else {
			window.scrollTo(0, ensureVisible(data.container[0]));
		}
		macro.refreshTags(data.tags, data.container);
		macro.refreshTiddlers(data.tiddlers, data.container);
		return !ev.ctrlKey;
	},
	delTag: function(ev) {
		var btn = $(this);
		var container = btn.closest(".tagsplorer");
		var tags = container.find(".tagSelection").data("tags");
		tags.remove(btn.text());
		var tiddlers = getTiddlers(tags, container.data("excludeTag"));
		btn.parent().remove();
		macro.refreshTags(tags, container);
		macro.refreshTiddlers(tiddlers, container);
		return false;
	},
	refreshTags: function(tags, container) {
		var orig = container.find(".tagSelection");
		var clone = orig.clone().empty();
		clone.data("tags", tags);

		var self = this;
		$.each(tags, function(i, tag) {
			createTagElement(clone, tag, self.locale.delTagTooltip, self.delTag, "tag");
		});
		createTagElement(clone, this.locale.newTagLabel, this.locale.newTagTooltip, this.newTagClick).
			addClass("button");

		orig.replaceWith(clone);
	},
	refreshTiddlers: function(tiddlers, container) {
		var orig = container.find(".tiddlerList");
		var clone = orig.clone().empty();
		clone.data("tiddlers", tiddlers);

		if(tiddlers.length) {
			$.each(tiddlers, function(i, tiddler) {
				var el = $("<li />").appendTo(clone)[0];
				createTiddlyLink(el, tiddler.title, true);
			});
		} else {
			$("<li />").text(macro.locale.noTiddlersLabel).appendTo(clone);
		}

		orig.replaceWith(clone);
	}
});

var getTiddlers = function(tags, excludeTag) {
	var tiddlers = store.getTiddlers("title", excludeTag);
	for(var i = 0; i < tags.length; i++) {
		tiddlers = filterTiddlers(tiddlers, tags[i]);
	}
	return tiddlers;
};

var filterTiddlers = function(tiddlers, tag) {
	return $.map(tiddlers, function(item, i) {
		if(item.tags.contains(tag)) {
			return item;
		}
	});
};

var getTagSelection = function(tiddlers, exclude) {
	var tags = [];
	for(var i = 0; i < tiddlers.length; i++) {
		var _tags = tiddlers[i].tags;
		for(var j = 0; j < _tags.length; j++) {
			var tag = _tags[j];
			if(!exclude.contains(tag)) {
				tags.pushUnique(tag);
			}
		}
	}
	return tags.sort();
};

var createTagElement = function(container, label, tooltip, action, className) {
	var el = $("<li />").appendTo(container);
	return $('<a href="javascript:;" />').
		addClass(className || "").
		attr("title", tooltip || "").
		text(label).
		click(action || null).
		appendTo(el);
};

})(jQuery);
//}}}