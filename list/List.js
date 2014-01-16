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
	//		deliteful/list/List

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

		// itemsRenderer: deliteful/list/ItemRendererBase subclass
		//		The widget class to use to render list items.
		//		It MUST extend deliteful/list/ItemRendererBase.
		itemsRenderer: DefaultItemRenderer,

		// categoriesRenderer: deliteful/list/CategoryRendererBase subclass
		//		The widget class to use to render category headers when the list items are categorized.
		//		It MUST extend deliteful/list/CategoryRendererBase.
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
							list._onItemAdded(item, beforeIndex >= 0 ? beforeIndex : this.data.length - 1);
						}
						return item;
					},
					remove: function (id) {
						var index = this.data.indexOf(id), item;
						if (index >= 0 && index < this.data.length) {
							item = this.data.splice(index, 1)[0];
							if (this._queried) {
								list._onItemDeleted(item, false);
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
			// returns:
			//		An object with a remove method to call to unregister the func
			//		for the event.
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
			}); // Object
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
				return renderers[rendererIndex]; // Widget
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
			return returned; // Widget
		},

		getItemRendererIndex: function (/*Object*/renderer) {
			// summary:
			//		Returns the index of an item renderer in the List.
			// renderer: Object
			//		The item renderer.
			var index = query("." + this._cssClasses.item, this.containerNode).indexOf(renderer);
			return index < 0 ? null : index; // int
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
				return currentNode; // Widget
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
			return item; // Object
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

		_handleSelection: function (/*Event*/event) {
			// summary:
			//		Event handler that performs items (de)selection.
			// event: Event
			//		The event the handler was called for.
			// tags:
			//		protected
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
						child.parentNode.removeChild(child);
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
					this._observerHandle = queryResult.observe(lang.hitch(this, "_onModelUpdate"), true);
				}
				this._renderNewItems(queryResult, "last");
				this._toggleListLoadingStyle();
			}), lang.hitch(this, function (error) {
				// TODO: is this how we are supposed to report errors (this comes from delite/Store.js)?
				this.emit("query-error", { error: error, cancelable: false, bubbles: true });
			}));
		},

		_toggleListLoadingStyle: function () {
			// summary:
			//		Toggle the "loading" style for the list.
			// tags:
			//		private
			domClass.toggle(this, this._cssClasses.loading);
		},

		//////////// Renderers life cycle ///////////////////////////////////////

		_renderNewItems: function (/*Array*/ items, /*String*/pos) {
			// summary:
			//		Render new items within the list widget.
			// items: Array
			//		The new items to render.
			// pos:
			//		Where to render the new items. Supported values are:
			//		- "first": render the new items at the beginning of the list
			//		- "last": render the new items at the end of the list
			// tags:
			//		private
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
					console.log("_renderNewItems: only first and last positions are supported.");
				}
			}
		},

		_createRenderers: function (/*Array*/ items, /*int*/fromIndex, /*int*/count, /*Object*/previousItem) {
			// summary:
			//		Create renderers for a list of items (including the category renderers if the list is categorized).
			// items: Array
			//		An array that contains the items to create renderers for.
			// fromIndex: int
			//		The index of the first item in the array of items
			//		(no renderer will be created for the items before this index).
			// count: int
			//		The number of items to use from the array of items, starting from the fromIndex position
			//		(no renderer will be created for the items that follows).
			// previousItem: Object
			//		The item that precede the first one for which a renderer will be created. This is only usefull for
			//		categorized lists.
			// returns:
			//		A DocumentFragment that contains the renderers.
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
			return documentFragment; // DocumentFragment
		},

		_addItemRenderer: function (/*Widget*/renderer, /*int*/atIndex) {
			// summary:
			//		Add an item renderer to the List, updating category renderers if needed.
			// renderer: List/ItemRendererBase subclass
			//		The renderer to add to the list.
			// atIndex: int
			//		The index (not counting category renderers) where to add the item renderer in the list.
			var rendererAtIndex = atIndex >= 0 ? this.getItemRendererByIndex(atIndex) : null;
			var previousRenderer = null, rendererCategory, newCategoryRenderer;
			if (this.categoryAttribute) {
				rendererCategory = renderer.item[this.categoryAttribute];
				previousRenderer = rendererAtIndex ? this._getNextRenderer(rendererAtIndex, -1) : this._getLastRenderer();
				if (previousRenderer) {
					if (previousRenderer._isCategoryRenderer) {
						if (rendererCategory !== previousRenderer.category) {
							rendererAtIndex = previousRenderer;
							previousRenderer = this._getNextRenderer(previousRenderer, -1);
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

		_removeRenderer: function (/*Widget*/renderer, /*Boolean*/keepSelection) {
			// summary:
			//		Remove a renderer from the List, updating category renderers if needed.
			// renderer: List/ItemRendererBase or List/CategoryRendererBase subclass
			//		The renderer to remove from the list.
			// keepSelection: Boolean
			//		Set to true if the renderer item should not be removed from the list of selected items.
			var rendererIsCategoryHeader = renderer._isCategoryRenderer,
				nextRenderer, previousRenderer, nextFocusRenderer;
			if (this.categoryAttribute && !rendererIsCategoryHeader) {
				previousRenderer = this._getNextRenderer(renderer, -1);
				// remove the previous category header if necessary
				if (previousRenderer && previousRenderer._isCategoryRenderer) {
					nextRenderer = this._getNextRenderer(renderer, 1);
					if (!nextRenderer || (nextRenderer && nextRenderer._isCategoryRenderer)) {
						this._removeRenderer(previousRenderer);
						if (nextRenderer && nextRenderer._isCategoryRenderer) {
							previousRenderer = this._getNextRenderer(renderer, -1);
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
			this.removeChild(renderer);
			renderer.destroy();
		},

		_createItemRenderer: function (/*Object*/item) {
			// summary:
			//		Create a renderer instance for an item.
			// item: Object
			//		The item to render.
			// returns:
			//		An instance of item renderer that renders the item.
			var renderer = new this.itemsRenderer({tabindex: "-1"});
			renderer.startup();
			renderer.item = item;
			if (this.selectionMode !== "none") {
				domClass.toggle(renderer, "d-selected", this.isSelected(item));
			}
			return renderer; // Widget
		},

		_createCategoryRenderer: function (/*String*/category) {
			// summary:
			//		Create a renderer instance for a category.
			// category: String
			//		The category to render.
			// returns:
			//		An instance of category renderer that renders the category.
			var renderer = new this.categoriesRenderer({category: category, tabindex: "-1"});
			renderer.startup();
			return renderer;
		},

		_getNextRenderer: function (/*Widget*/renderer, /*int*/dir) {
			// summary:
			//		Returns the renderer that comes immediately after of before another one.
			// renderer: Widget
			//		The renderer immediately before or after the one to return.
			// dir: int
			//		1 to return the renderer that comes immediately after renderer, -1 to
			//		return the one that comes immediately before.
			if (dir >= 0) {
				return renderer.nextElementSibling; // Widget
			} else {
				return renderer.previousElementSibling; // Widget
			}
		},

		_getFirstRenderer: function () {
			// summary:
			//		Returns the first renderer in the list.
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
			return firstRenderer; // Widget
		},

		_getLastRenderer: function () {
			// summary:
			//		Returns the last renderer in the list.
			var children = this.getChildren(), lastRenderer = null;
			if (children.length) {
				lastRenderer = children[children.length - 1];
				while (lastRenderer
						&& !domClass.contains(lastRenderer, this._cssClasses.category)
						&& !domClass.contains(lastRenderer, this._cssClasses.item)) {
					lastRenderer = lastRenderer.previousElementSibling;
				}
			}
			return lastRenderer; // Widget
		},

		//////////// Store update handlers ///////////////////////////////////////

		_onModelUpdate: function (/*Object*/item, /*int*/removedFrom, /*int*/insertedInto) {
			// summary:
			//		Called when the list of items retrieved from the store is updated (see dojo/store/Observable).
			// item: Object
			//		the item that has changed.
			// removedFrom: int
			//		the position that the item was removed from.
			// insertedInto: int
			//		the position that the item was inserted into.
			// tags:
			//		private
			var renderer;
			if (removedFrom >= 0 && insertedInto < 0) { // item removed
				this._onItemDeleted(item, false);
			} else if (removedFrom < 0 && insertedInto >= 0) { // item added
				this._onItemAdded(item, insertedInto);
			} else if (removedFrom >= 0 && insertedInto >= 0) { // item moved
				this._onItemMoved(item, removedFrom, insertedInto);
			} else { // item updated
				renderer = this.getRendererByItem(item);
				if (renderer) {
					renderer.item = item;
				}
			}
		},

		_onItemDeleted: function (/*Object*/item, /*Boolean*/keepSelection) {
			// summary:
			//		Function to call when an item is removed from the store, to update
			//		the content of the list widget accordingly.
			// item: Object
			//		The item that has been removed from the store.
			// keepSelection: Boolean
			//		Set to true if the item should not be removed from the list of selected items.
			// tags:
			//		private
			var renderer = this.getRendererByItem(item);
			if (renderer) {
				this._removeRenderer(renderer, keepSelection);
			}
		},

		_onItemAdded: function (/*Object*/item, /*Boolean*/atIndex) {
			// summary:
			//		Function to call when an item is added to the store, to update
			//		the content of the list widget accordingly.
			// item: Object
			//		The item that has been added to the store.
			// atIndex:
			//		The index at which the item has been added to the store.
			// tags:
			//		private
			var newRenderer = this._createItemRenderer(item);
			this._addItemRenderer(newRenderer, atIndex);
		},

		_onItemMoved: function (/*Object*/item, /*int*/fromIndex, /*int*/toIndex) {
			// summary:
			//		Function to call when an item is moved within the store, to update
			//		the content of the list accordingly.
			// item: Object
			//		The item that has been moved within the store.
			// fromIndex:
			//		The previous index of the item.
			// toIndex:
			//		The new index of the item.
			// tags:
			//		private
			this._onItemDeleted(item, true);
			this._onItemAdded(item, toIndex);
		},

		//////////// Keyboard navigation (KeyNav implementation) ///////////////////////////////////////

		_onContainerKeydown: dcl.before(function (evt) {
			// summary:
			//		Handle keydown events
			// tags:
			//		private
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

		_onActionKeydown: function (evt) {
			// summary:
			//		Handle SPACE and ENTER keys
			// tags:
			//		private
			if (this.selectionMode !== "none") {
				evt.preventDefault();
				this._handleSelection(evt);
			}
		},

		childSelector: function (child) {
			// tags:
			//		private
			return child !== this;
		},

		_getFirst: function () {
			// tags:
			//		private
			return this._getFirstRenderer();
		},

		_getLast: function () {
			// tags:
			//		private
			return this._getLastRenderer();
		},

		_getNext: function (child, dir) {
			// tags:
			//		private
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
			// tags:
			//		private
			var nextChild;
			if (this._getFocusedRenderer().getNextFocusableChild) {
				nextChild = this._getFocusedRenderer().getNextFocusableChild(null, -1);
				if (nextChild) {
					this.focusChild(nextChild);
				}
			}
		},

		_onRightArrow: function () {
			// tags:
			//		private
			var nextChild;
			if (this._getFocusedRenderer().getNextFocusableChild) {
				nextChild = this._getFocusedRenderer().getNextFocusableChild(null, 1);
				if (nextChild) {
					this.focusChild(nextChild);
				}
			}
		},

		_onDownArrow: function () {
			// tags:
			//		private
			this._focusNextChild(1);
		},

		_onUpArrow: function () {
			// tags:
			//		private
			this._focusNextChild(-1);
		},

		_focusNextChild: function (dir) {
			// tags:
			//		private
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
			// summary:
			//		Returns the renderer that currently got the focused or is
			//		an ancestor of the focused node.
			// tags:
			//		private
			return this.focusedChild ? this.getEnclosingRenderer(this.focusedChild) : null; /*Widget*/
		}

	});

	return register("d-list", [HTMLElement, List, ScrollableList]);

});