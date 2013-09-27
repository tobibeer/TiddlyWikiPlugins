/*global window,tiddlyweb,$*/
/*
 * Bookmarker code
 * The tabs object encapsulates all the code for each actual tab.
 * Each tab is an instance of the Tab object, which includes functions for
 * populating the tab with data, turning the data in the tab into a tiddler,
 * etc.
 * There is a Default tab, which can be extended, with specific values
 * overidden only when they differ.
 * The app starts up when it receives a message (i.e. receiveMessage).
 * This triggers a callback from details (an event queue like thing) that is
 * listening for the data to arrive.
 */
(function() {
	var id; // we use this ID to verify that we only take notice of the correct
			// messages that we receive from postMessage

	var details = {
		queue: [],
		set: function(target, data) {
			this[target] = data;
			this.done(target);
		},
		done: function(target) {
			var self = this;
			this.queue = $.map(this.queue, function(obj, i) {
				if (obj.target === target) {
					obj.fn(self[target]);
					return null;
				}
				return obj;
			});
		},
		when: function(target, func) {
			this.queue.push({
				target: target,
				fn: func
			});
			if (this[target]) {
				this.done(target);
			}
		}
	};

	function _extend(target, obj) {
		var key;
		for (key in obj) {
			if (obj.hasOwnProperty(key)) {
				if ((!~['string', 'function'].indexOf(typeof obj[key]))
						&& (!$.isArray(obj[key]))
						&& (target.hasOwnProperty(key))) {
					target[key] = _extend(_extend({}, target[key] || {}),
						obj[key]);
				} else {
					target[key] = obj[key];
				}
			}
		}
		return target;
	}

	function Tab(opts) {
		_extend(this, opts);
		this.$el = $(this.el);
	}

	Tab.prototype.extend = function(opts) {
		var newTab = new Tab(this);
		_extend(newTab, opts);
		newTab.$el = $(newTab.el);
		return newTab;
	};

	Tab.prototype.setTab = function(data) {
		var $el = this.$el,
			self = this;
		$.each(this.bind, function(field, selectors) {
			var res = (self.populate[field]) ?
					self.populate[field].call(self, data) : data[field];
				res = $.isArray(res) ? res : [res];
				selectors = $.isArray(selectors) ? selectors : [selectors];
			$.each(selectors, function(i, selector) {
				var $subEl = $el.find(selector),
					setFn = ($subEl[0].nodeName === 'DIV') ? 'html' : 'val';
				if (res[i]) {
					$subEl[setFn](res[i]);
				}
			});
		});
		this.setFocus();
	};

	Tab.prototype.setTiddler = function() {
		var tiddler = new tiddlyweb.Tiddler(),
			priv = this.getPrivate(),
			self = this;

		$.each(this.bind, function(field, selectors) {
			var fn = self.toTiddler[field] || function(txt) { return txt; };
			if (tiddler.hasOwnProperty(field)) {
				tiddler[field] = self.callWithValues(field, fn);
			} else {
				tiddler.fields = tiddler.fields || {};
				tiddler.fields[field] = self.callWithValues(field, fn);
			}
		});

		details.when('data', function(data) {
			tiddler.bag = new tiddlyweb.Bag(data.space + priv, '/');
			details.set('tiddler', tiddler);
		});
	};

	Tab.prototype.getPrivate = function() {
		return $('.form-actions [name="private"]input').attr('checked') ?
						'_private' : '_public';
	};

	Tab.prototype.setFocus = function() {
		var $el = this.$el.find(this.focus);
		// use a setTimeout due to weirdness in chrome
		window.setTimeout(function() {
			$el.focus();

			// HACKY: changing the text forces the cursor to the end of the textarea
			var val = $el.val();
			$el.val('');
			$el.val(val);
		}, 0);
	};

	Tab.prototype.callWithValues = function(field, fn) {
		var args = [],
			selectors = this.bind[field],
			$el = this.$el;
		selectors = $.isArray(selectors) ? selectors : [selectors];
		$.each(selectors, function(i, selector) {
			args.push($el.find(selector).val());
		});
		if (typeof fn === 'function') {
			return fn.apply(this, args);
		} else {
			return this[fn].apply(this, args);
		}
	};

	Tab.prototype.figureTags = function(tagString) {
		var brackets = /^\s*\[\[([^\]\]]+)\]\](\s*.*)/,
			whitespace = /^\s*([^\s]+)(\s*.*)/,
			match,
			rest = tagString,
			tags = [];

		match = brackets.exec(rest) || whitespace.exec(rest);
		while (match) {
			tags.push(match[1]);
			rest = match[2];
			match = brackets.exec(rest) || whitespace.exec(rest);
		}

		return tags;
	};


	Tab.prototype.isEmpty = function() {
		return this.$el.find((this.bind && this.bind.title) || this.focus)
			.val() === '';
	};

	var Default = new Tab({
		focus: '[name="text"]textarea',
		bind: {
			title: '[name="title"]input',
			text: '[name="text"]textarea',
			tags: '[name="tags"]input',
			url: '[name="url"]input'
		},
		populate: {},
		toTiddler: { tags: 'figureTags' }
	});

	var tabs = {
		post: Default.extend({
			el: '#postForm',
			populate: {
				text: function(data) {
					return data.text ?
						'> ' + data.text.split('\n').join('\n> ') : '';
				}
			}
		}),
		link: Default.extend({
			el: '#linkForm',
			bind: { text: [ '[name="text"]textarea', '[name="url"]input'] },
			toTiddler: {
				text: function(txt, url) {
						return ['url: ', url, '\n', txt].join('\n');
				}
			}
		}),
		quote: Default.extend({
			el: '#quoteForm',
			bind: { text: [ '[name="text"]textarea', '[name="quote"]textarea'] },
			populate: {
				text: function(data) {
					var text = '[[' + data.title.replace('|', '>') + '|'
							+ data.url + ']]',
						quote = data.text;
					return [ text, quote ];
				}
			},
			toTiddler: {
				text: function(txt, quote) {
						return ['<<<', quote, '<<<', txt].join('\n');
				}
			}
		}),
		image: Default.extend({
			el: '#imageForm',
			bind: { text: [
				'[name="text"]textarea', '[name="image"]input', '.imagePicker'
			] },
			populate: {
				text: function(data) {
					var quotedTxt = (data.text) ? '\n\n>'
							+ data.text.replace('\n', '\n> ') : '',
						text = '[[' + data.title.replace('|', '>') + '|'
							+ data.url + ']]' + quotedTxt,
						images = this.setImages(data.images);
					return [ text, data.images[0], images ];
				}
			},
			toTiddler: {
				text: function(txt, image) {
						return ['[img[' + image + ']]', txt].join('\n');
				}
			},
			setImages: function(images) {
				var selector = $('<div/>'),
					setCurrent = function($el) {
						$el.siblings()
								.removeClass('current').end()
							.addClass('current')
							.closest('label')
								.children('[name="image"]input')
								.val($el.attr('src')).end();
					};
				$.each(images, function(i, img) {
					$('<img/>').attr('src', img)
						.css({
							'max-height': '90px',
							'max-width': '100px',
							display: 'inline-block'
						}).click(function() {
							setCurrent($(this));
						}).appendTo(selector);
				});

				setCurrent($('img:first', selector));

				return selector;
			}
		})
	};

	function pickDefaultTab(data) {
		if (!data.text) {
			return 'link';
		} else {
			return 'quote';
		}
	}

	function receiveMessage(event) {
		var data = JSON.parse(event.data);

		if (!id) {
			id = data.id;
		} else if (data.id !== id) {
			return;
		}

		details.set('data', data);
		details.set('eventSrc', {
			origin: event.origin,
			source: event.source
		});
	}

	window.addEventListener('message', receiveMessage, false);

	function saveTiddler(callback) {
		details.when('tiddler', function(tiddler) {
			tiddler.put(function() {
				callback(true);
			}, function(xhr, error, exc) {
				callback(false, error, exc);
			});
		});
	}

	function closePage(timeout) {
		window.setTimeout(function() {
			details.when('eventSrc', function(src) {
				src.source.postMessage(JSON.stringify({
					type: 'close',
					id: id
				}), src.origin);
			});
		}, timeout || 0);
	}

	function getCurrentTab() {
		return $('.nav-tabs .active').data('tab-name');
	}

	function saveBookmark(event) {
		var $successBtn = $('[type="submit"]input');

		tabs[getCurrentTab()].setTiddler();

		$successBtn.val('Saving...')
			.addClass('disabled')
			.attr('disabled', 'disabled');

		$('.closeBtn').addClass('disabled')
			.attr('disabled', 'disabled');

		saveTiddler(function(success) {
			if (success) {
				$successBtn
					.val('Saved!')
					.removeClass('primary')
					.addClass('success');
				closePage(1000);
			} else {
				$successBtn
					.removeClass('disabled')
					.removeAttr('disabled')
					.removeClass('primary')
					.addClass('danger')
					.val('Error saving. Please try again');
			}
		});

		event.preventDefault();
		return false;
	}

	function Mover($el) {
		var moving = false,
			initPos = {},
			oldPos = {};

		var src,
			height;

		var doMove = function(ev) {
			var diff = { x: ev.pageX - oldPos.x, y: ev.pageY - oldPos.y };
			$el.animate({
				top: '+=' + diff.y,
				left: '+=' + diff.x
			}, 0);
			oldPos.x = ev.pageX;
			oldPos.y = ev.pageY;
		};

		var _receive = function _receive(message) {
			var payload = JSON.parse(message.data);
			if (payload.id !== id) {
				return;
			}
			switch(payload.type) {
				case 'initMove':
					$el.css({
						top: payload.diff.y + 'px',
						left: payload.diff.x + 'px'
					}).show();
					initPos.x = oldPos.x = payload.diff.x + oldPos.x;
					initPos.y = oldPos.y = payload.diff.y + oldPos.y;
					break;
				case 'doneMove':
					$el.show();
					window.removeEventListener('message', _receive, false);
			}
		};

		var self;
		self = {
			start: function(ev) {
				if (moving) {
					return self.stop(ev);
				} else {
					moving = true;
				}
				oldPos.x = ev.pageX;
				oldPos.y = ev.pageY;
				$el.hide();
				window.addEventListener('message', _receive, false);
				details.when('eventSrc', function(eventSrc) {
					src = eventSrc;
					src.source.postMessage(JSON.stringify({
						type: 'startMove',
						id: id
					}), src.origin);
				});
				// fix the height so that increasing the iframe height doesn't mess things up
				height = $el.css('height');
				$el.css('height', $el.height());
				// stop the user selecting text awkwardly while trying to move
				$el.css({
					'-webkit-user-select': 'none',
					'-moz-user-select': 'none',
					'-ms-user-select': 'none',
					'-o-user-select': 'none',
					'user-select': 'none'
				});
				$(document).bind('mousemove', doMove);
			},
			stop: function() {
				if (!moving) {
					return;
				}
				window.addEventListener('message', _receive, false);
				moving = false;
				$el.hide();
				$el.css({
					top: 0,
					left: 0
				});
				$el.css('height', height);
				src.source.postMessage(JSON.stringify({
					type: 'stopMove',
					id: id,
					diff: { x: oldPos.x - initPos.x, y: oldPos.y - initPos.y }
				}), src.origin);
				$el.css({
					'-webkit-user-select': 'auto',
					'-moz-user-select': 'auto',
					'-ms-user-select': 'auto',
					'-o-user-select': 'auto',
					'user-select': 'auto'
				});
				$(document).unbind('mousemove', doMove);
			}
		};
		return self;
	}

$(function() {

	$('.form-actions [type="submit"]input').click(saveBookmark);
	$('.closeBtn').click(closePage);

	var mover = new Mover($('.modal'));
	$('.modal-header').mousedown(function(ev) {
		if (ev.target.nodeName !== 'LI' &&
				$(ev.target).closest('.nav-tabs li, #help, #help-info').length === 0) {
			mover.start(ev);
		}
	});
	$(document).mouseup(mover.stop);

	details.when('data', function(data) {
		// some initialisation: if there are no images, remove the images tab
		if (data.images.length === 0) {
			$('#imageForm').remove();
			$('.nav-tabs li').each(function(i, el) {
				if ($(el).data('tab-name') === 'image') {
					$(el).remove();
				}
			});
		}

		// figure out which tab we should start off on
		var tab = pickDefaultTab(data);

		// populate the tab with data and switch to it
		$('.nav-tabs').delegate('li', 'click', function() {
			var tabName = $(this).data('tab-name');
			$('.nav-tabs li').removeClass('active');
			$(this).addClass('active');
			$('.modal-body').removeClass('active').each(function(i, el) {
				if (el.id === tabName + 'Form') {
					$(el).addClass('active');
				}
			});
			if (tabs[tabName].isEmpty()) {
				tabs[tabName].setTab(data);
			}
		});

		// initialise the app by switching to the correct tab.
		$('.nav-tabs li').each(function(i, el) {
			var $el = $(el);
			if ($el.data('tab-name') === tab) {
				$el.find('a').click();
				return false;
			}
		});

		// now display the container again
		$('#container').show();
	});

});
}());