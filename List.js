define(["dcl/dcl",
	"delite/register",
	"dojo/_base/lang",
	"dojo/query", // TODO: what if the user wants to use jquery ? Should we provide a wrapper for one or the other ?
	"dojo/when",
	"dojo/dom-class",
	"dojo/keys",
	"delite/Widget",
	"delite/Selection",
	"delite/KeyNav",
	"./List/DefaultItemRenderer",
	"./List/DefaultCategoryRenderer",
	"./List/ScrollableList", // TODO: Will be removed, List will directly use delite/Scrollable instead
	"delite/themes/load!./List/themes/{{theme}}/List_css"
], function (dcl, register, lang, query, when, domClass, keys, Widget,
		Selection, KeyNav, DefaultItemRenderer, DefaultCategoryRenderer, ScrollableList) {

	// module:
	//		deliteful/List

	var List = dcl([Widget, Selection, KeyNav], {
		// summary:
		//		A widget that renders a list of items.
		//
		// description:
		//		TO BE DONE.
		//		Store
		//			Default Store
		//			Observable vs. non observable store
		//
		//		Categorized lists
		//
		//		Markup definition
		//
		//		Selection

		// store: dojo/store/Store
		//		Dojo object store that contains the items to render in the list.
		//		If no value is provided for this attribute, the List will initialize
		//		it with an internal store implementation. Note that this internal store
		//		implementation ignore any query options and return all the items from
		//		the store, in the order they were added to the store.
		store: null,

		// query: Object
		//		Query to pass to the store to retrieve the items to render in the list.
		query: null,

		// queryOptions: dojo/store/api/Store.QueryOptions?
		//		Options to be applied when querying the store.
		queryOptions: null,

		// categoryAttribute: String
		//		Name of the list item attribute that define the category of a list item.
		//		If falsy, the list is not categorized.
		categoryAttribute: "",

		// itemsRenderer: deliteful/List/ItemRendererBase subclass
		//		The widget class to use to render list items.
		//		It MUST extend deliteful/List/ItemRendererBase.
		itemsRenderer: DefaultItemRenderer,

		// categoriesRenderer: deliteful/List/CategoryRendererBase subclass
		//		The widget class to use to render category headers when the list items are categorized.
		//		It MUST extend deliteful/List/CategoryRendererBase.
		categoriesRenderer: DefaultCategoryRenderer,

		// baseClass: String
		//	The base class that defines the style of the list.
		//	Available values are:
		//		- "d-list" (default): render a list with no rounded corners and no left and right margins;
		//		- "d-round-rect-list": render a list with rounded corners and left and right margins.
		baseClass: "d-list",
		_setBaseClassAttr: function (value) {
			if (this.baseClass !== value) {
				domClass.replace(this, value, this.baseClass);
				this._set("baseClass", value);
			}
		},

		// selectionMode: String
		//		The selection mode for list items (see delite/Selection).
		selectionMode: "none",
		_setSelectionModeAttr: function (/*String*/value) {
			if (this.selectionMode !== value) {
				if (this.selectionMode === "none") {
					this._selectionClickHandle = this.on("click", lang.hitch(this, "_handleSelection"));
				} else {
					if (this.value === "none") {
						this._selectionClickHandle.remove();
						// TODO: should we deselect the currently selected items ?
					}
				}
				this._set("selectionMode", value);
			}
		},

		// CSS classes internally referenced by the List widget
		_cssClasses: {item: "d-list-item",
					  category: "d-list-category",
					  loading: "d-list-loading"},

		// Handle for the selection click event handler 
		_selectionClickHandle: null,
		
		// Handle for the observer of the store query result
		_observerHandle: null,

		//////////// Widget life cycle ///////////////////////////////////////

		buildRendering: function () {
			// summary:
			//		Initialize the widget node and set the container node.
			// tags:
			//		protected
			this.style.display = "block";
			this.dojoClick = false; // this is to avoid https://bugs.dojotoolkit.org/ticket/17578
			this.containerNode = this;
		},

		createdCallback: dcl.after(function () {
			// summary:
			//		Create the default store, if necessary, after all attributes values are set on the widget.
			// tags:
			//		protected
			var list = this;
			if (!this.store) {
				this.store = {
					data: [],
					_queried: false,
					query: function () {
						this._queried = true;
						return this.data.slice();
					},
					getIdentity: function (item) {
						return item;
					},
					add: function (item, options) {
						var beforeIndex = -1;
						if (options && options.before) {
							beforeIndex = this.data.indexOf(options.before);
						}
						if (beforeIndex >= 0) {
							this.data.splice(beforeIndex, 0, item);
						} else {
							this.data.push(item);
						}
						if (this._queried) {
							list._itemAddedHandler(item, beforeIndex >= 0 ? beforeIndex : this.data.length - 1);
						}
						return item;
					},
					remove: function (id) {
						var index = this.data.indexOf(id), item;
						if (index >= 0 && index < this.data.length) {
							item = this.data.splice(index, 1)[0];
							if (this._queried) {
								list._itemDeletedHandler(item, false);
							}
							return true;
						}
					}
				};
			}
		}),

		enteredViewCallback: function () {
			// FIXME: THIS IS A WORKAROUND, BECAUSE Widget.enteredViewCallback IS RESETING THE TAB INDEX TO -1.
			// => WITH THIS WORKAROUND, ANY CUSTOM TABINDEX SET ON A WIDGET NODE IS IGNORED AND REPLACED WITH 0
			this._enteredView = true;
			this.setAttribute("tabindex", "0");
			this.tabIndex = "0";
			domClass.add(this, this.baseClass);
			// END OF WORKAROUND
		},

		startup: function () {
			// summary:
			//		Starts the widget: parse the content of the widget node to clean it,
			//		add items to the store if specified in markup, and then load the list
			//		items from the store.
			this._processAndRemoveContent(this, {"D-LIST-STORE": function (node) {
				this._processAndRemoveContent(node, {"D-LIST-STORE-ITEM": function (node) {
					var itemAttribute = node.getAttribute("item");
					if (itemAttribute) {
						// Reusing the widget mechanism to extract attribute value.
						// FIXME: should not have to manipulate node._propCaseMap but use a "more public" method ?
						node._propCaseMap = {item: "item"};
						node.item = {};
						this.store.add(this.mapAttributes.call(node).item);
					}
				}});
			}});
			this._populate();
		},

		destroy: function () {
			// summary:
			//		Destroy the widget.
			if (this._selectionClickHandle) {
				this._selectionClickHandle.remove();
				this._selectionClickHandle = null;
			}
			if (this._observerHandle) {
				this._observerHandle.remove();
				this._observerHandle = null;
			}
		},

		//////////// Public methods ///////////////////////////////////////

		onRendererEvent: function (/*String*/event, /*Function*/func) {
			// summary:
			//		Call specified function when event occurs within a renderer.
			//	event: String 
			//		the type of events ("click", ...)
			//	func: Function
			//		The function to call when the event occurs within a renderer.
			//		The function is called in the context of the List widget, and
			//		it receives the following parameters:
			//		- the original event;
			//		- the renderer within which the event occurred.
			var that = this;
			return this.on(event, function (e) {
				var enclosingRenderer;
				if (e.target === this) {
					return;
				} else {
					enclosingRenderer = that.getEnclosingRenderer(e.target);
					if (enclosingRenderer) {
						return func.call(that, e, enclosingRenderer);
					}
				}
			});
		},

		getRendererByItem: function (/*Object*/item) {
			// summary:
			//		Returns the renderer currently displaying a specific item.
			// item: Object
			//		The item displayed by the renderer.
			var renderers = query("." + this._cssClasses.item, this.containerNode);
			var rendererIndex = renderers.map(function (renderer) {
									return renderer.item;
								})
								.indexOf(item);
			if (rendererIndex >= 0) {
				return renderers[rendererIndex];
			}
		},

		getItemRendererByIndex: function (/*int*/index) {
			// summary:
			//		Returns the item renderer at a specific index in the List.
			// index: int
			//		The index of the item renderer in the list (first item renderer index is 0).
			var itemRenderers = query("." + this._cssClasses.item, this.containerNode);
			var returned = null;
			if (index < itemRenderers.length) {
				returned = query("." + this._cssClasses.item, this.containerNode)[index];
			}
			return returned;
		},

		getItemRendererIndex: function (/*Object*/renderer) {
			// summary:
			//		Returns the index of an item renderer in the List.
			// renderer: Object
			//		The item renderer.
			var index = query("." + this._cssClasses.item, this.containerNode).indexOf(renderer);
			return index < 0 ? null : index;
		},

		getEnclosingRenderer: function (/*DOMNode*/node) {
			// summary:
			//		Returns the renderer enclosing a dom node.
			// node: DOMNode
			//		The dom node.
			var currentNode = node;
			while (currentNode) {
				if (currentNode.parentNode && domClass.contains(currentNode.parentNode,
						this.baseClass)) {
					break;
				}
				currentNode = currentNode.parentNode;
			}
			if (currentNode) {
				return currentNode;
			} else {
				return null;
			}
		},

		//////////// delite/Selection implementation ///////////////////////////////////////

		getIdentity: function (/*Object*/item) {
			// summary:
			//		Returns the identity of an item for the Selection.
			// item: Object
			//		The item.
			// tags:
			//		protected
			return item;
		},

		updateRenderers: function (/*Array*/items) {
			// summary:
			//		Update renderers when the selection has changed.
			// items: Array
			//		The items which renderers must be updated.
			// tags:
			//		protected
			var i = 0, currentItem, renderer;
			if (this.selectionMode !== "none") {
				for (; i < items.length; i++) {
					currentItem = items[i];
					renderer = this.getRendererByItem(currentItem);
					if (renderer) {
						domClass.toggle(renderer, "d-selected", this.isSelected(currentItem));
					}
				}
			}
		},

		//////////// Private methods ///////////////////////////////////////

		_processAndRemoveContent: function (/*DomNode*/node, /*Object*/tagHandlers) {
			// summary:
			//		process the content of a dom node using tag handlers and remove this content. 
			// node: Object
			//		the dom node to process
			// tagHandlers: Object
			//		a map which keys are tag names and values are functions that are executed
			//		when a node with the corresponding tag has been found under node. The
			//		function takes one parameter, that is the node that has been found. Note
			//		that the function is run in the context of the widget, to allow easy
			//		recursive processing.
			// tags:
			//		private
			var i, len, child, tagName;
			if (node.childNodes.length > 1) {
				len = node.childNodes.length;
				for (i = 0; i < len; i++) {
					child = node.firstChild;
					if (child) {
						tagName = child.tagName;
						if (tagName && tagHandlers[tagName]) {
							tagHandlers[tagName].call(this, child);
						}
						this._removeNode(child);
					}
				}
			}
		},

		_populate: function () {
			// summary:
			//		Populate the list using the store to retrieve items.
			// tags:
			//		private
			this._toggleListLoadingStyle();
			when(this.store.query(this.query, this.queryOptions), lang.hitch(this, function (queryResult) {
				if (queryResult.observe) {
					this._observerHandle = queryResult.observe(lang.hitch(this, "_observer"), true);
				}
				this._addItemRenderers(queryResult, "last");
				this._toggleListLoadingStyle();
			}), lang.hitch(this, function (error) {
				// TODO: is this how we are supposed to report errors (this comes from delite/Store.js)?
				this.emit("query-error", { error: error, cancelable: false, bubbles: true });
			}));
		},

		_observer: function (/*Object*/item, /*int*/removedFrom, /*int*/insertedInto) {
			// summary:
			//		Observer for the list of items retrieved from the store (see dojo/store/Observable).
			// item: Object
			//		the item that has changed.
			// removedFrom: int
			//		the position that the item was removed from.
			// insertedInto: int
			//		the position that the item was inserted into.
			// tags:
			//		private
			if (removedFrom >= 0 && insertedInto < 0) { // item removed
				this._itemDeletedHandler(item, false);
			}
			if (removedFrom < 0 && insertedInto >= 0) { // item added
				this._itemAddedHandler(item, insertedInto);
			}
		},

		_toggleListLoadingStyle: function () {
			// summary:
			//		Toggle the "loading" style for the list.
			// tags:
			//		private
			domClass.toggle(this, this._cssClasses.loading);
		},

		// FIXME: DO WE NEED THIS METHOD ? SHOULDN'T WE DIRECTLY CALL removeChild INSTEAD ?
		_removeNode: function (node) {
			// summary:
			//		Remove a node from the dom.
			// tags:
			//		private
			HTMLElement.prototype.removeChild.call(node.parentNode, node);
		},

		/////////////////////////////////
		// Model updates handler
		/////////////////////////////////

		_itemDeletedHandler: function (item, keepSelection) {
			var renderer = this.getRendererByItem(item);
			if (renderer) {
				this._removeRenderer(renderer, keepSelection);
			}
		},

		_itemAddedHandler: function (item, atIndex) {
			var newRenderer = this._createItemRenderer(item);
			// FIXME: WHAT ABOUT CATEGORIZED LISTS ???
			this._addItemRenderer(newRenderer, atIndex);
		},

		_itemMovedHandler: function (item, fromIndex, toIndex) {
			console.log("TODO: Item " + item + " moved from index " + fromIndex + " to " + toIndex);
		},

		/////////////////////////////////
		// Private methods for renderer life cycle
		/////////////////////////////////

		_addItemRenderers: function (/*Array*/ items, pos) {
			// TODO: rename as renderNewItems ?
			if (!this.containerNode.firstElementChild) {
				this.containerNode.appendChild(this._createRenderers(items, 0, items.length, null));
			} else {
				if (pos === "first") {
					this.containerNode.insertBefore(this._createRenderers(items, 0, items.length, null),
							this.containerNode.firstElementChild);
				} else if (pos === "last") {
					this.containerNode.appendChild(this._createRenderers(items, 0, items.length,
							this._getLastRenderer().item));
				} else {
					console.log("_addItemRenderers: only first and last positions are supported.");
				}
			}
		},

		_createRenderers: function (/*Array*/ items, fromIndex, count, previousItem) {
			var currentIndex = fromIndex,
				currentItem, toIndex = fromIndex + count - 1;
			var documentFragment = document.createDocumentFragment();
			for (; currentIndex <= toIndex; currentIndex++) {
				currentItem = items[currentIndex];
				if (this.categoryAttribute) {
					if (!previousItem
							|| currentItem[this.categoryAttribute] !== previousItem[this.categoryAttribute]) {
						documentFragment.appendChild(this._createCategoryRenderer(currentItem[this.categoryAttribute]));
					}
				}
				documentFragment.appendChild(this._createItemRenderer(currentItem));
				previousItem = currentItem;
			}
			return documentFragment;
		},

		_addItemRenderer: function (renderer, atItemIndex) {
			var rendererAtIndex = atItemIndex >= 0 ? this.getItemRendererByIndex(atItemIndex) : null;
			var previousRenderer = null, rendererCategory, newCategoryRenderer;
			if (this.categoryAttribute) {
				rendererCategory = renderer.item[this.categoryAttribute];
				previousRenderer = rendererAtIndex ? this._getPreviousRenderer(rendererAtIndex) : this._getLastRenderer();
				if (previousRenderer) {
					if (previousRenderer._isCategoryRenderer) {
						if (rendererCategory !== previousRenderer.category) {
							rendererAtIndex = previousRenderer;
							previousRenderer = this._getPreviousRenderer(previousRenderer);
						}
					}
					if (!previousRenderer || (!previousRenderer._isCategoryRenderer && previousRenderer.item[this.categoryAttribute] !== rendererCategory)) {
						this.insertBefore(this._createCategoryRenderer(rendererCategory), rendererAtIndex);
					}
				} else {
					newCategoryRenderer = this._createCategoryRenderer(rendererCategory);
					if (rendererAtIndex) {
						this.insertBefore(newCategoryRenderer, rendererAtIndex);
					} else {
						this.appendChild(newCategoryRenderer);
					}
				}
				if (rendererAtIndex && !rendererAtIndex._isCategoryRenderer) {
					if (rendererAtIndex.item[this.categoryAttribute] !== rendererCategory) {
						newCategoryRenderer = this._createCategoryRenderer(rendererAtIndex.item[this.categoryAttribute]);
						this.insertBefore(newCategoryRenderer, rendererAtIndex);
						rendererAtIndex = newCategoryRenderer;
					}
				}
			}
			if (rendererAtIndex) {
				this.insertBefore(renderer, rendererAtIndex);
			} else {
				this.appendChild(renderer);
			}
		},

		_removeRenderer: function (renderer, keepSelection) {
			// Update category headers before removing the renderer, if necessary
			var rendererIsCategoryHeader = renderer._isCategoryRenderer,
				nextRenderer, previousRenderer, nextFocusRenderer;
			if (this.categoryAttribute && !rendererIsCategoryHeader) {
				previousRenderer = this._getPreviousRenderer(renderer);
				// remove the previous category header if necessary
				if (previousRenderer && previousRenderer._isCategoryRenderer) {
					nextRenderer = this._getNextRenderer(renderer);
					if (!nextRenderer || (nextRenderer && nextRenderer._isCategoryRenderer)) {
						this._removeRenderer(previousRenderer);
						if (nextRenderer && nextRenderer._isCategoryRenderer) {
							previousRenderer = this._getPreviousRenderer(renderer);
							// remove this category renderer if it is not needed anymore
							if (previousRenderer && nextRenderer.category === previousRenderer.item[this.categoryAttribute]) {
								this._removeRenderer(nextRenderer);
							}
						}
					}
				}
			}
			// Update focus if necessary
			if (this._getFocusedRenderer() === renderer) {
				nextFocusRenderer = this._getNext(renderer, 1) || this._getNext(renderer, -1);
				if (nextFocusRenderer) {
					this.focusChild(nextFocusRenderer);
				}
			}
			if (!keepSelection && !renderer._isCategoryRenderer && this.isSelected(renderer.item)) {
				// deselected the item before removing the renderer
				this.setSelected(renderer.item, false);
			}
			// remove and destroy the renderer
			this._removeNode(renderer);
			renderer.destroy();
		},

		_moveRenderer: function (renderer, toIndex) { // This is the same as _addRenderer !!!
			console.log("TODO: category management for _moveRenderer ?");
			var rendererAtIndex = getItemRendererByIndex(toIndex);
			if (rendererAtIndex != null) {
				this.insertBefore(renderer, rendererAtIndex);
			} else {
				this.appendChild(renderer);
			}
		},

		_createItemRenderer: function (item) {
			var renderer = new this.itemsRenderer({tabindex: "-1"});
			renderer.startup();
			renderer.item = item;
			if (this.selectionMode !== "none") {
				domClass.toggle(renderer, "d-selected", this.isSelected(item));
			}
			return renderer;
		},

		_createCategoryRenderer: function (category) {
			var renderer = new this.categoriesRenderer({category: category, tabindex: "-1"});
			renderer.startup();
			return renderer;
		},

		_getNextRenderer: function (renderer) {
			return renderer.nextElementSibling;
		},

		_getPreviousRenderer: function (renderer) {
			return renderer.previousElementSibling;
		},

		_getFirstRenderer: function () {
			var firstRenderer = this.getItemRendererByIndex(0);
			if (this.categoryAttribute) {
				var previousRenderer = null;
				if (firstRenderer) {
					previousRenderer = firstRenderer.previousElementSibling;
					if (previousRenderer && domClass.contains(previousRenderer, this._cssClasses.category)) {
						firstRenderer = previousRenderer;
					}
				}
			}
			return firstRenderer;
		},

		_getLastRenderer: function () {
			var children = this.getChildren(), lastRenderer = null;
			if (children.length) {
				lastRenderer = children[children.length - 1];
				while (lastRenderer
						&& !domClass.contains(lastRenderer, this._cssClasses.category)
						&& !domClass.contains(lastRenderer, this._cssClasses.item)) {
					lastRenderer = lastRenderer.previousElementSibling;
				}
			}
			return lastRenderer;
		},

		/////////////////////////////////
		// Keyboard navigation (KeyNav implementation)
		/////////////////////////////////

		// Handle keydown events
		_onContainerKeydown: dcl.before(function (evt) {
			var continueProcessing = true, renderer = this._getFocusedRenderer();
			if (renderer && renderer.onKeydown) {
				// onKeydown implementation can return false to cancel the default action
				continueProcessing = renderer.onKeydown(evt);
			}
			if (continueProcessing !== false) {
				if ((evt.keyCode === keys.SPACE && !this._searchTimer) || evt.keyCode === keys.ENTER) {
					this._onActionKeydown(evt);
				}
			}
		}),

		// Handle SPACE and ENTER keys
		_onActionKeydown: function (evt) {
			if (this.selectionMode !== "none") {
				evt.preventDefault();
				this._handleSelection(evt);
			}
		},

		childSelector: function (child) {
			return child !== this;
		},

		_getFirst: function () {
			return this._getFirstRenderer();
		},

		_getLast: function () {
			return this._getLastRenderer();
		},

		_getNext: function (child, dir) {
			var focusedRenderer, refChild, returned = null;
			if (this.focusedChild) {
				focusedRenderer = this._getFocusedRenderer();
				if (focusedRenderer === this.focusedChild) {
					// The renderer itself has the focus
					refChild = child || this.focusedChild;
					if (refChild) {
						// do not use _nextRenderer and _previousRenderer as we want to include the pageloader
						// if it exists
						returned = refChild[(dir === 1) ? "nextElementSibling" : "previousElementSibling"];
					}
				} else {
					// A descendant of the renderer has the focus
					// FIXME: can it be a category header, with no getNextFocusableChild method ?
					returned = focusedRenderer.getNextFocusableChild(child, dir);
				}
			} else {
				returned = (dir === 1 ? this._getFirst() : this._getLast());
			}
			return returned;
		},

		_onLeftArrow: function () {
			var nextChild;
			if (this._getFocusedRenderer().getNextFocusableChild) {
				nextChild = this._getFocusedRenderer().getNextFocusableChild(null, -1);
				if (nextChild) {
					this.focusChild(nextChild);
				}
			}
		},

		_onRightArrow: function () {
			var nextChild;
			if (this._getFocusedRenderer().getNextFocusableChild) {
				nextChild = this._getFocusedRenderer().getNextFocusableChild(null, 1);
				if (nextChild) {
					this.focusChild(nextChild);
				}
			}
		},

		_onDownArrow: function () {
			this._focusNextChild(1);
		},

		_onUpArrow: function () {
			this._focusNextChild(-1);
		},

		_focusNextChild: function (dir) {
			var child, renderer = this._getFocusedRenderer();
			if (renderer) {
				if (renderer === this.focusedChild) {
					child = this._getNext(renderer, dir);
					if (!child) {
						child = renderer;
					}
				} else {
					child = renderer;
				}
				this.focusChild(child);
				return child;
			}
		},

		_getFocusedRenderer: function () {
			return this.focusedChild ? this.getEnclosingRenderer(this.focusedChild) : null;
		},

		/////////////////////////////////
		// Other event handlers
		/////////////////////////////////

		_handleSelection: function (event) {
			var item, itemSelected, eventRenderer;
			eventRenderer = this.getEnclosingRenderer(event.target || event.srcElement);
			if (eventRenderer) {
				item = eventRenderer.item;
				if (item) {
					itemSelected = !this.isSelected(item);
					this.setSelected(item, itemSelected);
					this.emit(itemSelected ? "itemSelected" : "itemDeselected", {item: item});
				}
			}
		}

	});

	return register("d-list", [HTMLElement, List, ScrollableList]);

});