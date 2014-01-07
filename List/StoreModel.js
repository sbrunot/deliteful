define(["dcl/dcl",
		"delite/register",
		"dojo/_base/lang",
		"dojo/string",
		"dojo/when",
		"dojo/Deferred",
		"dojo/dom",
		"dojo/dom-construct",
		"dojo/dom-class",
		"dojo/sniff",
		"dojo/store/Observable",
		"delite/Widget"
], function (dcl, register, lang, string, when, Deferred, dom, domConstruct, domClass, has, Observable, Widget) {

	// TODO: SHOULD THIS WIDGET BE DEFINED IN ITS OWN SOURCE FILE (IN THIS CASE, A MORE GENERIC "ActionCell" WIDGET) ?
	var LoaderWidget = register("d-list-loader", [HTMLElement, dcl([Widget], {

		clickToLoadMessage: "Click to load more entries",

		loadingMessage: "Loading more entries...",

		_loading: false,

		buildRendering: function () {
			this.style.display = "block";
			this.on("click", lang.hitch(this, this._onClick));
		},

		enteredViewCallback: dcl.after(function () {
			domClass.add(this, "d-list-loader-node");
			this.innerHTML = this.clickToLoadMessage;
			this.tabIndex = -1;
		}),

		isLoading: function () {
			return this._loading;
		},

		performLoading: function () {
			// Callback to be implemented by user of the widget
			// It MUST return a promise that is fulfilled when the load operation is finished.
			var def = new Deferred();
			this.defer(function () {
				def.resolve("done");
			}, 500);
			return def;
		},

		beforeLoading: function () {
			domClass.replace(this,
					"d-list-loader-node-loading",
					"d-list-loader-node");
			this.innerHTML = this.loadingMessage;
		},

		afterLoading: function () {
			if (!this._destroyed) {
				domClass.replace(this,
						"d-list-loader-node",
						"d-list-loader-node-loading");
				this.innerHTML = this.clickToLoadMessage;
			}
		},

		_onClick: function () {
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
					 // WHAT TO DO WITH THE ERROR ?
					console.log((error.message ? error.message : error) + ". See stack below.");
					console.error(error);
				}));
			}));
		}
	})]);

	return dcl(null, {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		store: null,

		query: null,

		queryOptions: null,

		pageLength: 0, // if > 0 define paging with the number of entries to display per page.
		
		maxPages: 0, // the maximum number of pages to display

		beforeLoadingMessage: "",

		loadingMessage: "Loading ${pageLength} more entries...",
		
		// autoLoad: Boolean
		//		If true, automatically loads the next or previous page when
		//		the scrolling reaches the bottom or the top of the list content.
		autoLoad: false,

		useMaskingPanel: true, // not needed on desktop / high performance devices

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_queryOptions: null,
		_nextPageLoader: null,
		_previousPageLoader: null,
		_firstLoaded: -1,
		_lastLoaded: -1,
		_noExtremity: true, // TODO: find a clearer while still short name...
		_pages: null,
		_pageObserverHandles: null,

		/////////////////////////////////
		// Widget lifecycle
		/////////////////////////////////

		enteredViewCallback: dcl.after(function () {
			if (!this.beforeLoadingMessage) {
				this.beforeLoadingMessage = this.autoLoad ? "Loading ${pageLength} more entries..."
						: "Click to load ${pageLength} more entries";
			}
			this.on("scroll", this._scrollHandler);
		}),

		destroy: dcl.after(function () {
			if (this._previousPageLoader) {
				this._previousPageLoader.destroy();
				this._previousPageLoader = null;
			}
			if (this._nextPageLoader) {
				this._nextPageLoader.destroy();
				this._nextPageLoader = null;
			}
		}),

		/////////////////////////////////
		// Public methods from List
		/////////////////////////////////

		getIdentity: function (entry) {
			return this.store.getIdentity(entry);
		},

		/////////////////////////////////
		// Private methods
		/////////////////////////////////

		_initContent: function () {
			if (this._dataLoaded) {
				return;
			}
			this._store = this.store;
			this._pages = [];
			this._pageObserverHandles = [];
			this._toggleListLoadingStyle();
			when(this._loadNextPage(lang.hitch(this, "_onNextPageReady")), lang.hitch(this, function () {
				this._toggleListLoadingStyle();
				this._dataLoaded = true;
			}), function (error) {
				 // WHAT TO DO WITH THE ERROR ?
				console.log((error.message ? error.message : error) + ". See stack below.");
				console.error(error);
			});
		},

		_observePage: function (object, removedFrom, insertedInto) {
//			console.log("Observation:");
//			console.log(object);
//			console.log("removed from " + removedFrom);
//			console.log("insertedInto " + insertedInto);
//			console.log(this._pages);
			if (removedFrom >= 0 && insertedInto < 0) { // entry removed
				this._entryDeletedHandler(object, false);
				this._lastLoaded--;
			}
			if (removedFrom < 0 && insertedInto >= 0) { // entry added
				this._lastLoaded++;
				this._entryAddedHandler(object, this._getIndexOfEntry(object));
			}
		},

		_getIndexOfEntry: function (entry) {
			var entryIndex = -1, pageIndex, page, indexInPage;
			for (pageIndex = 0; pageIndex < this._pages.length; pageIndex++, entryIndex++) {
				page = this._pages[pageIndex];
				indexInPage = page.indexOf(entry);
				if (indexInPage < 0) {
					entryIndex += page.length;
				} else {
					entryIndex += indexInPage;
				}
			}
			return entryIndex;
		},

		_loadNextPage: function (/*Function*/onDataReadyHandler) {
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
			when(this.store.query(this.query, this._queryOptions), lang.hitch(this, function (page) {
				this._lastLoaded = this._queryOptions.start + page.length - 1;
				this._pages.push(page);
				if (page.observe) {
					this._pageObserverHandles.push(page.observe(lang.hitch(this, "_observePage"), true));
				}
				when(lang.hitch(this, onDataReadyHandler)(page), function () {
					def.resolve();
				},
				function (error) {
					def.reject(error);
				});
			}), function (error) {
				def.reject(error);
			});
			return def;
		},

		_loadPreviousPage: function (/*Function*/onDataReadyHandler) {
			var def = new Deferred();
			this._queryOptions.count = this.pageLength;
			this._queryOptions.start = this._firstLoaded - this.pageLength;
			if (this._queryOptions.start < 0) {
				this._queryOptions.count += this._queryOptions.start;
				this._queryOptions.start = 0;
			}
			when(this.store.query(this.query, this._queryOptions), lang.hitch(this, function (page) {
				if (page.length) {
					this._firstLoaded = this._queryOptions.start;
					this._pages.unshift(page);
					if (page.observe) {
						this._pageObserverHandles.unshift(page.observe(lang.hitch(this, "_observePage"), true));
					}
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

		_unloadPage: function (pos) {
			var page, i;
			if (pos === "first") {
				page = this._pages.shift();
				this._pageObserverHandles.shift().remove();
				this._firstLoaded += page.length;
				for (i = 0; i < page.length; i++) {
					this._entryDeletedHandler(page[i], true);
				}
				if (page.length && !this._previousPageLoader) {
					this._createPreviousPageLoader();
				}
				// if the next page is also empty, unload it too
				if (this._pages.length && !this._pages[0].length) {
					this._unloadPage(pos);
				}
			} else if (pos === "last") {
				page = this._pages.pop();
				this._pageObserverHandles.pop().remove();
				this._lastLoaded -= page.length;
				for (i = 0; i < page.length; i++) {
					this._entryDeletedHandler(page[i], true);
				}
				if (page.length && !this._nextPageLoader) {
					this._createNextPageLoader();
				}
				// if the previous page is also empty, unload it too
				if (this._pages.length && !this._pages[this._pages.length - 1].length) {
					this._unloadPage(pos);
				}
			} else {
				console.log("StoreModel._unloadPage: only 'first' and 'last' positions are supported");
				return;
			}
		},

		_onPreviousPageReady: function (/*array*/ entries) {
			var def = new Deferred();
			var firstCellBeforeUpdate = this._getFirst(), focused;
			try {
				if (firstCellBeforeUpdate && this._previousPageLoader && this._previousPageLoader.isLoading()) {
					this.focusChild(firstCellBeforeUpdate);
				}
				this._addEntryCells(entries, "first");
				if (this.maxPages && this._pages.length > this.maxPages) {
					this._unloadPage("last");
				}
				if (this._firstLoaded ===
					(this.queryOptions && this.queryOptions.start ? this.queryOptions.start : 0)) {
					// no more previous page
					this._previousPageLoader.destroy();
					this._previousPageLoader = null;
				} else {
					this._previousPageLoader.placeAt(this.containerNode, "first");
				}
				if (this._getFocusedCell()) {
					focused = this._focusNextChild(-1);
					if (focused) {
						// scroll the focused node to the top of the screen.
						// To avoid flickering, we do not wait for a focus event
						// to confirm that the child has indeed been focused.
						this.scrollBy(this.getTopDistance(focused));
					}
				} else {
					this.focusChild(this._getLastCell());
				}
				def.resolve();
			} catch (error) {
				def.reject(error);
			}
			return def;
		},

		_onNextPageReady: function (/*array*/ entries) {
			var def = new Deferred();
			var lastChild = this._getLast(), firstCell, focused;
			try {
				if (lastChild) {
					this.focusChild(lastChild);
				}
				this._addEntryCells(entries, "last");
				if (this.maxPages && this._pages.length > this.maxPages) {
					this._unloadPage("first");
				}
				if (this._nextPageLoader) {
					if (entries.length !== this._queryOptions.count) {
						// no more next page
						this._nextPageLoader.destroy();
						this._nextPageLoader = null;
					} else {
						this._nextPageLoader.placeAt(this.containerNode);
					}
				} else {
					if (entries.length === this._queryOptions.count) {
						this._createNextPageLoader();
					}
				}
				if (this._getFocusedCell()) {
					focused = this._focusNextChild(1);
					if (focused) {
						// scroll the focused node to the bottom of the screen.
						// To avoid flickering, we do not wait for a focus event
						// to confirm that the child has indeed been focused.
						this.scrollBy(this.getBottomDistance(focused));
					}
				} else {
					firstCell = this._getFirstCell();
					if (firstCell) {
						this.focusChild(firstCell);
					}
				}
				def.resolve();
			} catch (error) {
				def.reject(error);
			}
			return def;
		},

		/////////////////////////////////
		// Event handlers
		/////////////////////////////////

		_scrollHandler: function () {
			if (this.autoLoad) {
				if (this.isTopScroll()) {
					if (this._noExtremity && this._previousPageLoader) {
						this._previousPageLoader._onClick();
					}
					this._noExtremity = false;
				} else if (this.isBottomScroll()) {
					if (this._noExtremity && this._nextPageLoader) {
						this._nextPageLoader._onClick();
					}
					this._noExtremity = false;
				} else {
					this._noExtremity = true;
				}
			}
		},

		/////////////////////////////////
		// Page loaders & loading panel
		/////////////////////////////////

		_createNextPageLoader: function () {
			this._nextPageLoader = new LoaderWidget({
				clickToLoadMessage: string.substitute(this.beforeLoadingMessage, this),
				loadingMessage: string.substitute(this.loadingMessage, this)});
			if (this.useMaskingPanel && this.maxPages > 0) {
				this._nextPageLoader.beforeLoading = lang.hitch(this, this._displayLoadingPanel);
				this._nextPageLoader.afterLoading = lang.hitch(this, this._hideLoadingPanel);
			}
			this._nextPageLoader.performLoading = lang.hitch(this, function () {
				return this._loadNextPage(this._onNextPageReady);
			});
			this._nextPageLoader.startup();
			if (!this.autoLoad || !has("touch")) {
				this._nextPageLoader.placeAt(this.containerNode);
			}
		},

		_createPreviousPageLoader: function () {
			this._previousPageLoader = new LoaderWidget({
				clickToLoadMessage: string.substitute(this.beforeLoadingMessage, this),
				loadingMessage: string.substitute(this.loadingMessage, this)});
			if (this.useMaskingPanel && this.maxPages > 0) {
				this._previousPageLoader.beforeLoading = lang.hitch(this, this._displayLoadingPanel);
				this._previousPageLoader.afterLoading = lang.hitch(this, this._hideLoadingPanel);
			}
			this._previousPageLoader.performLoading = lang.hitch(this, function () {
				return this._loadPreviousPage(this._onPreviousPageReady);
			});
			this._previousPageLoader.startup();
			if (!this.autoLoad || !has("touch")) {
				this._previousPageLoader.placeAt(this.containerNode, "first");
			}
		},

		_displayLoadingPanel: function () {
			if (!this.autoLoad || !has("touch")) {
				var clientRect = this.getBoundingClientRect();
				var message = string.substitute(this.loadingMessage, this);
				this._loadingPanel = domConstruct.create("div",
														 {innerHTML: message,
														  className: "d-list-loading-panel",
														  style: "position: absolute; line-height: "
															+ (clientRect.bottom - clientRect.top)
															+ "px; width: "
															+ (clientRect.right - clientRect.left)
															+ "px; top: "
															+ (clientRect.top + window.scrollY)
															+ "px; left: "
															+ (clientRect.left + window.scrollX)
															+ "px;" },
														 document.body);
			}
		},

		_hideLoadingPanel: function () {
			if (!this.autoLoad || !has("touch")) {
				document.body.removeChild(this._loadingPanel);
			}
		},

		/////////////////////////////////
		// List methods overriding
		/////////////////////////////////

		_getNextCell: dcl.superCall(function (sup) {
			return function (cell) {
				var value = sup.apply(this, arguments);
				if (this._nextPageLoader && value === this._nextPageLoader) {
					value = null;
				}
				return value;
			};
		}),

		_getPreviousCell: dcl.superCall(function (sup) {
			return function (cell) {
				var value = sup.apply(this, arguments);
				if (this._previousPageLoader && value === this._previousPageLoader) {
					value = null;
				}
				return value;
			};
		}),

		_onActionKeydown: dcl.superCall(function (sup) {
			return function (event) {
				if (this._nextPageLoader && dom.isDescendant(event.target, this._nextPageLoader)) {
					event.preventDefault();
					this._nextPageLoader._onClick();
				} else if (this._previousPageLoader && dom.isDescendant(event.target, this._previousPageLoader)) {
					event.preventDefault();
					this._previousPageLoader._onClick();
				} else {
					sup.apply(this, arguments);
				}
			};
		})

	});
});