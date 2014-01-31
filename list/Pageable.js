define(["dcl/dcl",
		"delite/register",
		"dojo/_base/lang",
		"dojo/string",
		"dojo/when",
		"dojo/Deferred",
		"dojo/dom",
		"dojo/dom-class",
		"dojo/sniff",
		"delite/Widget",
		"dojo/i18n!./List/nls/Pageable" // TODO: use requirejs-dplugins
], function (dcl, register, lang, string, when, Deferred, dom, domClass, has, Widget, messages) {

	var LoaderWidget = register("d-list-loader", [HTMLElement, dcl([Widget], {
		// summary:
		//		A clickable widget that we use to initiate the loading of a page.
		//

		// clickToLoadMessage: String
		//		The message to display on the widget when it can be clicked to load a page
		clickToLoadMessage: "",

		// loadingMessage: String
		//		The message to display on the widget a page is loading
		loadingMessage: "",

		// _loading: Boolean
		//		true if a page is loading, false otherwise
		_loading: false,

		// baseClass: String
		//		the CSS class of the widget
		baseClass: "d-list-loader",

		//////////// Widget life cycle ///////////////////////////////////////

		buildRendering: function () {
			// summary:
			//		set the click event handler
			this.style.display = "block";
			this.on("click", lang.hitch(this, this._clickHandler));
		},

		enteredViewCallback: dcl.superCall(function (sup) {
			// summary:
			//		init the widget rendering
			return function () {
				if (sup) {
					sup.apply(this, arguments);
				}
				this.innerHTML = this.clickToLoadMessage;
				this.tabIndex = -1;
			};
		}),

		//////////// Public methods ///////////////////////////////////////

		isLoading: function () {
			// summary:
			//		returns true if a page is currently loading, false otherwise
			return this._loading; // Boolean
		},

		performLoading: function () {
			// summary:
			//		Performs the actual loading of a page.
			// description:
			// 		Callback to be implemented by user of the widget
			// 		It MUST return a promise that is fulfilled when the load operation is finished.
			// tags:
			//		callback
			var def = new Deferred();
			this.defer(function () {
				def.resolve("done");
			}, 500);
			return def;
		},

		beforeLoading: function () {
			// summary:
			//		Runs before performing the loading.
			domClass.add(this, "d-loading");
			this.innerHTML = this.loadingMessage;
		},

		afterLoading: function () {
			// summary:
			//		Runs after the loading has been performed.
			if (!this._destroyed) {
				domClass.remove(this, "d-loading");
				this.innerHTML = this.clickToLoadMessage;
			}
		},

		_clickHandler: function () {
			// summary:
			//		Handle click events on the widget.
			if (this.isLoading()) { return; }
			this._loading = true;
			this.beforeLoading();
			this.defer(lang.hitch(this, function () {
				when(this.performLoading(), lang.hitch(this, function () {
					this.afterLoading();
					this._loading = false;
				}), lang.hitch(this, function (error) {
					this.afterLoading();
					this._loading = false;
					// FIXME: SHOULD EMIT AN ERROR EVENT !
					throw error;
				}));
			}));
		}
	})]);

	return dcl(null, {
		// summary:
		//		A Mixin for delite/List that provides paging.
		//
		// description:
		//		TO BE DONE

		// pageLength: int
		//		if > 0, enable paging while defining the number of items to display per page.
		pageLength: 0,

		// maxPages: int
		//		the maximum number of pages to display at the same time.
		maxPages: 0,

		// clickToLoadPreviousMessage: String
		//		The message displayed on the previous page loader when it can be clicked
		//		to load the previous page. This message can contains placeholder for the
		//		List attributes to be replaced by their runtime value. For example, the
		//		message can include the value of the pageLength attribute by using the
		//		placeholder ${pageLength}.
		clickToLoadPreviousMessage: "",

		// clickToLoadNextsMessage: String
		//		The message displayed on the next page loader when it can be clicked
		//		to load the next page. This message can contains placeholder for the
		//		List attributes to be replaced by their runtime value. For example, the
		//		message can include the value of the pageLength attribute by using the
		//		placeholder ${pageLength}.
		clickToLoadNextMessage: "",

		// loadingPreviousMessage: String
		//		The message displayed on the previous page loader when a page is currently
		//		loading. This message can contains placeholder for the
		//		List attributes to be replaced by their runtime value. For example, the
		//		message can include the value of the pageLength attribute by using the
		//		placeholder ${pageLength}.
		loadingPreviousMessage: messages["default-loading-message"],

		// loadingNextMessage: String
		//		The message displayed on the next page loader when a page is currently
		//		loading.  This message can contains placeholder for the
		//		List attributes to be replaced by their runtime value. For example, the
		//		message can include the value of the pageLength attribute by using the
		//		placeholder ${pageLength}.
		loadingNextMessage: messages["default-loading-message"],

		// autoLoad: Boolean
		//		If true, automatically loads the next or previous page when
		//		the scrolling reaches the bottom or the top of the list content.
		autoLoad: false,

		// maskOnUpdate: Boolean
		//		If true, the content of the list is masked while its content is updated with
		//		a new page of data. Ignored if autoLoad is true.
		maskOnUpdate: false,

		/*=====
		// _queryOptions: Object
		//		the options to query the store to load a page.
		_queryOptions: null,
		
		// _nextPageLoader: Widget
		//		the next page loader.
		_nextPageLoader: null,
		
		// _previousPageLoader: Widget
		//		the previous page loader.
		_previousPageLoader: null,

		// _noExtremity: Boolean
		//		true if the list is currently not scrolled at the top or the bottom,
		//		false otherwise.
		_noExtremity: true,
		
		// _pages: Array
		//		the pages currently loaded.
		_pages: null,

		// _pageObserverHandles: Object
		//		handle on the page observer.
		_pageObserverHandles: null,
		=====*/

		// _firstLoaded: int
		//		index of the first item currently loaded.
		_firstLoaded: -1,
		
		// _lastLoaded: int
		//		index of the last item currently loaded.
		_lastLoaded: -1,

		//////////// Widget life cycle ///////////////////////////////////////

		enteredViewCallback: dcl.superCall(function (sup) {
			// summary:
			//		set default click to load messages if necessary, listen to scroll events.
			return function () {
				if (sup) {
					sup.apply(this, arguments);
				}
				if (!this.clickToLoadPreviousMessage) {
					this.clickToLoadPreviousMessage = this.autoLoad ? messages["default-loading-message"]
							: messages["default-click-to-load-message"];
				}
				if (!this.clickToLoadNextMessage) {
					this.clickToLoadNextMessage = this.autoLoad ? messages["default-loading-message"]
							: messages["default-click-to-load-message"];
				}
				this.on("scroll", this._scrollHandler);
			};
		}),

		destroy: dcl.superCall(function (sup) {
			// summary:
			//		destroy the page loaders.
			return function () {
				if (sup) {
					sup.apply(this, arguments);
				}
				if (this._previousPageLoader) {
					this._previousPageLoader.destroy();
					this._previousPageLoader = null;
				}
				if (this._nextPageLoader) {
					this._nextPageLoader.destroy();
					this._nextPageLoader = null;
				}
			};
		}),

		//////////// delite/Store methods ///////////////////////////////////////

		// FIXME: THIS IS ONE SOLUTION THAT IMPLIES UPDATING delite/Store TO USE A _queryStore METHOD.
		// INVESTIGATE OTHER SOLUTIONS TO CHOOSE THE BEST ONE.
		_queryStore: function () {
			// summary:
			//		query the store.
			if (this._dataLoaded) {
				return;
			}
			this._pages = [];
			this._pageObserverHandles = [];
			when(this._loadNextPage(lang.hitch(this, "_nextPageReadyHandler")), lang.hitch(this, function () {
				this._setBusy(false);
				this._dataLoaded = true;
			}), function (error) {
				this._setBusy(false);
				this._queryError(error);
			});
		},

		//////////// Private methods ///////////////////////////////////////

		_pageObserver: function (object, removedFrom, insertedInto) {
			// summary:
			//		Observe data updates in the store for the loaded pages.
			// object: Object
			//		the object updated in the store.
			// removedFrom: int
			//		the position (in a page) the object was removed from (-1 if none)
			// insertedInto: int
			//		the position (in a page) the object was inserted into in the store (-1 if none)
			if (removedFrom >= 0 && insertedInto < 0) { // item removed
				this.removeItem(null, object, null, false);
				this._lastLoaded--;
			}
			if (removedFrom < 0 && insertedInto >= 0) { // item added
				this._lastLoaded++;
				this.addItem(this._getIndexOfItem(object), object);
			}
			// TODO: ITEM UPDATED
			// TODO: ITEM MOVED ?
		},

		_getIndexOfItem: function (item) {
			// summary:
			//		Retrieve the index of an item in the loaded pages
			// item: Object
			//		The item
			var itemIndex = -1, pageIndex, page, indexInPage;
			for (pageIndex = 0; pageIndex < this._pages.length; pageIndex++, itemIndex++) {
				page = this._pages[pageIndex];
				indexInPage = page.indexOf(item);
				if (indexInPage < 0) {
					itemIndex += page.length;
				} else {
					itemIndex += indexInPage;
				}
			}
			return itemIndex;
		},

		_loadNextPage: function (/*Function*/onDataReadyHandler) {
			// summary:
			//		load the next page of items if available.
			// onDataReadyHandler: Function
			//		the function to run when the page has been loaded
			var def = new Deferred();
			if (!this._queryOptions) {
				this._queryOptions = this.queryOptions ? lang.clone(this.queryOptions) : {};
				if (this.pageLength > 0) {
					this._queryOptions.start =
						(this.queryOptions && this.queryOptions.start ? this.queryOptions.start : 0);
					this._queryOptions.count = this.pageLength;
					this._firstLoaded = this._queryOptions.start;
				}
			}
			if (this._nextPageLoader) {
				this._queryOptions.start = this._lastLoaded + 1;
				this._queryOptions.count = this.pageLength;
			}
			var results = this.store.query(this.query, this._queryOptions);
			if (results.observe) {
				this._pageObserverHandles.push(results.observe(lang.hitch(this, "_pageObserver"), true));
			}
			results = results.map(lang.hitch(this, function (item) {
				return this.itemToRenderItem(item);
			}));
			when(results, lang.hitch(this, function (page) {
				this._lastLoaded = this._queryOptions.start + page.length - 1;
				this._pages.push(page);
				when(lang.hitch(this, onDataReadyHandler)(page), function () {
					def.resolve();
				},
				function (error) {
					def.reject(error);
				});
			}), function (error) {
				def.reject(error);
			});
			return def; // Deferred
		},

		_loadPreviousPage: function (/*Function*/onDataReadyHandler) {
			// summary:
			//		load the previous page of items if available.
			// onDataReadyHandler: Function
			//		the function to run when the page has been loaded
			var def = new Deferred();
			this._queryOptions.count = this.pageLength;
			this._queryOptions.start = this._firstLoaded - this.pageLength;
			if (this._queryOptions.start < 0) {
				this._queryOptions.count += this._queryOptions.start;
				this._queryOptions.start = 0;
			}
			var results = this.store.query(this.query, this._queryOptions);
			if (results.observe) {
				this._pageObserverHandles.unshift(results.observe(lang.hitch(this, "_pageObserver"), true));
			}
			results = results.map(lang.hitch(this, function (item) {
				return this.itemToRenderItem(item);
			}));
			when(results, lang.hitch(this, function (page) {
				if (page.length) {
					// Note: if store was supporting negative values in query option "count",
					// we wouldn't have to do the following
					var that = this, i;
					var previousPageIds = this._pages[0].map(function (item) {
						return that.getIdentity(item);
					});
					for (i = 0; i < page.length; i++) {
						if (previousPageIds.indexOf(this.getIdentity(page[i])) >= 0) {
							// remove the duplicate (happens if an element was deleted before the first one)
							page.splice(i--, 1);
						}
					}
					// End of note
					this._firstLoaded = this._queryOptions.start;
					this._pages.unshift(page);
					when(lang.hitch(this, onDataReadyHandler)(page), function () {
						def.resolve();
					}, function (error) {
						def.reject(error);
					});
				} else {
					def.resolve();
				}
			}), function (error) {
				def.reject(error);
			});
			return def;
		},

		_unloadPage: function (/*Boolean*/first) {
			// summary:
			//		unload a page.
			// first: Boolean
			//		true to unload the first page, false to unload the last one.
			var page, i;
			if (first) {
				page = this._pages.shift();
				this._pageObserverHandles.shift().remove();
				this._firstLoaded += page.length;
				for (i = 0; i < page.length; i++) {
					this.removeItem(null, page[i], null, true);
				}
				if (page.length && !this._previousPageLoader) {
					this._createPreviousPageLoader();
				}
				// if the next page is also empty, unload it too
				if (this._pages.length && !this._pages[0].length) {
					this._unloadPage(first);
				}
			} else {
				page = this._pages.pop();
				this._pageObserverHandles.pop().remove();
				this._lastLoaded -= page.length;
				for (i = 0; i < page.length; i++) {
					this.removeItem(null, page[i], null, true);
				}
				if (page.length && !this._nextPageLoader) {
					this._createNextPageLoader();
				}
				// if the previous page is also empty, unload it too
				if (this._pages.length && !this._pages[this._pages.length - 1].length) {
					this._unloadPage(first);
				}
			}
		},

		_previousPageReadyHandler: function (/*array*/ items) {
			// summary:
			//		function to call when the previous page has been loaded.
			// items: Array
			//		the items in the previous page.
			var def = new Deferred();
			var firstRendererBeforeUpdate = this._getFirst(), focused;
			try {
				if (firstRendererBeforeUpdate && this._previousPageLoader && this._previousPageLoader.isLoading()) {
					this.focusChild(firstRendererBeforeUpdate);
				}
				this._renderNewItems(items, true);
				if (this.maxPages && this._pages.length > this.maxPages) {
					this._unloadPage(false);
				}
				if (this._firstLoaded ===
					(this.queryOptions && this.queryOptions.start ? this.queryOptions.start : 0)) {
					// no more previous page
					this._previousPageLoader.destroy();
					this._previousPageLoader = null;
				} else {
					this._previousPageLoader.placeAt(this.containerNode, "first");
				}
				if (this._getFocusedRenderer()) {
					focused = this._focusNextChild(-1);
					if (focused) {
						// scroll the focused node to the top of the screen.
						// To avoid flickering, we do not wait for a focus event
						// to confirm that the child has indeed been focused.
						this.scrollBy({y: this.getTopDistance(focused)});
					}
				} else {
					this.focusChild(this._getLastRenderer());
				}
				def.resolve();
			} catch (error) {
				def.reject(error);
			}
			return def; // Deferred
		},

		_nextPageReadyHandler: function (/*array*/ items) {
			// summary:
			//		function to call when the next page has been loaded.
			// items: Array
			//		the items in the next page.
			var def = new Deferred();
			var lastChild = this._getLast(), firstRenderer, focused;
			try {
				if (lastChild) {
					this.focusChild(lastChild);
				}
				this._renderNewItems(items, false);
				if (this.maxPages && this._pages.length > this.maxPages) {
					this._unloadPage(true);
				}
				if (this._nextPageLoader) {
					if (items.length !== this._queryOptions.count) {
						// no more next page
						this._nextPageLoader.destroy();
						this._nextPageLoader = null;
					} else {
						this._nextPageLoader.placeAt(this.containerNode);
					}
				} else {
					if (items.length === this._queryOptions.count) {
						this._createNextPageLoader();
					}
				}
				if (this._getFocusedRenderer()) {
					focused = this._focusNextChild(1);
					if (focused) {
						// scroll the focused node to the bottom of the screen.
						// To avoid flickering, we do not wait for a focus event
						// to confirm that the child has indeed been focused.
						this.scrollBy({y: this.getBottomDistance(focused)});
					}
				} else {
					firstRenderer = this._getFirstRenderer();
					if (firstRenderer) {
						this.focusChild(firstRenderer);
					}
				}
				def.resolve();
			} catch (error) {
				def.reject(error);
			}
			return def; // Deferred
		},

		//////////// Event handlers ///////////////////////////////////////

		_scrollHandler: function () {
			// summary:
			//		handler for scroll events.
			if (this.autoLoad) {
				if (this.isTopScroll()) {
					if (this._noExtremity && this._previousPageLoader) {
						this._previousPageLoader._clickHandler();
					}
					this._noExtremity = false;
				} else if (this.isBottomScroll()) {
					if (this._noExtremity && this._nextPageLoader) {
						this._nextPageLoader._clickHandler();
					}
					this._noExtremity = false;
				} else {
					this._noExtremity = true;
				}
			}
		},

		//////////// Page loaders & loading panel ///////////////////////////////////////

		_createNextPageLoader: function () {
			// summary:
			//		create the next page loader widget
			this._nextPageLoader = new LoaderWidget({
				clickToLoadMessage: string.substitute(this.clickToLoadNextMessage, this),
				loadingMessage: string.substitute(this.loadingNextMessage, this)
			});
			if (this.maskOnUpdate && this.maxPages > 0) {
				this._nextPageLoader.beforeLoading =
					lang.partial(this, this._displayLoadingPanel, this.loadingNextMessage);
				this._nextPageLoader.afterLoading = lang.hitch(this, this._hideLoadingPanel);
			}
			this._nextPageLoader.performLoading = lang.hitch(this, function () {
				return this._loadNextPage(this._nextPageReadyHandler);
			});
			this._nextPageLoader.startup();
			if (!this.autoLoad || !has("touch")) {
				this._nextPageLoader.placeAt(this.containerNode);
			}
		},

		_createPreviousPageLoader: function () {
			// summary:
			//		create the previous page loader widget
			this._previousPageLoader = new LoaderWidget({
				clickToLoadMessage: string.substitute(this.clickToLoadPreviousMessage, this),
				loadingMessage: string.substitute(this.loadingPreviousMessage, this)
			});
			if (this.maskOnUpdate && this.maxPages > 0) {
				this._previousPageLoader.beforeLoading =
					lang.partial(this, this._displayLoadingPanel, this.loadingPreviousMessage);
				this._previousPageLoader.afterLoading = lang.hitch(this, this._hideLoadingPanel);
			}
			this._previousPageLoader.performLoading = lang.hitch(this, function () {
				return this._loadPreviousPage(this._previousPageReadyHandler);
			});
			this._previousPageLoader.startup();
			if (!this.autoLoad || !has("touch")) {
				this._previousPageLoader.placeAt(this.containerNode, "first");
			}
		},

		_displayLoadingPanel: function (text) {
			// summary:
			//		display the loading panel
			if (!this.autoLoad || !has("touch")) {
				var clientRect = this.getBoundingClientRect();
				var message = string.substitute(text, this);
				this._loadingPanel = register.createElement("div");
				this._loadingPanel.innerHTML = message;
				this._loadingPanel.className = "d-list-loading-panel";
				this._loadingPanel.style.cssText = "position: absolute; line-height: "
												+ (clientRect.bottom - clientRect.top)
												+ "px; width: "
												+ (clientRect.right - clientRect.left)
												+ "px; top: "
												+ (clientRect.top + window.scrollY)
												+ "px; left: "
												+ (clientRect.left + window.scrollX)
												+ "px;";
				document.body.appendChild(this._loadingPanel);
			}
		},

		_hideLoadingPanel: function () {
			// summary:
			//		hide the loading panel
			if (!this.autoLoad || !has("touch")) {
				document.body.removeChild(this._loadingPanel);
			}
		},

		//////////// List methods overriding ///////////////////////////////////////

		_getNextRenderer: dcl.superCall(function (sup) {
			// summary:
			//		make sure that no page loader is returned
			return function (renderer, /*jshint unused:vars*/dir) {
				var value = sup.apply(this, arguments);
				if ((this._nextPageLoader && value === this._nextPageLoader)
					|| (this._previousPageLoader && value === this._previousPageLoader)) {
					value = null;
				}
				return value;
			};
		}),

		_actionKeydownHandler: dcl.superCall(function (sup) {
			// summary:
			//		handle action keys on page loaders
			return function (event) {
				if (this._nextPageLoader && dom.isDescendant(event.target, this._nextPageLoader)) {
					event.preventDefault();
					this._nextPageLoader._clickHandler();
				} else if (this._previousPageLoader && dom.isDescendant(event.target, this._previousPageLoader)) {
					event.preventDefault();
					this._previousPageLoader._clickHandler();
				} else {
					sup.apply(this, arguments);
				}
			};
		})

	});
});