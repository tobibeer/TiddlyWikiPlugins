/***
|''Name''|BacklogPlugin|
|''Description''|Provides a tiddler backlog or kanban with drag-and-drop capability|
|''Author''|Tobias Beer|
|''Version''|0.2|
|''Status''|beta|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/BacklogPlugin.js|
|''License''|http://creativecommons.org/licenses/by-sa/3.0/|
|''~CoreVersion''|2.5.0|
/*{{{*/
/*
!CSS
.backlog {
	float:none;
	clear:both;
	display:block;
}

.log_section {
    clear:left;
	background-color: [[ColorPalette::TertiaryPale]];
	margin: 0 0 15px 0; 
}

.log_section_title .tiddlyLink{
	text-align: left;
    padding: 7px 3px 5px 10px;
    font-size:2em;
    display: block;
    color:[[ColorPalette::TertiaryDark]];
}

.log_item_list {
	list-style: none; 
    margin: 0 3px;
	padding: 0;
}

.log_item { 
    background-color: [[ColorPalette::Background]];
 	margin: 5px 0 0 0;
    padding: 3px;
}

.log_item_title{
    display:block;
}

.log_item_title .tiddlyLink:hover{
    color:[[ColorPalette::PrimaryLight]];
    background:transparent;
}

.log_item_text{
    clear:left;
	font-size: 80%; 
}

.log_add_new .button {
    display:block;
    margin:0;
    padding:5px;
    border:0;
}

.log_section_title .tiddlyLink:hover,
.log_add_new .button:hover {
    color:[[ColorPalette::PrimaryMid]];
    background:[[ColorPalette::TertiaryLight]];
}

.kanban .log_section_title .tiddlyLink{
	text-align: center;
    padding:10px 3px;
}

.kanban .log_section{
    margin:0 0 0 5px;
    clear: none;
	float: left;
	display: inline;
}

!END_CSS
/*}}}*/

/***
!Code
***/
//{{{
(function ($) {

    config.macros.backlog = {

        /* settings & localization */
        defaults: {
            tplItem: '{{log_item_title{[[%0]]}}}{{log_item_text{%1}}}',
            lblNewButton: 'Add an item...'
        },


        /*run on startup */
        init: function () {
            //install StyleSheet shadow tiddler
            config.shadowTiddlers["StyleSheetBacklog"] = "/*{{{*/\n%0\n/*}}}*/"
                .format([
                    store.getTiddlerText("BacklogPlugin##CSS")
                ]);
            //run StyleSheet
            store.addNotification('StyleSheetBacklog', refreshStyles);
            //add update notification
            store.addNotification(null, config.macros.backlog.tiddlerChanged);
        },


        /* the backlog macro */
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {

            //no recursive backlogs....
            if ($(place).closest(".backlog").length > 0) return;

            var backlog, items, lists = '', ref, s, sec, sec_title, section, t, tids, title,
                //check if kanban mode
                kanban = params.contains('kanban'),
                //parse params
                p = paramString.parseParams('anon', null, true),
                //get containing tiddler
                tid = story.findContainingTiddler(place),
                //read sections (default: containing tiddler or this tiddler) as bracketed list
                sections = getParam(
                        p,
                        'sections',
                        '[[' + (tid ? tid.getAttribute('tiddler') : tiddler.title) + ']]'
                    ).readBracketedList();

            //first section => create the backlog
            backlog = createTiddlyElement(place, 'span', null, 'backlog' + (kanban ? ' kanban' : '') );

            //loop all sections
            for (s = 0; s < sections.length; s++) {
                //split section reference by pipe character
                ref = sections[s].split('|');
                //section title
                sec_title = ref[0];
                //section tiddler
                sec = ref[1] ? ref[1] : ref[0];
                //create section element
                section = createTiddlyElement(backlog, 'div', null, 'log_section');
                //add section as attribute
                $(section).attr('section', sec);

                //if kanban
                if (kanban)
                    //set column width
                    $(section).css('width', (100 / sections.length - 1.5) + "%");

                //output section title
                wikify(
                    '[[' + sec_title + '|' + sec + ']]',
                    //into created section head
                    createTiddlyElement(section, 'div', null, 'log_section_title')
                );
                //create item list
                items = createTiddlyElement(section, 'div', null, 'log_item_list');
                //set section attribute
                $(items).attr("section", sec);

                tids = store.getTaggedTiddlers(sec);

                lists += ".log_item_list[section=" + sec + "],";

                for (t = 0; t < tids.length; t++) {
                    this.addItem(tids[t], items, sec);
                }

                //render button to add a new item to a section
                wikify(
                    '{{log_add_new{<<newTiddler label:"' + this.defaults.lblNewButton + '" tag:"' + sec + '">>}}}',
                    section
                );
            }

            //enable drag and drop between columns
            $(lists, backlog).dragsort({
                dragSelector: ".log_item",
                dragBetween: true,
                dragEnd: config.macros.backlog.itemDrop
            });
        },


        /* render tiddler info into a backlog item */
        updateItem: function (tiddler, item) {
            try {
                $(item).empty();
                wikify(
                    config.macros.backlog.defaults.tplItem.format([
                        tiddler.title,
                        tiddler.text
                    ]),
                    item
                );
            } catch (e) {
                console.log('ERROR' + e);
            }
        },


        /* create a backlog item */
        addItem: function (tid, items, section) {
            //create the item
            var item = createTiddlyElement(items, 'li', null, 'log_item', null);
            //set attributes
            $(item).attr({
                "section": section,
                "item": tid.title
            });
            //update title/text
            this.updateItem(tid, item);
        },


        /* when an item is droped via dragsort */
        itemDrop: function () {
            var t,
                item = $(this),
                //the tiddler title
                title = item.attr('item'),
                //target section
                sec = item.closest('.log_section').attr('section'),
                //tiddler in store
                tid = store.getTiddler(title);

            //tiddler exists?
            if (tid) {
                //find index of old section tag
                t = tid.tags.indexOf( item.attr('section') );
                //replace with new section
                if (t >= 0) tid.tags[t] = sec;
                //or add if not existing
                else tid.tags.push(sec);
                //set attribute
                item.attr('section', sec);

                // ensure the tiddler is saved
                tid.incChangeCount();
                tid.saveToDiv();
                store.setDirty(title, true);
                if (config.options.chkAutoSave) saveChanges();

                // update all backlogs
                config.macros.backlog.tiddlerChanged(title);
            }
        },


        /* notification and change handler */
        tiddlerChanged: function (title, moved) {
            var $item, section,
                cmb = config.macros.backlog,
                tid = store.getTiddler(title),
                item = '.log_item[item="' + title + '"]';

            //tiddler exists
            if (tid) {
                //loop all item lists
                $(".log_item_list").each(function (index) {
                    //get the section title
                    section = $(this).attr("section");
                    //get matching item
                    $item = $(this).find(item);
                    //tiddler belongs into section?
                    if (tid.isTagged(section)) {
                        //item already exists?
                        if ($item[0]) {
                            //update title / text
                            if(!moved)cmb.updateItem(tid, $item[0]);
                        //no item exists for the tiddler yet
                        } else {
                            //add
                            cmb.addItem(tid, this, section);
                        }
                    //item no longer belongs to section
                    } else {
                        //remove item
                        $item.remove();
                    }
                });
            //tiddler deleted
            } else {
                //remove item(s) on display
                $(item).remove();
            }
        }
    }

})(jQuery);
//}}}