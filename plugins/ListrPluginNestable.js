/***
|''Name''|ListrPlugin|
|''Description''|Provides a tiddler listr (or kanban) with drag-and-drop capability|
|''Author''|Tobias Beer|
|''Version''|0.3|
|''Status''|beta|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/ListrPlugin.js|
|''License''|http://creativecommons.org/licenses/by-sa/3.0/|
|''~CoreVersion''|2.5.0|
/*{{{*/
/*
!CSS


.dd {
    display: block;
    list-style: none outside none;
    padding: 0;
    position: relative;
}

.dd-list {
    display: block;
    list-style: none outside none;
    margin: 0;
    padding: 0;
    position: relative;
}

.dd-list .dd-list {
    padding-left: 30px;
}

.dd-collapsed .dd-list {
    display: none;
}

.dd-item, .dd-empty, .dd-placeholder {
    display: block;
    margin: 0;
    padding: 0;
    min-height: 20px;
    position: relative;
}

.dd-handle {
    padding: 3px;
    border:1px solid transparent;
}

.dd-handle:hover {
    border:1px solid [[ColorPalette::TertiaryLight]];
}

.dd-item > button {
    cursor: pointer;
    position: absolute;
    text-align:center;
    padding: 0;
    margin: 0 0 -30px -30px;
    width: 27px;
    height: 30px;
    background: none;
    border:0;
}

.dd-placeholder, .dd-empty {
    margin-top:5px;
    background: none repeat scroll 0 0 [[ColorPalette::TertiaryPale]];
    border: 1px solid [[ColorPalette::TertiaryLight]];
}

.dd-dragel {
    pointer-events: none;
    position: absolute;
    z-index: 9999;
    background: [[ColorPalette::Background]];
    border: 1px solid [[ColorPalette::TertiaryLight]];
}

.dd-dragel br,
.dd-dragel .lr_item_text {
    visibility: hidden;
}

.dd-dragel > .dd-item .dd-handle {
    margin-top: 0;
}




.listr {
	float:none;
	clear:both;
	display:block;
}

.lr_section {
    clear:left;
	background-color: [[ColorPalette::TertiaryPale]];
	margin: 0 0 15px 0; 
}

.lr_section_title{
    min-height:1px;
}
.lr_section_title .tiddlyLink{
	text-align: left;
    padding: 7px 3px 5px 10px;
    font-size:2em;
    display: block;
    color:[[ColorPalette::TertiaryDark]];
}

 .lr_items,
 .viewer .lr_items {
	list-style: none; 
    margin: 0 3px;
	padding: 0;
}

.viewer .lr_items {
    position: relative;
}

.lr_item { 
    margin-top:5px;
    background-color: [[ColorPalette::Background]];
}

.lr_item_title .tiddlyLink:hover{
    color:[[ColorPalette::PrimaryLight]];
    background:transparent;
}

.lr_item_text{
    display:block;
	font-size: 80%;
    max-height:150px;
    overflow:hidden;
}

.lr_item:hover .lr_item_text{
    display:block;
	max-height: none; 
    overflow:auto;
}

.lr_add_new .button {
    color:[[ColorPalette::TertiaryMid]];
    display:block;
    margin:0;
    padding:5px;
    border:0;
}

.lr_add_new .button:hover,
.lr_section_title .tiddlyLink:hover {
    color:[[ColorPalette::PrimaryMid]];
    background:[[ColorPalette::TertiaryLight]];
}

.no_section .tiddlyLink{
    background:[[ColorPalette::SecondaryPale]];
    padding: 0 5px;
}

.kanban .lr_section_title .tiddlyLink{
	text-align: center;
    padding:10px 3px;
}

.kanban .lr_section{
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

    var lr = config.macros.listr = {

        /* settings & localization */
        defaults: {
            tplItemTitle: '{{lr_item_title{[[%0]]}}}',
            tplItemText: '{{noDragClass lr_item_text{\n%0\n}}}',
            lblNewButton: 'Add new...',
            txtNewItem: '* new *'
        },


        /*run on startup */
        init: function () {
            //install StyleSheet shadow tiddler
            config.shadowTiddlers["StyleSheetListr"] = "/*{{{*/\n%0\n/*}}}*/"
                .format([
                    store.getTiddlerText("ListrPlugin##CSS")
                ]);
            //run StyleSheet
            store.addNotification('StyleSheetListr', refreshStyles);
            //add update notification
            store.addNotification(null, lr.tiddlerChanged);
        },


        /* the listr macro */
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {

            //no recursive listrs....
            if ($(place).closest(".listr").length > 0) return;

            var addtags = '', listr, f, filtered = [], items, s, sec, sec_title, section, sx = '',
                t, tags = '', tag0, tids, title, titles = [], tx, untagged = [],
                //check if kanban mode
                kanban = params.contains('kanban'),
                //parse params
                p = paramString.parseParams('anon', null, true),
                //get containing tiddler
                tid = story.findContainingTiddler(place),
                //read sections
                sections = getParam(
                        p,
                        'sections',
                        //default: the tiddler
                        '[[' + tiddler.title + ']]'
                    ).readBracketedList(),
                //any filter?
                filter = getParam(p, 'filter', ''),
                //default section for untagged?
                def = getParam(p, 'default', sections[0].split('|').pop());

            //analyse sections
            sections.map(function (sec, s) {
                //split section reference by pipe character
                var ref = sec.split('|');
                //update link
                sections[s] = ref[1] ? ref[1] : ref[0];
                //add to titles
                titles.push(ref[0]);
            });

            //loop all in filter
            store.filterTiddlers(filter).map(function (tid) {
                //add title to filtered
                filtered.push(tid.title);
                //if tiddler does not have tany section as a tag
                if (!tid.tags || !tid.tags.containsAny(sections)) {
                    //add to untagged
                    untagged.push(tid);
                }
            });

            //duplicate filter string
            f = filter;
            //find tag filter
            tag0 = f.indexOf('[tag[');
            //as long as there are any tag filters
            while (tag0 >= 0) {
                //trim until tag
                f = f.substr(tag0 + 5);
                //get tag
                t = f.substr(0, f.indexOf(']]'));
                //add to tags
                addtags += '[[' + t + ']]';
                //and to tag string
                tags += ' tag:"' + t + '"';
                //get next tag filter
                tag0 = f.indexOf('[tag[');
            }

            //first section => create the listr
            listr = createTiddlyElement(place, 'span', null, 'listr' + (kanban ? ' kanban' : ''));

            //add to listr attributes...
            $(listr).attr({
                id: this.newId('lr'), // a unique id
                tags: addtags, // default tags
                filter: filter, // filter
                section: def // the default section
            });

            //loop all sections
            for (s = 0; s < sections.length; s++) {
                //get section tiddler
                sec = sections[s];
                //add to sections string
                sx += '[[' + sec + ']]';
                //create section element
                section = createTiddlyElement(listr, 'div', null, 'dd lr_section');
                //add section as attribute
                $(section).attr('section', sec);

                //if kanban
                if (kanban)
                    //set column width
                    $(section).css('width', (100 / sections.length - 1.5) + "%");

                //output...
                wikify(
                    (
                        //when just one section
                        sections.length < 2 &&
                        //and listr tiddler same as displayed tiddler
                        tiddler.title == (tid ? tid.getAttribute('tiddler') : '') ?
                        //display nothing
                        '' :
                        //otherwise section title
                        '[[' + titles[s] + '|' + sec + ']]'
                    ),
                    //into created section head
                    createTiddlyElement(section, 'div', null, 'lr_section_title')
                );

                //create item list
                items = createTiddlyElement(section, 'ul', null, 'dd-list lr_items');
                //set section attribute
                $(items).attr("section", sec);

                //get tiddlers tagged with section
                tids = store.getTaggedTiddlers(sec);
                //loop them...
                for (t = 0; t < tids.length; t++) {
                    //only when no filter or in filter
                    if (!filter || filtered.contains(tids[t].title)) {
                        //add to item list
                        this.addItem(tids[t], items, sec);
                    }
                }
                //when default section
                if (def == sec) {
                    //loop untagged...
                    for (t = 0; t < untagged.length; t++) {
                        //add to item list
                        this.addItem(untagged[t], items, sec, true);
                    }
                }

                //render button to add a new item to a section
                wikify(
                    (
                        '<<newTiddler label:"' +
                        lr.defaults.lblNewButton + '"' +
                        tags + ' tag:"' + sec +
                        '">>'
                    ),
                    createTiddlyElement(section, 'div', null, 'lr_add_new')
                );
            }

            //also add sections as listr attribute
            $(listr).attr('sections', sx);

            //enable drag and drop between sections and add update handler
            $('.dd', listr).nestable({
                group: 1,
                expandBtnHTML: '<button data-action="expand" type="button">+</button>',
                collapseBtnHTML: '<button data-action="collapse" type="button">-</button>',
            }).on('change', lr.itemDrop);

        },


        /* render tiddler info into a listr item */
        updateItem: function (tiddler, item, untagged) {
            //reference to defaults
            var def = lr.defaults;
            //clear item
            $(item).empty();
            //has section tag?
            if (!untagged)
                //remove untagged class
                $(item).removeClass('no_section')
                //otherwise when item doesn't have class yet
            else if (!$(item).hasClass('no_section'))
                //add untagged class
                $(item).addClass('no_section');
            //render...
            wikify(
                (
                    //item title template with tiddler title
                    def.tplItemTitle.format([tiddler.title]) +
                    //tiddler text if present
                    (tiddler.text ? ('\n' + def.tplItemText.format([tiddler.text])) : '')
                ),
                item // into item
            );
        },


        /* create a listr item */
        addItem: function (tid, items, section, untagged) {
            var 
                //get number of items in list
                i = $(items).children().length,
                //create the item handle
                item = createTiddlyElement(
                //inside an item wrapper
                createTiddlyElement(items, 'li', null, 'dd-item lr_item' + (untagged ? ' no_section' : '')),
                //as a div of class listr_handle
                'div', null, 'dd-handle', null);

            //set attributes
            $(item).attr({
                section: section,
                item: tid.title,
                title: (untagged ? lr.defaults.txtNewItem : '')
            });
            //update title/text
            this.updateItem(tid, item, untagged);
        },


        /* when an item is droped */
        itemDrop: function () {
            var t,
                item = $(this),
                //the tiddler title
                title = item.attr('item'),
                //target section
                sec = item.closest('.lr_section').attr('section'),
                //tiddler in store
                tid = store.getTiddler(title);

            //no longer untagged
            item.find('.untagged').removeClass('untagged');

            //tiddler exists?
            if (tid) {
                //find index of old section tag
                t = tid.tags.indexOf(item.attr('section'));
                //replace with new section
                if (t >= 0) tid.tags[t] = sec;
                    //or add if not existing
                else tid.tags.push(sec);

                //loop default tags as stored at listr wrapper
                item.closest('.listr').attr('tags').readBracketedList().map(function (el) {
                    //add tag once
                    tid.tags.pushUnique(el);
                });

                //set attribute
                item.attr('section', sec);

                // ensure the tiddler is saved
                story.setDirty(title, true);
                if (config.options.chkAutoSave) saveChanges();

                //refresh the tiddler display
                story.refreshTiddler(tid.title, null, true);
                // update all listrs
                lr.tiddlerChanged(title);
            }
        },

        //create a unique id
        newId: function (p) {
            //random it is
            return p + Math.random().toString().substr(3);
        },

        /* notification and change handler */
        tiddlerChanged: function (title, moved) {
            var filter, id, $item, listr, match, tids = {}, section, untagged,
                tid = store.getTiddler(title),
                item = '.lr_item[item="' + title + '"]';

            //tiddler exists
            if (tid) {
                //loop all item lists
                $(".lr_items").each(function (index) {
                    //get listr
                    listr = $(this).closest('.listr');
                    //get listr id
                    id = listr.attr('id');
                    //get filter
                    filter = listr.attr('filter');
                    //get sections
                    sections = listr.attr('sections').readBracketedList();
                    //no filter list for listr yet?
                    if (!tids[id]) {
                        //create new list
                        tids[id] = [];
                        //loop filter results
                        store.filterTiddlers(filter).map(function (el) {
                            //add to listr filter list
                            tids[id].push(el.title);
                        });
                    }
                    //get the section title
                    section = $(this).attr("section");
                    //get matching item
                    $item = $(this).find(item);
                    //match when tid in filter list
                    match = tids[id].contains(tid.title);
                    //untagged when filter and matching but tid is not tagged with any section
                    untagged = match && !sections.containsAny(tid.tags);
                    //when...
                    if (
                        // no filter or tid in filter list
                        (!filter || match) &&
                        //and tiddler belongs into section or untagged and this is the default section
                        (tid.isTagged(section) || untagged && section == listr.attr('section'))
                    ) {
                        //item already exists?
                        if ($item[0]) {
                            //update title / text
                            lr.updateItem(tid, $item[0], untagged);
                            //no item exists for the tiddler
                        } else {
                            //add new item
                            lr.addItem(tid, this, section, untagged);
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