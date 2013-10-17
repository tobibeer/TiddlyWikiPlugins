/***
|Name|ListFiltrPlugin|
|Description|Allows to easily filter simple and complex lists|
|Documentation|http://listfiltr.tiddlyspace.com|
|Author|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|Version|1.5.0 (2013-10-17)|
|~CoreVersion|2.6.5|
|License|Creative Commons 3.0|
|Source|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/ListFiltrPlugin.js|
!Info
This plugin allows to filter lists based on a search term and to browse through filter results.
!Example
{{myclass{
*a list item
*another list item
*foo bar
#one
#two
#three
Great!
}}}
<<listfiltr>>
***/
//{{{
//check for placeholder support
function placeholderIsSupported() {
    var test = document.createElement('input');
    return ('placeholder' in test);
}

(function ($) {

var me = config.macros.listfiltr = {

//localisation
InputPlaceholder: 'filter list',
InputLabel: 'Filter list:',
InputTooltip: 'enter a search term to filter the list',

//any items to preserve by default
defaultPreserve: '.st-bullet, .annotation',
//the time in milliseconds to wait for the user having finished typing for each 1000 words
wait: 500,
//the minimum number of search characters
minInput: 2,

//DO NOT OVERRIDE (unless you understand what's going on)
h:      'h1,h2,h3,h4,h5,h6',
index:  'li,dd,dt,td,th,div',

remove: 'lf-h lf-hide lf-found lf-keep lf-section',
ignore: 'br,.pseudo-ol-li,.lf-found,.linkified',

keepOuter: 'b,em,strong,blockquote',
keep: [
    '.lf-keep.lf-h',
    '.lf-found.lf-h',
    '.lf-section.lf-h',
    '.lf-section .lf-h',
    'thead:not(.lf-h) .lf-h',
    'tr.lf-keep td.lf-h',
    'tr.lf-keep th.lf-h',
].join(','),

timer:0,

    //macro handler
    handler: function (place, macroName, params, wikifier, paramString, tiddler) {
        var box, boxwrap, el, list, outer=[], placeholder,
            p = paramString.parseParams('anon', null, true),
            appendTo = getParam(p, 'appendTo', this.appendTo),
            preserve = getParam(p, 'preserve', this.defaultPreserve);

        //when appendTo defined 
        if(appendTo){
            //find tiddler
            list = $(place).closest('.tiddler');
            //find element in list
            place = $(appendTo, list).first()[0] || place;
        }

        //get list as last element
        list = $(place).children().last();
        //ignore any linebreaks
        while (list.is('br')) list = list.prev();

        //when not ol ul, take contents
        if (list.is('span, div')) list = list.contents();

        //wrap the contents in a class
        list.wrapAll('<div class="lf-list"/>');

        //get the list wrapper
        list = list.closest('.lf-list');

        //if module present
        if ($.fn.outline)
            //outline any inner ordered lists to preserve original numbering
            $("ol:not(ol li > ol)", list).outline();

        //preserve all outer elements
        me.keepOuter.split(',').map(function(what){
            //add to list
            outer.push('> ' + what);
        });

        //add preservation class
        $(preserve + (outer.length ? ',' + outer.join(',') : ''), list)
            .addClass('lf-preserve');

        //turn text nodes and adjacent inline contents into pseudo paragraphs
        me.textToParagraph(list);

        boxwrap = $('<div class=lf-search/>').insertBefore(list);
        placeholder = placeholderIsSupported() ? me.InputPlaceholder : '';

        if(!placeholder){
            $('<span class=lf-label/>').html(me.InputLabel).appendTo(boxwrap);
        }
        box = $('<input type="search"/>').attr({
            'title': me.InputTooltip,
            'placeholder' : placeholder
        }).appendTo(boxwrap);

        //filter events
        box.bind('keyup search', function () {
            var box = $(this);
            //stop timer if still typing
            clearTimeout(me.timer);
            //set new timer to run
            me.timer = setTimeout(
                //the filter
                function(){me.filter(box);return true;},
                //wait this long
                me.wait
            )
        })
    },

    //does the actual filtering
    filter:function(box){
        var els, found, h, text, what,
            index = me.index + ',span,' + me.h,
            term = box.val(),
            list = box.closest('.lf-search').next(),
            tree = box.closest('.st-tree'),
            cms = config.macros.simpletree;

        //simpletree handling
        if(term.length > me.minInput){
            list.addClass('lf-filtered');
            if(cms && tree.length && !tree.is('.st-all')){
                cms.toggleAll(tree);
                tree.addClass('lf-tree');
            }
        } else {
            list.removeClass('lf-filtered');
            if(cms && tree.length && tree.is('.st-all.lf-tree')){
                cms.toggleAll(tree);
            }
            tree.removeClass('lf-tree');
        }
        
        //remove any previous listfiltr flags
        $('*', list).removeClass(me.remove);

        //remove highlights
        $('.highlight', list).contents().unwrap();

        //at least two characters?
        if (term.length >= me.minInput) {

            //highlight matches
            me.highlight(term, list);

            //loop all indexed elements
            $(index,list).not(me.ignore).each(function(){
                var col0 = 1, cols, cs, head, max, next, prev, rs, ta, tr, x,
                    //the element
                    el = $(this),
                    //something found inside
                    found = el.is('.highlight') || $('.highlight', el).length;

                //when match inside not ignored element
                if(found && el.not(me.ignore).length){

                    //when not highlight itself
                    if(!el.is('.highlight'))
                        //mark found
                        me.mark(el,true);

                    //get the outer parent as child of filtered list
                    x = el.parentsUntil('.lf-list').last();

                    //when outer to be kept (rest indexed below)
                    if(x.is(me.keepOuter)){
                        //mark found
                        me.mark(x,true);
                        //keep heading
                        h = me.keepHeading(el);
                    }

                    //outer heading
                    x = el.closest(me.h);
                    //when inside one
                    if(x.length)
                        //keep the entire section
                        x.nextUntil(me.h).addClass('lf-keep lf-section')
                    //otherwise when not inside a heading
                    else
                        //keep heading
                        me.keepHeading(el);

                    //get outer definition term
                    x = el.closest('dt');
                    //when in one
                    if(x.length){
                        //mark found or for keeps
                        me.mark(x);
                        //also keep next dd siblings up until dt
                        me.mark(x.nextUntil('dt','dd'));
                    }

                    //outer definition
                    x = el.closest('dd');
                    //when in one
                    if (x.length){
                        //mark dt for keeps
                        me.mark( x.prevAll('dt:first') );
                    }

                    //get outer table cells
                    x = el.closest('td, th');
                    //when td or th
                    if(x.length){
                        //find outer table and set for keeps
                        ta = me.mark(el.closest('table'));

                        //determine if header cell (first column th)
                        head = x.is('th') && !x.prev().length;

                        //get outer row
                        tr = x.closest('tr');

                        //mark row as found when first column, otherwise for keep
                        me.mark(tr, head);
                        //get max number of columns
                        max = me.maxCols(ta);
                        //get number of columns in this row
                        cols = me.numCols(tr);

                        //when this row has less columns than max
                        if(cols < max){
                            //get previous row
                            prev = tr.prev('tr');
                            //loop previous rows
                            do {
                                //mark row
                                me.mark(prev, head);
                                //get another previous row
                                prev =
                                    //when previous has same number of or less cols
                                    me.numCols(prev) <= cols ?
                                    //get it
                                    prev.prev('tr') :
                                    //otherwise not
                                    0;
                            //for as long as there is a previous row
                            } while(prev.length);
                        }
                        //get next row
                        next = tr.next('tr');
                        //loop next rows
                        while(next.length){
                            //when
                            if(
                                //found row has max cols and next row has less OR
                                cols == max && me.numCols(next) < cols ||
                                //found row has less cols and next row equally so
                                cols < max && me.numCols(next) <= cols
                            ){
                                //mark row
                                me.mark(next, head);
                                //get next
                                next = next.next('tr');
                            //more columns                            
                            } else {
                                //stop
                                next = 0;
                            }
                        }

                        //when inside table head
                        if(x.closest('thead').length){
                            //loop all previous items
                            el.prevAll().each(function(){
                                //get colspan
                                cs = $(this).attr('colspan');
                                //add up colspan from table head
                                col0 += cs ? parseInt(cs) : 1;
                            });
                            //loop table rows in table body
                            ta.find('tbody tr').each(function(){
                                //init colspan in this row
                                var col1=0;
                                //loop cells in row
                                $('td, th', this).each(function(){
                                    var tx = $(this);
                                    //get colspan
                                    cs = tx.attr('colspan');
                                    //add up
                                    col1 += cs ? parseInt(cs) : 1;
                                    //when same or above colspan from header
                                    if(col1 >= col0) {
                                        //mark cell as found
                                        me.mark(tx,true);
                                        //mark row as keeps
                                        me.mark(tx.closest('tr'));
                                        //done with this row
                                        return false;
                                    }
                                })
                            })
                        }
                    };

                    //keep timeline items
                    if(el.is('.listTitle') && el.parent().hasClass('timeline'))
                        //mark sibling list items for keeps
                        me.mark( $('> li', el.parent()) );

                    //keep listTitle when item of it found
                    me.mark( el.closest('li').parent().find('> .listTitle') );

                //no match
                } else {
                    //mark hidden
                    el.addClass('lf-h');

                    //when td or th and inside table body
                    if(el.is('td, th') && el.closest('tbody').length){
                        //find tr
                        el.closest('tr')
                            //except when found inside
                            .not('.lf-found, .lf-keep')
                            //add to hidden
                            .addClass('lf-h');
                    }
                }
            });

            //CLEANUP//

            //any lists or tables
            $('ol, ul, dl, table', list).each(function(){
                var x = $(this);
                //any matches
                if($('.lf-found, .lf-keep, .highlight', x).length){
                    //keep
                    x.addClass('lf-keep');
                //no matches
                } else {
                    //hide
                    x.addClass('lf-h');
                }
            });

            //loop all non-found sections
            $(me.h, list).not('.lf-found').each(function(){
                var h = $(this),
                    //assume nothing is visible
                    none = true,
                    //get siblings until next heading
                    els = h.nextUntil(me.h);

                //loop next siblings
                els.each(function(){
                    el = $(this);
                    //when kept or found and not to be hidden
                    if(el.is('.lf-keep, .lf-found') && !el.is('.lf-h')
                    ){
                        //ok, there is one
                        none = false;
                        //out
                        return none;
                    }
                });
                //no visible indexed element?
                if(none)
                    //then hide them all
                    els.removeClass('lf-keep').addClass('lf-h');
            });

            //keep what's to be kept
            $(me.keep, list).removeClass('lf-h');

            //do not hide stuff under list items except further ul ol
            $('.lf-keep', list)
                .children()
                .not('ol, ul')
                .find('.lf-h')
                .not('tr.lf-h')
                .removeClass('lf-h');

            //except when in preserved, hide all of class lf-h 
            $('.lf-h', list)
                .not('.lf-preserve .lf-h')
                .addClass('lf-hide');
        }

        return true;

    },

    highlight: function(term, list){
        //highlight term anywhere in list
        $('*', list).highlight(term);

        //loop all links
        $('.externalLink, .tiddlyLink', list).each(function () {
            var l = $(this),
                link = (
                    l.hasClass('tiddlyLink') ?
                    l.attr('tiddlyLink') :
                    l.attr('href')
                ).replace(/\/\/\:/mg,'_').toLowerCase();

            //when
            if (
                    //found
                    link.indexOf(term.toLowerCase()) > -1 &&
                    //and not yet highlighted
                    !$('.highlight',l).length
            ){
                //wrap link text
                l.contents().wrap('<span class="highlight"/>');
            }
        });
    },

    //keeps a heading for a found element
    keepHeading: function(el, list){
        //outer element in filter list
        var o = el.parentsUntil('.lf-list').last();

        //get heading as previous sibling to outer
        h = o.prev();

        //if not a heading (o is not first after heading)
        if(!h.is(me.h))
            //try to get heading as one of the previous els
            h = o.prevUntil(me.h).last().prev();

        //when heading
        if(h.is(me.h)){
            //no more hiding
            h.removeClass('lf-h').addClass('lf-keep');
        }
    },

    //marks an element
    mark: function(el, found){

        //except when ignored
        el.not(me.ignore)
            //remove hidden or keeps
            .removeClass('lf-keep lf-h')
            //add found or keeps
            .addClass(found ? 'lf-found' : 'lf-keep');

        //return marked element
        return el;
    },

    //wraps those annoying standalone textnodes and adjacent inline content with paragraphs
    textToParagraph: function(list){

        //loop all content elements that are not iframes
        list.find(":not(iframe)").addBack().contents().filter(function () {
            //the element
            var el = $(this);
            //when
            return (
                //text node AND
                this.nodeType == 3 &&
                //has previous OR next node
                ( el.next().length || el.prev().length ) &&
                //not inside preserve
                0 == el.closest('.lf-preserve').length &&
                //not after a pseudo order list item
                0 == el.prevAll('.pseudo-ol-li').length
            )
        //wrap in text wrapper
        }).wrap('<span class="lf-text"/>')

        //loop all just created text wrappers
        $('.lf-text', list).each(function(){

            var p,
                el = $(this),
                nextToBlock = false;

            //when already wrapped => next
            if(el.closest('.lf-p').length) return true;

            //add all previous inline elements, the element and all next
            p = el.prevUntil(me.block).add(el).add(el.nextUntil(me.block));

            //loop all elements in collection
            p.each(function(){
                var x = $(this);
                //any previous or next block level element?
                nextToBlock = x.next().is(me.block) || x.prev().is(me.block);
                //stop when found
                return !nextToBlock;
            });
            //when collection sits next to (rather than just inside) a block level element
            if(nextToBlock)
                //wrap in pseudo paragraph and preserve it
                p.wrapAll('<span class="lf-p lf-preserve"/>');
        })
    },

    //find max number of columns
    maxCols: function(table){
        var max = 0;
        //loop rows
        $('> thead > tr, > tbody > tr', table).each(function(){
            //determine new max
            max = Math.max(max, $('> td, > th',this).length);
        })
        return max;
    },

    //determine number of columns in row
    numCols: function(tr){
        //init count
        var num = 0;
        //loop all cells
        $('> td, > th', tr).each(function(){
            //get colspan
            var cs = $(this).attr('colspan');
            //add up either colspan or single cell
            num += cs ? parseInt(cs) : 1;
        });
        //return
        return num;
    }
}

//add block var now to be able to access me
me.block = me.h + ',' + me.index + ',br,blockquote,ol,ul,dt,p,pre,form';

//helper function to highlight matches
$.fn.highlight = function (term) {
    var pattern = new RegExp('(\\b\\w*' + term + '\\w*\\b)', 'gi'),
         repl = '<span class="highlight">$1</span>';

    this.each(function () {
        $(this).contents().each(function () {
            if (this.nodeType === 3 && pattern.test(this.nodeValue)) {
                $(this).replaceWith(this.nodeValue.replace(pattern, repl));
            }
            else if (!$(this).hasClass('highlight')) {
                $(this).highlight(term);
            }
        });
    });
    return this;
};

config.shadowTiddlers['StyleSheetListFiltr'] =
'/*{{{*/\n' +
'.lf-search {padding:5px;background:#eef;}\n' +
'.lf-hide {display: none !important;}\n' +
'.lf-found {background:#F5F5DC;}\n' +
'.lf-list + br {display:none;}\n' +
'.lf-label {margin-right:5px;font-weight:bold;}\n' +
'.lf-filtered .lf-p {display:block;}\n' +
'.lf-filtered br {display: none;}\n' +
'.lf-preserve.lf-found br {display: block;}\n' +
'/*}}}*/';
store.addNotification('StyleSheetListFiltr', refreshStyles);

})(jQuery);
//}}}