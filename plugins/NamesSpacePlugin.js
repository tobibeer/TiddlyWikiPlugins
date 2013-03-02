/***
|''Name''|NameSpacePlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Documentation''|http://namespace.tiddlyspace.com|
|''Version''|1.0.1|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/NamesSpacePlugin.js|
|''~CoreVersion''|2.6.5|
***/
//{{{
(function ($) {

    /* hijack view macro
    - trigger for namespace mode */
    config.macros.view.handler_NameSpace = config.macros.view.handler;
    config.macros.view.handler = function (place, macroName, params, wikifier, paramString, tiddler) {

        //namespace wanted?
        if (params.contains('namespace')) {
            //call namespace macro
            wikify('<<ns [[' + tiddler.title + ']] ' + paramString + '>>', place);
            //no namespace
        } else {
            //use default view handler
            return config.macros.view.handler_NameSpace.apply(this, arguments);
        }
    }

    /* the actual namespace macro
    - splits tiddler titles by namespace character
    - also renders the namespace element popups */
    config.macros.ns = {
        defaults: {
            //the default namespace delimiter
            separator: ':',
            //the source for the element info
            infoSource: '??ns_info', /* can be any of...
              ##SomeSection => a section of the tiddler
              ::SomeSlice   => a slice   of the tiddler
              ??SomeField   => a field   of the tiddler */
            //the link symbol for the info
            lnkInfo: 'i',
            lnkInfoTooltip: 'info for \'%0\'',
            //the last part of the namespace
            btnLast: '»',
            //pseudo list bullet for popup lists
            txtListBullet: '» ',
            //clear left on prefixes...
            clear: '',
            //clear: '^(\\#|\\^|\\@|\\$|\\§|\\&|\\-|\\?)',
            //the tooltip for the popup
            btnTooltip: 'tiddlers under namespace \'%0\'',
            //no subelements found
            txtNoneFound: 'No futher items found.',
            //titles for categories
            txtMoreItems: 'Further items...',
            //link to open namespace element
            lnkOpenElement: 'Open \'%0\'',
            lnkOpenElementTooltip: 'Click to open the tiddler \'%0\'...',
            //category title
            txtTitleCategory: '%0 (category) ',
            //namespace title
            txtTitleNameSpace: '%0 ...',
            //element title
            txtTitleElement: '[%0]',
            //localization for add button
            btnAddLabelInline: '+',
            btnAddLabelCategory: 'Add new category item...',
            btnAddLabelNameSpace: 'Add new item...',
            btnAddTooltipCategory: 'Add new category item under \'%0\'...',
            btnAddTooltipNameSpace: 'Add new namespace item under \'%0\'...',
            btnAddTitleCategory: 'New item for category %0',
            btnAddTitleNameSpace: '%0:NewItemTitle',
            //button template to add item
            btnAddItem:
                '<<newTiddler ' +
                    'title:"%0" ' +
                    'label:"%1" ' +
                    'prompt:"%2" ' +
                    'fields:"%3" ' +
                '>>',
        },

        /* the namespace macro handler */
        handler: function (place, macroName, params, wikifier, paramString, tiddler) {
            //get tiddler from param or context
            var tid = params[0];
            //remove first
            params.shift();
            //no tid?
            if (!tid) {
                //find containing tid
                tid = story.findContainingTiddler(place);
                tid = tid ? tid.getAttribute('tiddler') : '';
            }
            //still no tid? => no namespaces
            if (!tid) return;

            var aNS = [], c, cat = '', cl, d, depth, el, i, item, n,
                l, last, len, lnk, ld, list = '', out, prev, prevnew, prev, what,
                //reference to defaults
                def = this.defaults,
                //parse paramString
                p = paramString.parseParams('anon', null, true),
                //get part
                ns = getParam(p, 'ns', ''),
                //get category
                cat = getParam(p, 'category', ''),
                //get element
                el = getParam(p, 'element', tid),
                //get delimiter
                sep = getParam(p, 'separator', def.separator),
                //custom readonly
                readonly = params.contains('readonly') || readOnly,
                //get pattern to clear left
                clear = new RegExp( getParam(p, 'clear', def.clear) ),
                //helper function
                styleAsLink = function ($el) {
                    $el.removeClass('button').addClass('tiddlyLink tiddlyLinkNonExisting')
                };

            //// POPUP MODE ////
            if (params.contains('popup')) {
                //if not given, set namespace to tid by default
                ns = ns ? ns : tid;
                //when...
                if (
                    //there are items for this namespace...
                    this.getItems(tid, ns, sep, cat, 3) ||
                    //or no category lookup and namespace not full tiddler title
                    !cat && ns != tid
                ) {
                    //create button
                    $(createTiddlyButton(
                        place,
                        getParam(p, 'label', ns == tid ? def.btnLast : sep),
                        getParam(p, 'tooltip', def.btnTooltip.format([ns])),
                        this.click,
                        'ns_btn ns_btn_popup'
                    //pass params
                    )).data('params', {
                        tid: tid,
                        ns: ns,
                        element: el,
                        category: cat,
                        sep: sep,
                        readonly: readonly
                    });

                //otherwise if not last
                } else if (ns && ns != tid) {
                    //wikify separator
                    wikify('{{ns_btn{"""' + sep + '"""}}}', place);
                }

                // END OF POPUP MODE
                return;
            }


            //// LIST MODE ////
            if (params.contains('list')) {

                //tid is namespace to retrieve list for
                ns = tid;

                //find namespace items
                tids = config.macros.ns.getItems(
                    null,
                    ns,
                    sep,
                    cat,
                    ( params.contains('category') ? 1 : ( params.contains('namespace') ? 2 : 0 ) )
                );

                //loop all result list
                for (l = 0; l < 2; l++) {

                    //current list
                    lst = tids[l];
                    //get length
                    len = lst.length;

                    //only when not disabled, render list title for category
                    if (!params.contains('notitles') && (l == 0 && len || l > 0 ) ) {
                        list +=
                        //extra linebreak when both
                        (l > 0 && tids[0].length ? '\n' : '') +
                        '\n{{ns_title{[[' +
                            def['txtTitle' + (l == 0 ? 'Category' : 'NameSpace')].format([ns]) +
                        '|' + ns + ']]' +
                        (
                            readonly ? '' : (
                                '{{ns_list_add{' +
                                this.createButtonToAdd(
                                    null,
                                    ns,
                                    l < 1 ? 'Category' : 'NameSpace',
                                    def.btnAddLabelInline
                                ) +
                                '}}}'
                            )
                        ) +
                        '}}}';

                        //fetch info, for category only once
                        info = tids[0].length && l > 0 ? '' : this.getInfo(ns);
                        //add info if exits
                        if (info) list += '\n' + info;
                    }

                    //loop results
                    for (i = 0; i < len; i++) {
                        //get item
                        item = lst[i];
                        //get item depth
                        depth = item.split(sep).length;

                        //first namespace item
                        if (l > 0 && i == 0) {
                            //reset previous items with item 
                            prev = [[ns.split(sep).length, ns]];
                            //otherwise when new category item
                        } else if (l == 0 && tids[2].contains(item)) {
                            //reset previous items for category
                            prev = [[item.split(sep).length, item]];
                            prevnew = true;
                        }
                        //as long as depth of item lower than last in previous, remove last
                        while (prev.length && item.indexOf(prev[prev.length - 1][1]) != 0) { prev.pop() };
                        //reset list depth
                        ld = '';

                        //determine list depth
                        for (
                            d = prev[0][0];
                            d < depth + (l > 0 ? 0 : 1) ;
                            d++
                        ) ld += '*';

                        //add item
                        list +=
                            '\n' + ld +
                            (
                                (
                                    tids[2].contains(item) ?
                                    ' {{ns_title{[[%0|%1]]%2}}}' :
                                    ' {{ns_item{[[%0|%1]]%2}}}'
                                ).format([
                                    (
                                        prevnew ?
                                        item :
                                        item.substr(prev[prev.length - 1][1].length + 1)
                                    ),
                                    item,
                                    readonly ? '' : (
                                        '{{ns_list_add{' +
                                        this.createButtonToAdd(
                                            null,
                                            item,
                                            'NameSpace',
                                            def.btnAddLabelInline
                                        ) +
                                        '}}}'
                                    )
                                ])
                            );
                        //only if not new item, add item to previous
                        if (!prevnew) prev.push([depth, item]);
                        //reset new flag for previous items array
                        prevnew = false;
                    }

                    //when editable and titles hidden and existing items
                    if (
                        !readonly &&
                        params.contains('notitles') &&
                        (len || l > 0 && !tids[0].length)
                    ) {
                        //show add button at the bottom
                        list +=
                            '\n {{ns_list_add{' +
                            this.createButtonToAdd(
                                null,
                                ns,
                                l < 1 ? 'Category' : 'NameSpace'
                            ) +
                            '}}}';
                    }
                }

                //render list
                wikify('{{ns_list{' + list + '\n}}}', place);

                styleAsLink($('.ns_list').last().find('.ns_add .button'));

                //END OF LIST MODE
                return;
            }


            //create output container
            out = $(place).closest('.ns')[0] || createTiddlyElement(place, 'span', null, 'ns');

            //get category
            cat = store.getValue(tid, 'ns_cat');
            //category defined?
            if (cat) {
                //prepend namespace category
                wikify(
                    (
                        '[[' + cat + ']]' + 
                        this.createButtonToAdd(null, cat, 'Category', def.btnAddLabelInline) +
                        '<<ns [[' + tid + ']] separator:[[' + sep + ']] category:[[' + cat + ']] popup>>'
                    ),
                    out
                );
            }

            // (array): stores the namespace components of the current tiddlers title
            aNS = tid.split(sep);

            //loop namespace componentes
            for (n = 0; n < aNS.length; n++) {
                //the currenty inspected namespace component
                el = aNS[n];
                //link up until here
                ns += n < 1 ? el : sep + el;
                //remember clear
                c = n > 0 && def.clear && clear.exec(el);
                //clear? => render clear
                if(c || cl) wikify('{{ns_clear{}}}', out);
                //is last element
                last = n == aNS.length - 1;
                //render as text
                if(last) wikify('{{tiddlyLink{"""' + el + '"""}}}', out);
                //render as internal tiddlyLink
                lnk = createTiddlyLink(out, ns, null, ( last ? 'ns_last' : '' ) );
                //set text
                createTiddlyText(lnk, el);
                //render
                wikify(
                    //output hidden add button
                    this.createButtonToAdd(null, ns, 'NameSpace', def.btnAddLabelInline) +
                    //output namespace popup button
                    '<<ns [[' + tid + ']] ns:[[' + ns + ']] element:[[' + el + ']] separator:[[' + sep + ']] popup>>',
                    out
                );
                //remember last clear
                cl = c;
            }
            //add spacer
            $('<div class="ns_clear">').insertAfter($('.title.ns'));
            //change button class
            $(out).find('.button').removeClass('button').addClass('ns_btn ns_btn_add');


            $(out).attr('tabindex','1').bind('mouseover mouseout keyup', function (ev) {
                var $el = $(this),
                    e = ev || window.event;

                //entering
                if (e.type == 'mouseover') {
                    if (!e.ctrlKey || $el.hasClass('ns_hover')) return true;
                    $('.ns_btn_popup', $el).hide();
                    $('.ns_btn_add', $el).show();
                    $('.ns_last', $el).show().prev().hide();
                    $('.tiddlyLink', $el).each(function () {
                        var $l = $(this);
                        $l.attr('tiddlyLinkDefault', $l.attr('tiddlyLink'));
                        $l.attr('tiddlyLink', $l.text());
                    });
                    $el.addClass('ns_hover');
                //leaving
                } else {
                    if (!$el.hasClass('ns_hover')) return true;
                    $('.ns_btn_popup', $el).show();
                    $('.ns_btn_add', $el).hide();
                    $('.ns_last', $el).hide().prev().show();
                    $('.tiddlyLink', $el).each(function () {
                        var def = $(this).attr('tiddlyLinkDefault');
                        if (def) $(this).attr('tiddlyLink', def);
                    });
                    $el.removeClass('ns_hover');
                }
            });
        },

        /*
        - find tiddlers that are items to a given namespace
        - optionally just check if items exist for category or namespace
        - find: 0 = all, 1 = only category items, 2 = only namespace items, 3 = find any first
        */
        getItems: function (tid, ns, separator, category, find) {
            var c, i, pos, remove, t, ti,
                //get all tiddlers
                tids = store.getTiddlers('title'),
                //three lists => [actual items], [category items for self]
                items = [[], [], []],
                //no tiddler => retrieve all under namespace
                all = !tid;

            //for full list no tid
            if (all) tid = '';

            //loop all tids
            for (t = 0; t < tids.length; t++) {
                //get title
                ti = tids[t].title,
                //get ns category for tiddler
                c = store.getValue(ti, 'ns_cat'),
                //get position of title in tid
                pos = tid.indexOf(ti);

                //when fetching all children to a namespace or category
                if (all) {
                    //when category is the namespace
                    if (c == ns) {
                        //add to categories
                        items[2].push(ti);
                    }

                    //when fetching only direct children to a namespace or category
                } else {

                    //ignore (anything contained in) current tid or namespace tiddler
                    if (!all && (ti == tid || pos == 0 && tid.substr(pos, 1) == separator || ti == ns)) continue;

                    //either when...
                    if (
                        // lookup for category and category matches that of the tiddler
                        category && category == c ||
                        // tid is same as namespace and namespace is the category of the tiddler
                        !category && tid == ns && ns == c
                    )
                        // add to category items
                        items[0].push(ti);

                    //or when...
                    if (
                        (
                        //category lookup
                            category &&
                        // and child of the category being a namespace
                            ti.indexOf(category + separator) == 0 &&
                        // and not having further subelements
                            ti.substr(category.length + 1).indexOf(separator) < 0
                        ) || (
                        //no lookup for category
                            !category &&
                        // and child of the namespace
                            ti.indexOf(ns + separator) == 0 &&
                        // and not having further subelements
                            ti.substr(ns.length + 1).indexOf(separator) < 0
                        )
                    )
                        //add to namespace items
                        items[1].push(ti);

                    //simple boolean check and category or namespace items exists => return true
                    if (find && (items[0].length + items[1].length > 0)) return true;
                }
            }

            //fetching all children?
            if (all) {
                //loop all tids a second time
                for (t = 0; t < tids.length; t++) {
                    //get title
                    ti = tids[t].title;
                    //loop all category items
                    for (i = 0; i < items[2].length; i++) {
                        //get category item
                        c = items[2][i];
                        //when ...
                        if (
                            //all or find first
                            (!find || find == 1 || find == 3) &&
                            //a category item or a child of the namespace of a category item
                            (ti == c || ti.indexOf(c + separator) == 0)
                        ) {
                            //add to category items
                            items[0].push(ti);
                            //only once
                            break;
                        }
                    }
                    if (
                        (!find || find > 1) &&
                        //child of the namespace of a category item
                        ti.indexOf(ns + separator) == 0
                    ) items[1].push(ti);
                }
            }

            //for 'find first' return false when none were found until here
            //otherwise return namespace items
            return (find === 3 ? false : items);
        },

        //the click handler of the namespace delimiter
        click: function (ev) {
            var e, i, info, infoFor, l, len, lnk, lst, t, ti, tids,
                macro = config.macros.ns,
                def = macro.defaults,
                e = ev || window.event,
                pop = Popup.create(this),
                //read config
                p = $(this).data('params'),
                tid = p['tid'],
                ns = p['ns'],
                el = p['element'],
                cat = p['category'],
                sep = p['sep'],
                readonly = p['readonly'],
                //get category for namespace
                ns_cat = cat || tid == ns ? '' : store.getValue(ns, 'ns_cat');

            //add popup class
            $(pop).addClass('popup popup_ns');

            //find namespace items
            tids = config.macros.ns.getItems(tid, ns, sep, cat ? cat : ns, 0);

            //loop all result list
            for (l = 0; l < 2; l++) {
                //current list
                lst = tids[l];
                //get length
                len = lst.length;


                //when...
                if (
                    //for category items: namespace has a category, category lookup or category has elements
                    (l == 0 && ns_cat || cat || tids[0].length > 0) ||
                    //for namespace items: no category lookup or category with namespace items
                    (l == 1 && !cat || cat && len > 0)
                ) {
                    //get infor for...
                    infoFor = l > 0 ?
                        //namespace item list: the category or the namespace
                        (cat ? cat : ns) :
                        //category item list: either namespace category, lookup category or namespace itself
                        (ns_cat ? ns_cat : (cat ? cat : ns));

                    //render list title for category
                    macro.createListTitle(pop, (l > 0 ? 'NameSpace' : 'Category'), infoFor, ns_cat);

                    //fetch info, for category only once
                    info = l > 0 && tids[0].length ? '' : macro.getInfo(infoFor);
                    //info exists?
                    if (info) {
                        //wikify info first
                        wikify(
                            info,
                            createTiddlyElement(
                                createTiddlyElement(pop, "li")
                                , "span", null, 'popup_ns_info'
                            )
                        );
                    }
                }

                //loop results
                for (i = 0; i < len; i++) {
                    macro.createPrettyLink(
                        createTiddlyElement(pop, "li"),
                        lst[i],
                        def.txtListBullet + lst[i].split(sep).pop()
                    )
                }
                //no items?
                if (l > 0 && len == 0)
                    //add message
                    createTiddlyElement(pop, "li", null, 'popup_ns_empty', def.txtNoneFound);

                //can we edit?
                if (!readonly && (l > 0 || len > 0 || cat)) {
                    //what to create - namespace or category item
                    it = l == 0 ? (cat ? cat : ns) : ns;
                    //render button
                    macro.createButtonToAdd(
                        createTiddlyElement(pop, "li", null, 'ns_add'),
                        it,
                        l == 0 ? 'Category' : 'NameSpace'
                    );
                }
            }

            //only when tiddler is not the same as the last element
            if (ns != el) {
                //render list title for element
                macro.createListTitle(pop, 'Element', el, true);

                //fetch info for last element
                info = macro.getInfo(el);
                //info exists?
                if (info) {
                    //wikify info first
                    wikify(
                        info,
                        createTiddlyElement(
                            createTiddlyElement(pop, "li")
                            , "span", null, 'popup_ns_info'
                        )
                    );
                }
            }

            //show popup
            Popup.show();
            e.cancelBubble = true;
            if (e.stopPropagation) e.stopPropagation();
            return false;
        },

        /* retrieves info for namespace element
        - by default from namespace
        - alternatively form element */
        getInfo: function (tid) {
            var
                sep = this.defaults.separator,
                source = this.defaults.infoSource,
                type = source.substr(0, 2),
                what = source.substr(2),
                element = tid.split(sep).pop();

            //return info, if existing
            return (
                type == '??' ?
                store.getValue(tid, what) :
                store.getTiddlerText(tid + source + what)
            );
        },

        /* create a pretty TiddlyLink */
        createPrettyLink: function (place, target, title) {
            //create link
            var lnk = createTiddlyLink(place, target);
            //set text
            createTiddlyText(lnk, title);
            //return link
            return lnk;
        },

        /* creates a list title for category, namespace or namespace element */
        createListTitle: function (popup, type, tid, hr) {
            var macro = config.macros.ns;
            //creaty pretty link pointing to tid
            macro.createPrettyLink(
                // in new list element
                createTiddlyElement(
                    popup,
                    "li",
                    null,
                    'ns_title ' + (hr ? 'popup_ns_hr' : '')
                ),
                tid,
                macro.defaults['txtTitle' + type].format([tid])
            );
        },

        /* helper function to retrieve translations for add button*/
        btnText: function (what, type, replace, prefix) {
            var
                def = config.macros.ns.defaults,
                txt = def['btnAdd' + what + type];
            return (replace ? txt.format(replace) : replace);
        },

        /* create a button to add a new namespace or category item */
        createButtonToAdd: function (place, what, type, label) {
            var
                //path references
                macro = config.macros.ns,
                def = macro.defaults,
                //the replacement array
                r = [what],
                btn =
                    def['btnAddItem'].format([
                        macro.btnText('Title', type, r),
                        (label ? label : ( (place ? def.txtListBullet + ' ' : '') + macro.btnText('Label', type, r) ) ),
                        macro.btnText('Tooltip', type, r),
                        ( type == 'Category' ? 'ns_cat:[[' + what + ']]' : '' )
                    ]);

            //if place is given => render button
            if (place) wikify(btn, place);

            //return button text
            return btn;
        }

    }

    config.shadowTiddlers['StyleSheetNameSpace'] =
        '/*{{{*/\n' +
        '.ns_last {\n' +
        '   display:block;\n' +
        '   float:left;\n' +
        '}\n' +
        '.ns .tiddlyLink {\n' +
        '   display:block;\n' +
        '   float:left;\n' +
        '   padding: 0 2px;\n' +
        '}\n' +
        '.ns a.tiddlyLink:hover {\n' +
        '   color:[[ColorPalette::PrimaryDark]];\n' +
        '   background:[[ColorPalette::TertiaryPale]];\n' +
        '}\n' +
        'a.ns_btn {\n' +
        '   color:[[ColorPalette::TertiaryLight]];\n' +
        '   display:block;\n' +
        '   float:left;\n' +
        '   min-width:12px;\n' +
        '   padding:0 4px;\n' +
        '   text-align:center;\n' +
        '   margin:0;\n' +
        '}\n' +
        'a.ns_btn {\n' +
        '   color:[[ColorPalette::PrimaryMid]];\n' +
        '}\n' +
        'a.ns_btn:hover{\n' +
        '   color:[[ColorPalette::PrimaryDark]];\n' +
        '   background:[[ColorPalette::TertiaryPale]];\n' +
        '   border-color:transparent;\n' +
        '}\n' +
        '.popup_ns{\n' +
        '   max-width: 400px;\n' +
        '}\n' +
        '.popup_ns_hr {\n' +
        '   border-top: 1px solid [[ColorPalette::TertiaryMid]];\n' +
        '}\n' +
        '.ns_title .tiddlyLink{\n' +
        '   font-size: 1.2em;\n' +
        '   font-weight: bold;\n' +
        '}\n' +
        '.popup_ns_empty{\n' +
        '   padding: 3px;\n' +
        '}\n' +
        '.popup_ns_info{\n' +
        '   display:block;\n' +
        '   padding:3px;\n' +
        '   margin-bottom:3px;\n' +
        '   background:[[ColorPalette::SecondaryPale]];\n' +
        '}\n' +
        '.ns .tiddlyLink.ns_last,\n' +
        '.ns_btn.ns_btn_add,\n' +
        '.ns_list span .ns_list_add{\n' +
        '   display:none;\n' +
        '}\n' +
        '.ns_list .ns_title,\n' +
        '.ns_list li > span{\n' +
        '   padding-right:30px;\n' +
        '}\n' +
        '.ns_list .ns_title:hover > .ns_list_add,\n' +
        '.ns_list li > span:hover > .ns_list_add{\n' +
        '   display:inline;\n' +
        '}\n' +
        '.ns_add .button{\n' +
        '   font-style: italic;\n' +
        '}\n' +
        '.title.ns{\n' +
        '   min-height: 1em;\n' +
        '}\n' +
        '.ns_clear{\n' +
        '   clear: left;\n' +
        '   display: block;\n' +
        '}\n' +
        '/*}}}*/';
    store.addNotification('StyleSheetNameSpace', refreshStyles);
})(jQuery);
//}}}