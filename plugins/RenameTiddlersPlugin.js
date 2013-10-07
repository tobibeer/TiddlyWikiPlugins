/***
|''Name''|RenameTiddlersPlugin|
|''Author''|[[Tobias Beer|http://tobibeer.tiddlyspace.com]]|
|''Description''|Allows you to easily rename or delete tiddlers and have tags updated across multiple tiddlers|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/RenameTiddlersPlugin.js|
|''Documentation''|http://renametiddlers.tiddlyspace.com|
|''Version''|0.9.9 BETA (2013-10-07)|
|''~CoreVersion''|2.5.2|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
When you rename a tiddler that serves as a tag you will be asked whether you want to update the tagged tiddlers as well.
***/
//{{{
var me = config.renameTiddler = {
    //localization
    lang: {
        rename: "Rename tag '%0' to '%1' in %2 tidder(s)?",
        remove: "Remove tag '%0' from %1 tidder(s)?"
    },

    //helper function to rename tagged tiddlers
    updateTagged: function (oldTag, newTag, tids) {
        //declare vars
        var t, pos, sp, sRcp, tRcp, tid, touched;
        //no messages
        store.suspendNotifications();
        //loop tids
        for (t = 0; t < tids.length; t++) {
            //get tid
            tid = tids[t];
            //is there a new tag? —> remove old and add new tag in its place
            if (newTag) tid.tags.splice(tid.tags.indexOf(oldTag), 1, newTag);
            //otherwise, justno new tag? —> remove old tag
            else tid.tags.splice(tid.tags.indexOf(oldTag), 1);
            // touch modified date
            tid.modified = new Date();
            //finally, save the tiddler
            //store.saveTiddler(tid);
        }
        //reenable messages
        store.resumeNotifications();
        //update tids
        store.notifyAll();
        //when autosave changes enabled
        if (config.options.chkAutoSave)
            //do what's needed for TiddlySpace
            autoSaveChanges();
    },

    //core functions and hijacks
    core: {
        
        //new function to only get writable tiddlers
        getTaggedTiddlersWritable: function (title, newTitle) {
            //init empty array
            var tagged = [],
                //get tagged tids
                tids = this.getTaggedTiddlers(title);
            //loop tids
            for (t = 0; t < tids.length; t++) {
                //get tid
                tid = tids[t];
                //get write permissions
                sp = tid.fields["server.permissions"];
                //get recipe for tid
                tRcp = tid.fields['server.recipe'];
                //get recipe for server
                sRcp = config.extensions.tiddlyweb ?
                       config.extensions.tiddlyweb.status.space.recipe : '';
                //find private in server recipe
                pos = sRcp.indexOf('_private');

                //skip tiddler when
                if (
                    //same tiddler as the one being changed or removed OR
                    (tid.title == title || tid.title == newTitle) ||
                    //tiddler recipe NOT defined yet OR
                    ! tRcp ||
                    //server.permissions present AND
                    sp &&
                    (
                    //write permissions NOT given on TiddlyWeb
                    sp.indexOf("write") < 0 ||
                    //OR not private recipe (NOT a logged in member)
                    pos != sRcp.length - 8 ||
                    //OR tid & server on not on same space
                    sRcp.substr(0, pos) != tRcp.substr(0, pos) ||
                    //OR this function aborts
                    tid.doNotSave && tid.doNotSave()
                    )
                //skip this tid
                ) continue;
                //add to return
                tagged.push(tid);
            }
            //return writable tagged tiddlers
            return tagged;
        },

        //copy core method
        saveTiddlerRENAMETIDDLERS: TiddlyWiki.prototype.saveTiddler,

        //hijack core method
        saveTiddler: function (title, newTitle, newBody, modifier, modified, tags, fields, clearChangeCount, created, creator) {
            var num, pos;
            //title changed?
            if (title != newTitle) {
                var names = (this.getValue(title,'renamed')||'').readBracketedList();
                names.pushUnique(title);
                if(names.contains(newTitle))names.splice(names.indexOf(newTitle),1);
                this.setValue(
                    title,
                    'renamed',
                    '[[' + (names.length ? names.join(']][[') : title ) + ']]'
                );
                //get tiddlers tagged with old name
                var tagged = this.getTaggedTiddlersWritable(title, newTitle);
                num = tagged.length;
                //when there are any
                if (tagged.length) {
                    //want to update tags?
                    if (confirm(
                            me.lang.rename.format([
                                title,
                                newTitle,
                                num
                            ])
                        ))
                        //update tags
                        me.updateTagged(title, newTitle, tagged);

                    //tiddler doesn't even exist and is empty
                    if (!this.tiddlerExists(title) && newBody == "")
                        // dont create unwanted tiddler
                        return null;
                }
            }

            //call core method on this tiddler
            return this.saveTiddlerRENAMETIDDLERS(
                title,
                newTitle,
                newBody,
                modifier,
                modified,
                tags,
                fields,
                clearChangeCount,
                created,
                creator
            );
        },

        //copy core method
        removeTiddlerRENAMETIDDLER: TiddlyWiki.prototype.removeTiddler,

        //hijack core method
        removeTiddler: function (title) {
            //get tagged tids
            var tagged = this.getTaggedTiddlersWritable(title);
            //are there any?
            if (tagged.length)
                //confirmation to remove tag from tagged?
                if (confirm(
                        me.lang.remove.format([
                            title,
                            tagged.length
                        ])
                    ))
                    //remove tags
                    me.updateTagged(title, '', tagged);
            //call core function
            return this.removeTiddlerRENAMETIDDLER(title);
        },

        // Return an array of the tiddlers that link to a given tiddler
        getReferringTiddlers: function(title,unusedParameter,sortField)
        {
            var names = (store.getValue(title,'renamed')||'').readBracketedList();
            names.push(title);
            if(!this.tiddlersUpdated)
                this.updateTiddlers();
            return this.reverseLookup(
                "links",
                names,
                true,
                sortField
            );
        },

        // Return an array of the tiddlers that do or do not have a specified entry in the specified storage array (ie, "links" or "tags")
        // lookupMatch == true to match tiddlers, false to exclude tiddlers
        reverseLookup: function(lookupField,lookupValue,lookupMatch,sortField)
        {
            var results = [];
            this.forEachTiddler(function(title,tiddler) {
                var f = !lookupMatch;
                var values;
                if(["links", "tags"].contains(lookupField)) {
                    values = tiddler[lookupField];
                } else {
                    var accessor = TiddlyWiki.standardFieldAccess[lookupField];
                    if(accessor) {
                        values = [ accessor.get(tiddler) ];
                    } else {
                        values = tiddler.fields[lookupField] ? [tiddler.fields[lookupField]] : [];
                    }
                }
                if(
                    values.containsAny(
                        typeof lookupValue == 'object' ?
                        lookupValue :
                        [lookupValue]
                    )
                ){
                    f = lookupMatch;
                }
                if(f)
                    results.push(tiddler);
            });
            if(!sortField)
                sortField = "title";
            return this.sortTiddlers(results,sortField);
        }
    },

    //initialize plugin
    init: function () {
        //update core methods
        merge(TiddlyWiki.prototype, this.core);
    }
}

findRenamedTiddler = function(title){
    var found = false;
    if(!store.tiddlerExists(title)){
        store.forEachTiddler(function(tid){
            var renamed = (store.getValue(tid,'renamed')||'').readBracketedList();
            if(renamed.contains(title)){
                title = tid;
                found = true;
                return false;
            }
        });
    }
    return [title, found];
}

Story.prototype.displayTiddlerRENAME = Story.prototype.displayTiddler;
Story.prototype.displayTiddler = function(srcElement,tiddler,template,animate,unused,customFields,toggle,animationSrc)
{
    tiddler = findRenamedTiddler(
        (tiddler instanceof Tiddler) ? tiddler.title : tiddler
    )[0];
    return Story.prototype.displayTiddlerRENAME.apply(this, arguments);
};

createTiddlyLinkRENAME =  createTiddlyLink;
createTiddlyLink = function(place,title,includeText,className,isStatic,linkedFromTiddler,noToggle)
{
    var renamed = findRenamedTiddler(jQuery.trim(title));
    title = renamed[0];
    return jQuery(createTiddlyLinkRENAME.apply(this,arguments))
        .addClass(renamed[1] ? 'tiddlyLinkRenamed' : '')[0];

}

getTiddlyLinkInfoRENAME = getTiddlyLinkInfo
getTiddlyLinkInfo = function(title,currClasses)
{
    title = findRenamedTiddler(title)[0];
    return getTiddlyLinkInfoRENAME.apply(this,arguments);
}

config.paramifiers.open.onstart = function(v) {
    v = findRenamedTiddler(v)[0];
    if(!readOnly || store.tiddlerExists(v) || store.isShadowTiddler(v))
        story.displayTiddler("bottom",v,null,false,null);
};

//run init
me.init();
//}}}