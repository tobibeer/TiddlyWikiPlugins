/***
|''Name''|RandomTiddlersMacro|
|''Description''|returns a list of x out of y random tiddlers, optionally...<br>-> having a certain tag<br>-> returning a tiddler section, slice or field value|
|''Documentation''|http://tobibeer.tiddlyspace.com/#RandomTiddlers|
|''Author''|Tobias Beer|
|''Version''|1.0.4 (2012-07-14)|
|''Source''|https://raw.github.com/tobibeer/TiddlyWikiPlugins/master/plugins/RandomTiddlersMacro.js|
|''License''|[[Creative Commons Attribution-Share Alike 3.0|http://creativecommons.org/licenses/by-sa/3.0/]]|
|''~CoreVersion''|2.2|
!Usage
{{{<<randomTiddlers config>>}}}
!Example
<<randomTiddlers RandomTiddlersConfig>>
!Code
***/
/*{{{*/
config.macros.randomTiddlers = {
    config: 'RandomTiddlersConfig',
    txtConfirm1: 'Please provide a name for the output tiddler:',
    txtConfirm2: 'The tiddler "%0" already exists! Please provide another name for the output tiddler or enter "YES" to overwrite the tiddler "%0":',
    txtSavedTo: 'The following list was saved to tiddler [[%0]]%1...\n',
    txtOpenStory: ' (<<openStory [[%0]]>>)',
    txtAbortAt: 'YES',
    txtNoConfig: '@@color:red;The configuration tiddler called "%0" could not be found!@@',
    handler: function (place, macroName, params, wikifier, paramString, tiddler) {
        //get config
        var cfg = params[0] || this.config;
        //if no config found
        if (!store.getTiddler(cfg)) {
            //display error msg
            wikify(this.txtNoConfig.format([cfg]), place);
            //get out
            return;
        }
        //declare variables
        var a = [], d, i = 0, n = 0, out = '', pos, t, ti, tid, tags, v, vs = [], was,
            //parse configuration
            max = parseInt(store.getTiddlerText(cfg + '::max')) || 10,
            spl = parseInt(store.getTiddlerText(cfg + '::sample')) || 50,
            tgs = store.getTiddlerText(cfg + '::tagged'),
        ex = store.getTiddlerText(cfg + '::exclude'),
            c = store.getTiddlerText(cfg + '::content'),
            q = store.getTiddlerText(cfg + '::type'),
            r = store.getTiddlerText(cfg + '::required') == 'yes',
            st = store.getTiddlerText(cfg + '::saveTo'),
            stt = store.getTiddlerText(cfg + '::saveWithTags') || '',
            s = store.getTiddlerText(cfg + '::sort'),
            fmt = store.getTiddlerText(cfg + '::dateformat'),
            tpl = store.getTiddlerText(cfg),
            //get tiddlers
            tids = store.getTiddlers(s);

        //get tags and excludes
        if (tgs) tgs = tgs.readBracketedList();
        if (ex) ex = ex.readBracketedList();
        //get template
        pos = tpl.indexOf('!Template\n');
        tpl = tpl.substr(pos + 10) + '\n';
        if (tpl.substr(0, 4) == '{{{\n' && tpl.substr(tpl.length - 5, 4) == '\n}}}') {
            tpl = tpl.substr(3, tpl.length - 8);
        }
        //determine query type
        q = q ? q.toLowerCase() : '';
        q = q == 'field' ? 'f' : (q == 'slice' ? '::' : '##');

        //no tag? -> take all
        if (!tgs) a = tids;
            //tag required
        else {
            //loop all tids in reverse
            t = tids.length;
            while (t > 0) {
                t--;
                //get tid
                tid = tids[t];
                //get tid tags
                tags = tid.tags;
                //if has tag

                if (tags && (tags.containsAny(tgs) && (!ex || !tags.containsAny(ex)))) {
                    //get field value
                    if (q == 'f') v = store.getValue(tid, c);
                        //or section / slice value
                    else v = store.getTiddlerText(tid.title + q + c);
                    //if not required or required and available
                    if (!r || r && v) {
                        //push to samples
                        a.push(tids[t]);
                        //remember value
                        vs[tid.title] = v;
                        i++;
                    }
                }
                //break when sample size reached
                if (i >= spl) break;
            }
        }

        //as long as there are any tiddlers left in the sample
        //and we don't have our desired max reached
        while (a.length > 0 && n < max) {
            n++;
            //get random member from sample
            i = Math.floor(Math.random() * a.length);
            //format date
            d = a[i][s].formatString(fmt);
            //format template
            out += tpl.format([a[i].title, c, vs[a[i].title], d, a[i].modifier, a[i].tags], n);
            //remove from samples
            a.splice(i, 1);
            //get next from sample
        }
        //remove first linebreak
        out = out.substr(1);

        if (st) {
            ti = prompt(this.txtConfirm1, st);
            if (ti && ti != st) {
                while (store.getTiddler(ti) && ti != this.txtAbortAt) {
                    was = ti;
                    ti = prompt(this.txtConfirm2.format([ti]));
                };
            }
            if (ti == this.txtAbortAt) ti = was;
            if (ti) {
                store.saveTiddler(
                  ti,
                  ti,
                  out,
                  config.options.txtUserName,
                  new Date(),
                  stt.readBracketedList(),
                  merge({}, config.defaultCustomFields)
                  );
                wikify(this.txtSavedTo.format([ti, config.macros.openStory ? this.txtOpenStory.format([ti]) : '']), place);
                if (config.options.chkAutoSave) autoSaveChanges(null, [ti]);;
            }
        }
        //wikify list
        wikify(out, place);
    }
}
/*}}}*/