/***
|''Name:''|FiltrPlugin|
|''Description:''|provides interactive tiddler filtering by date range, tags or modifers|
|''Documentation:''|http://filtr.tiddlyspace.com|
|''Author:''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Version:''|1.4.2 (2013-09-25)|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/FiltrPlugin.js|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
|''~CoreVersion:''|2.5|
<<filtr showTags exclude:''>>
***/
//{{{
(function ($) {

//reference to the macro
var me = config.macros.filtr = {};

//define macro namespace
config.macros.filtr = $.extend(me, {

    //OPTIONS
    exclude: 'excludeLists',

    sortField: '-modified',

    showSpaces: false,
    showTags: false,
    showUsers: false,
    showValues: false,
    showDates: true,
    showMonths: true,
    showLabels: true,
    showCount: true,

    //whether to show buttons for untagged or tids w/o value for field
    showNoTag: true,
    showNoValue: true,
    //whether to initialise with all years shown
    allYears: true,

    //whether or not to enable listfiltr
    listfiltr: true,

    //OUTPUT FORMAT
    fmtHeaderCount: '%0',
    fmtHeaderField: '%0',
    fmtHeader: '',
    fmtItem: '\n*%modified: @@padding-left:5px;%hastags@@ %tags',
    fmtCount: '',
    fmtField: '%0',
    fmtDate: 'YYYY-0MM-0DD',
    fmtYear: 'YYYY',
    fmtMonth: 'mmm',
    fmtTags: '@@padding-left:20px;color:#666; ...tags: %0@@',
    fmtTag: '<<tag [[%0]]>>',
    fmtTagSeparator: '',
    fmtLabel: '%0:',

    //LOCALISATION
    txtSel: 'select ',
    txtSet: 'set or unset %0 filter to %1...',
    txtSpace: 'space',
    txtTag: 'tag',
    txtUser: 'user',
    txtYear: 'year',
    txtMonth: 'month',
    txtEmpty: {
        tag: '<untagged>',
        user: '<missing>',
        space: '<missing>',
        field: '<undefined>',
    },

    //none specified by default
    spaces:'',
    users:'',
    tags:'',
    field:'',

    //THE MACRO HANDLER
    handler: function (place, macroName, params, wikifier, paramString, tiddler) {
        var 
            //loads of vars
            b, bT, bS, bU, checkDate=0, f, isDate, l, p = {},
            t = 0, tids = [], ts, tx = {}, vF, vT, vU, vS, yrs = [],
            //get TiddlySpace
            ts = config.extensions.tiddlyspace,
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
            'exclude|x',
            'sortField|sf',

            'showSpaces|bS',
            'showTags|bT',
            'showUsers|bU',
            'showValues|bF',
            'showDates|bD',
            'showMonths|bM',
            'showLabels|bL',
            'showCount|bC',

            'showNoTag|nT',
            'showNoValue|nV',

            'allYears|aY',

            'listfiltr|lf',

            'fmtHeader|f0',
            'fmtItem|f1',
            'fmtCount|fc',
            'fmtHeaderCount|fch',
            'fmtDate|fd',
            'fmtField|ff',
            'fmtHeaderField|ffh',
            'fmtYear|fy',
            'fmtMonth|fm',
            'fmtTag|ft',
            'fmtTags|fts',
            'fmtTagSeparator|sep',
            'fmtLabel|fl',

            'spaces',
            'tags',
            'users',
            'field|fi'

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
            p[pa] = getParam( px, x,
                //fallback to template, if defined
                tpl && tx[x] ? tx[x] :
                    //otherwise fallback to default
                    (me[x] != undefined ? me[x] : '')
            );

            //if not a named parameter
            if (params.contains(x)) {
                //set as true anyways
                p[pa] = true;
            }

        });

        //descending?
        p.desc = 0 == p.sf.indexOf('-'),
        //correct sortfield
        p.sf = p.desc ? p.sf.substr(1) : p.sf;

        //create filtr wrapper
        f = createTiddlyElement(place, 'div', null, 'filtr');

        //check for field
        p.fi = (p.fi).split('|');
        //field label
        p.filbl = p.fi[0];
        //field name
        p.fi = (p.fi[1] || p.fi[0]).toLowerCase();

        //initiate excluded tids
        p.ex = [];

        //get excluded tags
        p.x = p.x.readBracketedList();
        //add to exclude tids
        p.x.map(function(x){ p.ex.push(x); });

        //loop all tids => must be separate loop first
        store.forEachTiddler(function (tw, t) {
            //tid has excludeTag?
            if (p.x.containsAny(t.tags)) {
                //add to excluded
                p.ex.pushUnique(t.title);
            //otherwise
            } else {
                //add to filtered set
                tids.push(t);
            }
        });

        //all boolean params, e.g.
        [
            //show dates, tags, users, field values, months
            'bS','bT', 'bU', 'bF', 'bD', 'bM',
            //show group label or count
            'bL', 'bC',
            //show buttons for untagged or no value
            'nT', 'nV',
            //show listfiltr
            'lf'
        //loop params
        ].map(function (b) {
            //set depending on whether set to 'true'
            p[b] = 'true' == p[b].toString();
        });

        //defined spaces and on TiddlySpace
        if(p.spaces && ts){
            //remember that spaces are defined
            bS = true;
            //turn into array
            p.spaces = p.spaces.readBracketedList();
        //otherwise
        } else
            //initialise spaces array
            p.spaces = [];

        //all spaces only on TiddlySpace when when ot individually defined and turned on
        p.bS = ts && !bS && p.bS;

        //defined tags?
        if (p.tags)
            //remember that tags were defined
            bT = true;
        //otherwise
        else
            //initialize as array
            p.tags = [];

        //all tags only when no defined tags and when turned on 
        p.bT = !bT && p.bT;

        //individual tags defined?
        if(bT){
            //get tags from tiddler, section or slice
            if (p.tags.substr(0, 8).toUpperCase() == 'TIDDLER=')
                //get tags from it
                p.tags = store.getTiddlerText(p.tags.substr(8)) || '';

            //turn into array and sort
            p.tags = p.tags.readBracketedList();
        }

        //defined users?
        if(p.users){
            //remember that spaces are defined
            bU = true;
            //turn into array
            p.users = p.users.readBracketedList();
        //otherwise
        } else
            //initialise spaces array
            p.users = [];

        //all users only when when not individually defined and turned on
        p.bU = !bU && p.bU;   

        //initialize individual field values
        p.vals = [];

        //loop tids
        while( t < tids.length ){
            //reset abort condition
            b = 1;

            //get tid
            tid = tids[t];

            //when excluded
            if(p.x.containsAny(tid.tags)){
                //abort
                b=0;
            }

            //when not aborted and show defined or all spaces
            if(b && ts.resolveSpaceName && (bS || p.bS)){
                //get space
                vS = ts.resolveSpaceName(
                    //via server.bag field
                    store.getValue( tid.title, 'server.bag')
                );

                //when set of defined spaces but not in set
                if(bS && !p.spaces.contains(vS))
                    //abort
                    b=0;
            }

            //when not aborted and defined tags?
            if(b && bT){
                //when no tag matches
                if(!p.tags.containsAny(tid.tags) )
                    //abort
                    b=0;
            }

            //when not aborted and all tags
            if(b && p.bT){

                //reset temporary tag values
                vT=[];

                //when untagged
                if(tid.tags.length == 0){
                    //when untagged to be shown
                    if(p.nT)
                        //add empty
                        vT.push('');
                    //when not to be shown
                    else
                        //abort
                        b=0;
                }
                //loop tags
                tid.tags.map(function(tag){

                    //not in tags yet
                    if (!p.tags.contains(tag)){

                        //get tag tiddler
                        var tid = store.getTiddler(tag);

                        //when excluded
                        if (p.ex.contains(tag) ||
                            p.ex.containsAny(tid ? tid.tags : []) ) {

                            //abort
                            b=0;

                        //otherwise
                        } else {

                            //remember tag
                            vT.push(tag);
                        }
                    }
                })
            }

            //when not aborted and show defined or all users
            if(b && (bU || p.bU)){
                //remember modifier value
                vU = tid.modifier;
                //when set of defined users but not in set
                if(bU && !p.users.contains(vU))
                    //abort
                    b=0;
            }

            //when show vals
            if(b && p.bF){
                //get field value
                vF = store.getValue( tid.title, p.fi);
                //when empty not to be shown and empty or already in values
                if(!p.nV && !vF || p.vals.contains(vF)){
                    //abort
                    b = 0;
                }
            }

            //when not aborted and show dates
            if(b && p.bD){
                //first time for date?
                if(0 == checkDate){
                    //check if date field
                    isDate = me.isDate(tid[p.sf]);
                    //initialise yMin and yMax
                    p.yMin = 3000;
                    p.yMax = 0;
                    //done checking
                    checkDate = 1;
                }

                //sortfield is date?
                if(isDate){
                    var y = new Date(tid[p.sf]).getYear() + 1900;
                    //min and max year
                    p.yMin = Math.min(p.yMin, y);
                    p.yMax = Math.max(p.yMax, y);
                    //mark as existing year
                    yrs[y] = true;
                }
            }

            //when none aborted
            if (b) {
                //when space value
                if(vS != undefined)
                    //add to spaces
                    p.spaces.pushUnique(vS);

                //any tags from this tid
                if(vT != undefined)vT.map(function(t){
                    //add to tags
                    p.tags.pushUnique(t);
                });

                //user remembered?
                if(vU != undefined)
                    //add to users array
                    p.users.pushUnique(vU);

                //when tid value
                if(vF != undefined)
                    //add to unique values
                    p.vals.pushUnique(vF);

                //next tid
                t++;

            //when any aborted
            } else {
                //remove tid
                tids.splice(t,1);
            }
        };

        //loop possible filter groups
        'Space|User|Tag|VAL|Year|Month'.split('|').map(function(W){
            //vars
            var css, g, av, v, val,
                //get as lowercase
                w = W.toLowerCase(),
                //get value array as either p.spaces, p.tags, p.users or p.vals
                arr = p[w+'s'],
                //get text for filter group as either fieldname or config label
                txt = W == 'VAL' ? p.filbl : me['txt' + W],
                //when wanted, format group label with text or fieldname, otherwise none
                lbl = p.bL ? (p['fl'].format([txt.length < 15 ? txt : txt.replace(/(\.|\_)/mg,'.\n')])) : '',
                //construct css class applied to button (remove dots in fieldnames)
                css = 'filtr_' + (W == 'VAL' ? p.fi.replace(/\./mg,'_') : w),
                //determine group identifier
                group = W == 'VAL' ? p.fi : w;

            //value array?
            if(arr){
                //has elements?
                if(arr.length){
                    //sort
                    arr.sortCaseInsensitive();
                    //when first is empty
                    if('' == arr[0]){
                        //make last again
                        arr.splice(0,1);
                        arr.push('');
                    }
                //otherwise no group
                } else return true;
            //otherwise
            } else if (
                //when no dates
                !p.bD ||
                //or no months and month group
                !p.bM && W=='Month'
            ){
                //no year or month group either
                return true;
            }

            //create new group
            g = createTiddlyElement(f, 'div', null, 'filtrGroup');

            //when labels enabled
            if (lbl)
                //create label element
                createTiddlyElement(g, 'strong', null, null, lbl);

            //button container
            g = createTiddlyElement(g, 'div', null, css, null, {'group': group});

            //loop...
            for(
                //control var as...
                v =
                    //years from max
                    group == 'year' ? p.yMax :
                    //months from first
                    group == 'month' ? 1 :
                    //other from first array value
                    0;

                //until...
                //years greater max
                group == 'year' ? v >= p.yMin :
                //months beyond 12
                group == 'month' ? v < 13 :
                //last array value
                v < arr.length;

                //decrement years by 1
                group == 'year'  ? v-- :
                //increment all others by 1
                v++
            ){
                //when...
                if(
                    //year but there are no years or no tids in that year
                    group == 'year' && (!p.yMin || !yrs[v]) ||
                    //month but disabled or there are not even years
                    group == 'month' && (!p.bM || !p.yMin)
                )
                    //don't create a button
                    continue;

                //get array value
                av = arr ? arr[v] : v;

                //get value
                val =
                    //format year val
                    group == 'year' ? new Date(v + '/01/01 00:00:00').formatString(p.fy) :
                    //or month val
                    group == 'month' ? new Date('2000/' + String.zeroPad(v, 2) + '/01 00:00:00').formatString(p.fm) :
                    //empty value
                    '' == av ? me.txtEmpty[W == 'VAL' ? 'field' : group] : 
                    //take array value
                    av;

                //add button
                $(createTiddlyButton(
                    //in filter group
                    g,
                    //val as text
                    val,
                    //format tooltip with group text and button val
                    me.txtSet.format(txt, val),
                    //filter on click
                    me.filter,
                    //set button class(es)
                    'button')
                )
                    //set value as data
                    .data(
                        //to either year or month, otherwise val
                        'value', av == '' ? '' : ['year','month'].contains(group) ? v : val )
                    
                    //no doubleclick
                    .dblclick(
                        function(){return false}
                    )
            }
        });

        //create the filtered list
        l = $(createTiddlyElement(place, 'div', null, 'filtrList'));

        //store params at list
        l.data(p);

        //run the filter for the first time
        this.filter(l);
    },


    // RUN FILTER //
    filter: function (e) {

        var b, d, fi, g, l, n = 0, out = '', sk, stgs, t, tid, tx, tags, v, val,
            //get TiddlySpace functions
            ts = config.extensions.tiddlyspace,
            //get button (perhaps)
            $btn = $(e.html ? e : this),
            //try to get attribute
            v = $btn.data('value'),
            //get event
            ev = e || window.event,
            //shift or ctrl key pressed?
            sk = ev.shiftKey,
            //get filtr list => first time or button click
            $el = e.html ? $btn : $btn.closest('.filtr').next(),
            //filter groups DOM container
            $fs = $el.prev(),
            //get params
            p = $el.data(),
            //filter group names
            groups = ('space|user|tag|VAL|year|month').split('|');

        //no selected dates yet?
        if(p.y0 == undefined){
            //initialise last year as current
            p.y1 = p.yMax;
            //depending on preference, initialise first as first or last year
            p.y0 = p.aY ? p.yMin : p.y1;
            //first show all months
            p.m0 = 1;
            p.m1 = 12;
        }

        //get all tids by sortfield
        tx = store.getTiddlers(p.sf);

        //button has value? (button click)
        if (v != undefined) {

            //get button filter group
            g = $btn.closest('div').attr('group');

            //which group was it?
            switch (g){

                //space clicked
                case 'space':
                    //toggle when same, else take it
                    p.space = p.space == v ? undefined : v;
                    break;

                //tag clicked
                case 'tag':
                    //toggle when same, else take it
                    p.tag = p.tag == v ? undefined : v;
                    break;

                //user clicked
                case 'user':
                    //toggle when same, else take it
                    p.user = p.user == v ? undefined : v;
                    break;

                //year clicked
                case 'year':
                    //shift key pressed?
                    if (sk) {
                        //get last year
                        l = p.yX;
                        //set? take it, otherwise take first
                        l = l ? l : p.y0;
                        //set attribute for year range
                        //first year
                        p.y0 = v<l ? v : l;
                        //last year
                        p.y1 = v<l ? l : v;

                    //when single month clicked without shift key
                    } else {
                        //when button
                        if(
                            //was selected BUT
                            $btn.hasClass('filtr_active') &&
                            //not all selected
                            $btn.parent().find('.button').not('.filtr_active').length > 0
                        ){
                            //all years
                            p.yX = p.y0 = p.yMin;
                            p.y1 = p.yMax; 
                        //not selected
                        } else {
                            //select single year
                            p.yX = p.y0 = p.y1 = v;
                        }
                    }

                    //when control key not clicked
                    if(!ev.ctrlKey){
                        //select all months
                        p.m0 = p.mX = 1;
                        p.m1 = 12;                                
                    }
                    break;

                //month clicked
                case 'month':
                    //shift key pressed?
                    if (sk) {
                        //get clicked month
                        l = p.mX;
                        //if defined, take it otherwise first
                        l = l ? l : p.m0;
                        //sett month range
                        p.m0 = v<l ? v : l;
                        p.m1 = v<l ? l : v;

                    //no shift key
                    } else {
                        //when button
                        if(
                            //was selected BUT
                            $btn.hasClass('filtr_active') &&
                            //not all selected
                            $btn.parent().find('.button').not('.filtr_active').length > 0
                        ){
                            //select all months
                            p.mX = p.m0 = 1;
                            p.m1 = 12;
                        } else {
                            //select single month
                            p.m0 = p.m1 = p.mX = v;
                        }
                    }
                    break;

                //field value clicked
                default:
                    //toggle when same, else take it
                    p.field = p.field == v ? undefined : v;
                    break;
            }
        }

        //loop tids either ascending or descending
        for (
                t = p.desc ? tx.length - 1 : 0;
                    p.desc ? t >= 0 : t < tx.length;
                    p.desc ? t-- : t++
        ){
            //the tid
            tid = tx[t];
            
            //get field value or leave empty
            val = p.fi ? store.getValue(tid.title, p.fi) : '';

            //get space or leave empty
            space =
                ts && ts.resolveSpaceName ?
                ts.resolveSpaceName(store.getValue(tid.title, 'server.bag')) :
                '';

            //get sortfield value first as standard second as custom field
            d = tid[p.sf] ? tid[p.sf] : store.getValue(tid.title, p.sf);

            //continue when
            if (
                //tid excluded OR
                p.ex.containsAny(tid.tags) ||
                //space clicked and tid not in space OR
                undefined != p.space && space != p.space ||
                //tag clicked and not untagged clicked while untagged and tid doesn't have the tag OR
                undefined != p.tag && !(p.tag == '' && !tid.tags.length) && !tid.tags.contains(p.tag) ||
                //user clicked and tid not from user OR
                undefined != p.user && p.user != tid.modifier ||
                //field clicked but not empty while undefined and doesn't match OR
                undefined != p.field && !(p.field == '' && val == undefined) && p.field != val ||
                //dates shown but not in range OR
                p.bD && !me.inRange(d, p.m0, p.m1, p.y0, p.y1) ||
                //field and not all values shown for the field and no field value
                p.fi && !p.bF && !val
            ) continue;

        	//get tags as string
            stgs =
                //no tags?
                !tid.tags || tid.tags.length < 1 ?
                //nothing
                '' :
                //otherwise, format tags
                p.fts.format([
                	//one tag?
                    tid.tags.length == 1 ?
                    //format one
                    p.ft.format([tid.tags[0]]) :
                    //or loop multiple tags
                    tid.tags.map(
                        //and format individually
                        function (t, n) { return p.ft.format([t]); }
                    //and join them up using the separator
                    ).join(p.sep)
                ]);

            //count up
            n++;

            //output
            out += p.f1.replace(/%nl/mg, '\n'
                ).replace(/%title/mg, '[[' + tid.title + ']]'
                ).replace(/%modifier/mg, tid.modifier
                ).replace(/%modified/mg, tid.modified.formatString(p.fd)
                ).replace(/%created/mg, tid.created.formatString(p.fd)
                ).replace(/%sortfield/mg, p.bD || me.isDate(d) ? d.formatString(p.fd) : d
                ).replace(/%space/mg, space
                ).replace(/%tags/mg, stgs
                ).replace(/%hastags/mg, store.getTaggedTiddlers(tid.title).length > 0 ? '<<tag [[' + tid.title + ']]>>' : '[[' + tid.title + ']]'
                ).replace(/%field/mg, p.fi ? p.ff.format([me.isDate(val) ? (new Date(val).formatString(p.fd)) : val]) : ''
                ).replace(/%count/mg, p.bC ? p.fc.format([n]) : '');
        }

        //all filter groups 
        groups.map(function (g) {

            //reset field flag
            fi = 0;
            //when field value group
            if(g == 'VAL'){
                //remember
                fi = 1;
                //get saniized group name
                g = p.fi.replace(/\./mg,'_');
            }

            //get buttons in group
            var $buttons = $('.filtr_' + g + ' .button', $fs);

        	//loop all buttons in group
            $buttons.each(function () {

                var
                    //the button
                	$el = $(this),
                    //it's value
            		v = $el.data('value');

                //when
                if(
                    //just one button
                    $buttons.length == 1                                     ||
                    //selected year button
                    g == 'space'  && (undefined == p.space  || p.space == v) ||
                    //selected tag button
                    g == 'tag' && (undefined == p.tag || p.tag == v)         ||
                    //selected user button
            		g == 'user' && (undefined == p.user || p.user == v)      ||
                    //selected year button
                    g == 'year'  && p.y0 <= v && v <= p.y1                   ||
                    //selected month button
                    g == 'month' && p.m0 <= v && v <= p.m1                   ||
                    //selected field button
                    fi && (undefined == p.field || p.field == v)
                )
                    //make selected
                	$el.addClass('filtr_active');

                //otherwise
            	else
                    //removie selected
            		$el.removeClass('filtr_active');
            });
        });

        //empty filtered list
        $el.empty();
        //output defined?
        if (out) {
            //wikify
            wikify(
                (
                    //listfiltr enabled?
                    p.lf && config.macros.listfiltr ?
                    //into appropriate container
                    '\n{{filtr_list{%0\n}}}<<listfiltr>>' :
                    //just the output
                    '%0'
                //format that template with
                ).format([
                    //the header
                    p.f0
                        //replacing field, count and sortfield placeholders
                        .replace(/%field/mg, p.fi ? p.ffh.format([p.filbl]) : '')
                        .replace(/%count/mg, p.bC ? p.fch : '')
                        .replace(/%sortfield/mg, p.sf)
                    //and the output
                    + out
                ]),
                //into filtrlist
                $el[0]
            )
        }

        //table sorting installed?
        if (config.tableSorting && config.tableSorting.refresh)
            //refresh that
            config.tableSorting.refresh($el[0].parentNode);

        //done
        return false;

    },

    //whether date is in date range
    inRange: function (d, m0, m1, y0, y1) {
        var y,
            //get days in month
            dInM = 32 - new Date(y1, m1 + 1, 32).getDate();

        //a single month may be selected for multiple years, so
        //loop years
        for (y = y0; y <= y1; y++) {

            //when
            if (

                //date before start
                d >= this.getDate(y, m0, 1) &&
                //and before end
                d <= this.getDate(y, m1, dInM, true)
            ) return true;
        }
        return false;
    },

    //gets a new date
    getDate: function (y, m, d, e) {
        return new Date(
            y + '/' +
            String.zeroPad(m, 2) + '/' +
            String.zeroPad(d, 2) +
            (e ? ' 23:59:59' : ' 00:00:00')
        )
    },

    //check if date
    isDate: function (d) {
        return (new Date(d)).getMonth();
    }
});

//when not defined yet, allow to sort case insensitively
if(!Array.prototype.sortCaseInsensitive)
    Array.prototype.sortCaseInsensitive = function(){
    return this.sort(function(a,b){
      var aL = a.toLowerCase(), bL = b.toLowerCase();
      return aL < bL  ? -1: aL > bL ?  1 : 0;
    });
}

config.shadowTiddlers.StyleSheetFiltr = '/*{{{*/\n' +
    '.filtr {display:block;}\n' +
    '.filtr .button{display:block;float:left;margin:3px 3px 0 0;padding:0.2em 0.4em;-moz-border-radius:7px;border-radius:7px;}\n' +
    '.filtr .filtr_active{background:#FE8 !important;}\n' +
    '.filtrGroup {display:block;padding:5px 0 0 0;clear:left;vertical-align:middle;}\n' +
    '.filtrGroup div {display:block; float:left; width:85%;}\n' +
    '.filtrGroup strong{display:block;float:left;min-width:80px;width:14%;text-align:right;padding-top:0.2em;margin:3px 1% 0 0;}\n' +
    '.filtrList {clear:left;padding-top:1px;}\n' +
    '.filtrList ul {list-style-type:none;}\n' +
    '.filtrList ul,.filtrList ol {margin-left:0;padding-left:0em;list-style-position:inside;}\n' +
    '.filtrList ul li,.filtrList ol li {border-bottom:1px solid #eee;margin-bottom:3px;padding-left:0.5em;}\n' +
    '/*}}}*/';
store.addNotification("StyleSheetFiltr", refreshStyles);

})(jQuery);
//}}}