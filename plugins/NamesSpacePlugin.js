/***
|''Name''|NameSpacePlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Documentation''|http://namespace.tiddlyspace.com|
|''Version''|0.5.5 beta|
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

            var aNS = [], cat = '', d, depth, el, i, item, n, l, len, ld, list = '', prev, prevnew, prev, what,
                //reference to defaults
                def = this.defaults,
                //parse paramString
                p = paramString.parseParams('anon', null, true),
                //get tiddler from param or context
                tid = params[0],
                //get part
                ns = getParam(p, 'ns', ''),
                //get category
                cat = getParam(p, 'category', ''),
                //get element
                el = getParam(p, 'element', tid),
                //get delimiter
                sep = getParam(p, 'separator', def.separator);

            //no tid?
            if (!tid) {
                //find containing tid
                tid = story.findContainingTiddler(place);
                tid = tid ? tid.getAttribute('tiddler') : '';
            }

            //no tid no namespaces
            if (!tid) return;

            //// POPUP MODE ////
            if (params.contains('popup') && params[0] != 'popup') {
                //if not given, set namespace to tid by default
                ns = ns ? ns : tid;
                //when...
                if (
                    //there are items for this namespace...
                    this.getItems(tid, ns, sep, cat, true) ||
                    //or no category lookup and namespace not full tiddler title
                    !cat && ns != tid
                ) {
                    //create button
                    $(createTiddlyButton(
                        place,
                        getParam(p, 'label', ns == tid ? def.btnLast : sep),
                        getParam(p, 'tooltip', def.btnTooltip.format([ns])),
                        this.click,
                        'ns_btn_popup'
                    //pass params
                    )).data('params', {
                        tid: tid,
                        ns: ns,
                        element: el,
                        category: cat,
                        sep: sep
                    });
                    //otherwise if not last
                } else if (ns && ns != tid) {
                    //wikify separator
                    wikify('{{ns_btn_popup{"""' + sep + '"""}}}', out);
                }

                return;
            }

            //// LIST MODE ////
            if (params[0] == '!list') {

                //find namespace items
                tids = config.macros.ns.getItems('!list', ns, sep);

                //loop all result list
                for (l = 0; l < 2; l++) {

                    //current list
                    lst = tids[l];
                    //get length
                    len = lst.length;

                    //render list title for category
                    if (l == 0 && len || l > 0) {
                        list +=
                        //extra linebreak when both
                        (l > 0 && tids[0].length ? '\n' : '') +
                        '\n{{ns_title{[[' +
                            def['txtTitle' + (l == 0 ? 'Category' : 'NameSpace')].format([ns]) +
                        '|' + ns + ']]' +
                        (
                            readOnly ? '' : (
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
                                    readOnly ? '' : (
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

                }

                //render list
                wikify('{{ns_list{' + list + '\n}}}', place);

                $('.ns_list').last().find('.ns_add .button').removeClass('button').addClass('tiddlyLink tiddlyLinkNonExisting');

                return;
            }

            //create output container
            out = createTiddlyElement(place, 'span', null, 'ns');

            //get category
            cat = store.getValue(tid, 'ns_cat');
            //category defined?
            if (cat) {
                //prepend namespace category
                wikify('[[' + cat + ']]<<ns [[' + tid + ']] separator:[[' + sep + ']] category:[[' + cat + ']] popup>>', out);
            }

            // (array): stores the namespace components of the current tiddlers title
            aNS = tid.split(sep);

            //loop namespace componentes
            for (n = 0; n < aNS.length; n++) {
                //the currenty inspected namespace component
                el = aNS[n];
                //link up until here
                ns += n < 1 ? el : sep + el;
                //output clickables
                wikify(
                    (
                        (n == aNS.length - 1 ? '{{tiddlyLink{"""' + el + '"""}}}' : '[[' + el + '|' + ns + ']]') +
                        '<<ns [[' + tid + ']] ns:[[' + ns + ']] element:[[' + el + ']] separator:[[' + sep + ']] popup>>'
                    ),
                    out
                );
            }
        },

        /*
        - find tiddlers that are items to a given namespace
        - optionally just check if items exist for category or namespace
        */
        getItems: function (tid, ns, separator, category, exists) {
            var c, i, pos, remove, t, ti,
                //get all tiddlers
                tids = store.getTiddlers('title'),
                //three lists => [actual items], [category items for self]
                items = [[], [], []],
                list = tid === '!list';

            //loop all tids
            for (t = 0; t < tids.length; t++) {
                //get title
                ti = tids[t].title,
                //get ns category for tiddler
                c = store.getValue(ti, 'ns_cat'),
                //get position of title in tid
                pos = tid.indexOf(ti);

                //when fetching all children to a namespace or category
                if (list) {
                    //when category is the namespace
                    if (c == ns) {
                        //add to categories
                        items[2].push(ti);
                    }

                    //when fetching only direct children to a namespace or category
                } else {

                    //ignore (anything contained in) current tid or namespace tiddler
                    if (!list && (ti == tid || pos == 0 && tid.substr(pos, 1) == separator || ti == ns)) continue;

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
                    if (exists && (items[0].length + items[1].length > 0)) return true;
                }
            }

            //fetching all children?
            if (list) {
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
                            //a category item
                            ti == c ||
                            //child of the namespace of a category item
                            ti.indexOf(c + separator) == 0
                        ) {
                            //add to category items
                            items[0].push(ti);
                            //only once
                            break;
                        }
                    }
                    if (
                        //child of the namespace of a category item
                        ti.indexOf(ns + separator) == 0
                    ) items[1].push(ti);
                }
            }

            //for any boolean check return false when none were found until here
            //otherwise return namespace items
            return (exists ? false : items);
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
                //get category for namespace
                ns_cat = cat || tid == ns ? '' : store.getValue(ns, 'ns_cat');

            //add popup class
            $(pop).addClass('popup popup_ns');

            //find namespace items
            tids = config.macros.ns.getItems(tid, ns, sep, cat ? cat : ns);

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
                if (!readOnly && (l > 0 || len > 0 || cat)) {
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
        '.ns .tiddlyLink {\n' +
        '   padding: 2px;\n' +
        '}\n' +
        '.ns a.tiddlyLink:hover {\n' +
        '   color:[[ColorPalette::PrimaryDark]];\n' +
        '   background:[[ColorPalette::TertiaryPale]];\n' +
        '}\n' +
        '.ns_btn_popup {\n' +
        '   color:[[ColorPalette::TertiaryLight]];\n' +
        '   padding: 2px 4px;\n' +
        '   margin:0;\n' +
        '}\n' +
        'a.ns_btn_popup {\n' +
        '   color:[[ColorPalette::PrimaryMid]];\n' +
        '}\n' +
        'a.ns_btn_popup:hover{\n' +
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
        '.ns_list .ns_list_add{\n' +
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
        '/*}}}*/';
    store.addNotification('StyleSheetNameSpace', refreshStyles);

})(jQuery);
//}}}