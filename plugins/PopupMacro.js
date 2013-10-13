/***
|''Name:''|~PopupMacro|
|''Description:''|create (nested) popups with custom content|
|''Documentation:''|http://tobibeer.tiddlyspace.com/#Popup|
|''Author:''|Tobias Beer (original author: Saq Imtiaz)|
|''Version:''|1.5.0 (2013-10-13)|
|''CoreVersion:''|2.5.3 or better|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/PopupMacro.js|
!Code
***/
//{{{

(function($){

//PARAMETERS
var me = config.macros.popup = {

    //DEFAULTS
    hover: true,
    toggle: false,
    sticky: false,
    arrow: document.all ? " ▼" : " ▾",
    hoverables: '#mainMenu',
    showAfter: 400,
    showStandardAfter: 800,
    enableHover:'.button[tag], .tiddlyLink[tag]',
    disableHover:'.slidr_button',

    //LOCALISATION

    err1: 'missing macro parameters',
    err2: 'missing label or content parameter',

    //THE MACRO
    handler: function (place, macroName, params, wikifier, paramString, theTiddler) {
        var btn, lbl, src, delay, show,
            //parse params
            p = paramString.parseParams('anon', null, true),
            //init params data object
            d = {
                //with content
                content: (params[1] || '').replace(/(\$\)\)|\>\+\>)/g, ">>"),
                //arrow
                arrow: getParam(p, 'arrow', me.arrow)
            },
            //get custom class
            cls = getParam(p, 'class', '');

        //button label
        lbl = params[0];

        //label or content missing?
        if (!lbl || !d.content) {
            //error and out
            createTiddlyError(place, me.err1, me.err2);
            return false;
        }

        //loop these params
        ['sticky', 'toggle', 'hover'].map(function(param){
            //determine named param value (fallback = default)
            var val = getParam(p, param, me[param]);
            //set data for param as...
            d[param] =
                //when 'nohover', etc...
                params.contains('no' + param) ?
                //to false
                false :
                //otherwise to named param or true when 'hover', etc...
                (val || params.contains(param) );

            //turn stringified booleans into boolean
            if(val == 'true') d[param] = 1;
            if(val == 'false') d[param] = 0;
        });

        if(params.contains('noarrow')) d.arrow = '';

        //create popup button
        btn = $(createTiddlyButton(
            place,
            lbl + d.arrow,
            lbl,
            d.toggle ? me.toggleButton : me.show,
            'button popupbutton' + (cls ? ' ' + cls  : ''),
            null,
            null
        ));

        //determine popup class
        d.popclass = 
            'popup popupmacro' +
                (me.inPopup(btn) ? ' nested' : '') +
                (cls ? ' ' + cls : '');

        //when hover is off, show by default
        d.show = (!d.hover);

        //remember settings
        btn.data(d);

        if(d.hover){
            btn.on('mouseover', me.showAfter ? me.delay : me.show);
            btn.on('mouseout', me.abort);
        };
    },
    delay: function (e) {
        var btn = $(this.innerHTML ? this : e);
        btn.data('show', true);
        setTimeout(
            function () {
                if(btn.data('show')){
                    if(btn.is('.popupbutton'))
                        me.show(btn[0])
                    else
                        btn.click();
                }
            },
            btn.is('.popupbutton') ? me.showAfter : me.showStandardAfter
        );
    },
    abort: function (e) {
        $(this).data('show', false);
    },
    toggleButton: function (e){
        var btn = $(this),
            p = btn.data('popup');

        //popup already displayed?
        if(p)
            //close
            Popup.removeFrom($(p).data('level'));
        //popup not displayed?
        else
            //show it
            me.show.apply(this, arguments);
    },
    show: function (e) {
        e = e || window.event;
        var p,
            level = Popup.stack.length,
            btn = $(this.innerHTML ? this : e),
            inPopup = me.inPopup(btn),
            popLevel = inPopup ? btn.closest('.popup').data('level') : 0;

        //when not already open
        if (!btn.data('popup')) {

            if (!inPopup && level)
                Popup.removeFrom(0);
            else if (inPopup && level > 1){
                level = popLevel + 1;
                Popup.removeFrom(level);
            }

            p = createTiddlyElement(
                document.body,
                "ol",
                null,
                btn.data('popclass') + (level ? ' nested' + (level) : '') ,
                null
            );

            btn.data('popup',p).addClass('popupopen');

            $(p).data({
                button:btn,
                level:level,
                sticky:btn.data('sticky')
            }).click(me.popupClick);

            Popup.stack.push({
                root: btn[0],
                popup: p
            });

            wikify(btn.data('content'), p);
            Popup.show(p, true);
        }

        if (e) {
            e.cancelBubble = true;
            if (e.stopPropagation) e.stopPropagation();
        }
        return false;
    },

    popupClick: function(e){
        var e = e || window.event,
            //get popup
            p = $(this).closest('.popup'),
            //get clicked element
            tgt = resolveTarget(e),
            //when link
            linkClicked = $(tgt).closest('a').length;

        //remove popups of deeper levels
        Popup.removeFrom(p.data('level')+1);

        //except when link clicked
        if(linkClicked && !p.data('sticky')){
            //close popup 
            Popup.remove();
        //otherwise
        }else{
            e.cancelBubble = true;
            if (e.stopPropagation) e.stopPropagation();
        }
        return false;
    },

    //checks if an element is inside a popup
    inPopup: function (el) {
        return $(el).closest('.popup').length;
    },

    linkOver: function(e){
        var a = $(this),
            level = a.closest('.popup').data('level') || 0;

        //close
        Popup.removeFrom(level);
        //when
        if(
            (
                //enabled or has tiddler list (groupBy)
                a.is(me.enableHover) || a.data('tiddlers')
            ) && !(
                //when disabled
                a.is(me.disableHover)
            )
        //trigger opening after delay
        ) me.delay(a);
    },

    makeHoverable : function(el){
        var a = $(el);

        //find links in any outer "hoverable" container
        if(
            a.is('a') &&
            a.closest(me.hoverables).length &&
            !a.is('.popupbutton')
        ){
            //a mouseover function to delay opening the popup
            a.off('mouseover', me.linkOver);
            a.on('mouseover', me.linkOver);
            //don't open the popup anymore (unless it already is)
            a.off('mouseout', me.abort);
            a.on('mouseout', me.abort);
        }
    }
}

window.refreshElementsPOPUP = window.refreshElements,
window.refreshElements = function(root,changeList){
    window.refreshElementsPOPUP.apply(this,arguments);
    var el = $(root);
    $('a', el).add(el).each(function(){
        me.makeHoverable(this)
    });    
}

window.invokeMacroPOPUP = window.invokeMacro;
window.invokeMacro = function invokeMacro(place,macro,params,wikifier,tiddler){
    window.invokeMacroPOPUP.apply(this,arguments);
    var last = $(place.lastChild);
    $('a', last).add(last).each(function(){
        me.makeHoverable(this)
    });
}

Popup.removeFromPOPUP = Popup.removeFrom;
Popup.removeFrom = function(from){
    var btn, p, t;
    //loop popups to be removed
    for(t=Popup.stack.length-1; t>=from; t--) {
        //get popup
        p = Popup.stack[t],
        //with root element
        $(p.root)
            //remove level and popup reference
            .removeData('popup')
            //remove open class
            .removeClass('popupopen');
    }
    Popup.removeFromPOPUP.apply(this,arguments);
};

setStylesheet(
    '.nested {padding:3px;margin:-0.5em 0 0 2em !important;}'+
    '.popupbutton {cursor:pointer};',
    'PopupMacroStyles'
);

})(jQuery)
//}}}