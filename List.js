define(["dcl/dcl",
	"delite/register",
	"dojo/_base/lang",
	"dojo/when",
	"dojo/on",
	"dojo/query",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/dom-class",
	"dojo/keys",
	"delite/Widget",
	"delite/Selection",
	"delite/KeyNav",
	"delite/Invalidating",
	"./List/DefaultItemRenderer",
	"./List/DefaultCategoryRenderer",
	"./List/ScrollableList",
	"delite/themes/load!./List/themes/{{theme}}/List_css"
], function (dcl, register, lang, when, on, query, dom, domConstruct, domClass, keys, Widget,
		Selection, KeyNav, Invalidating, DefaultItemRenderer, DefaultCategoryRenderer, ScrollableList) {

	var List = dcl([Widget, Selection, KeyNav, Invalidating], {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		// The dojo object store that contains the list items
		store: null,

		// The query to use to retrieve list items from the store
		query: null,

		// Options for the query
		queryOptions: null,

		 // Name of the list item attribute that define the category of a list item.
		//  If falsy, the list is not categorized.
		categoryAttribute: "",

		// The widget class to use to render list items. It MUST extend the deliteful/List/ItemRendererBase class.
		itemsRenderer: DefaultItemRenderer,

		// The widget class to use to render category headers when the list items are categorized.
		// It MUST extend the deliteful/List/CategoryRendererBase class.
		categoriesRenderer: DefaultCategoryRenderer,

		// The base class that defines the style of the list.
		// Available values are:
		// - "d-list" (default), that render a list with no rounded corners and no left and right margins.
		// - "d-round-rect-list", that render a list with rounded corners and left and right margins;
		baseClass: "d-list",
		_setBaseClassAttr: function (value) {
			if (this.baseClass !== value) {
				domClass.replace(this, value, this.baseClass);
				this._set("baseClass", value);
			}
		},

		// The selection mode for list items (see delite/Selection).
		selectionMode: "none",

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_cssClasses: {item: "d-list-item",
					  category: "d-list-category",
					  loading: "d-list-loading"},

		/////////////////////////////////
		// Widget lifecycle
		/////////////////////////////////

		buildRendering: function () {
			this.style.display = "block";
			this.dojoClick = false; // this is to avoid https://bugs.dojotoolkit.org/ticket/17578
			this.containerNode = this;
		},

		createdCallback: dcl.after(function () {
			var list = this;
			// Init the store with a default value if none has already been defined
			if (!this.store) {
				this.store = {
					data: [],
					_queried: false,
					query: function (query, options) {
						// TODO: support pagination
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
			};
			// FIXME: SHOULD BE MOVED IN THE selectionMode SETTER
			if (this.selectionMode !== "none") {
				this.on("click", lang.hitch(this, "_handleSelection"));
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
			// Parse content to remove it / retrieve items to add to the store
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
			this._initContent();
		},

		_processAndRemoveContent: function (node, tagHandlers) {
			var i, len, child, tagName;
			// Process the content of the node and remove it
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
		
		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		// Register a handler for a type of events generated in any of the renderers.
		// Parameters:
		//		event: the type of events ("click", ...)
		//		handler: the event handler
		// When the event handler is called, it receive the list as its first parameter, the event
		// as its second and the index of the list item displayed in the renderer.
		// TODO: WHAT IF THE RENDERER IS A CATEGORY HEADER ???
		onRendererEvent: function (event, handler) {
			var that = this;
			return this.on(event, function (e) {
				var parentRenderer;
				if (domClass.contains(e.target, this.baseClass)) {
					return;
				} else {
					enclosingRenderer = that.getEnclosingRenderer(e.target);
					if (enclosingRenderer) {
						// TODO: Pass the enclosingRenderer too ?
						// Or run the handler in the enclosingRenderer context and pass the list ?
						// TODO: Pass the enclosingRenderer INSTEAD of the item index,
						// as it contains itself the item index and the item ?
						return handler.call(that, e, that.getItemRendererIndex(enclosingRenderer));
					}
				}
			});
		},

		getRendererByItem: function (item) {
			var renderers = query("." + this._cssClasses.item, this.containerNode);
			var rendererIndex = renderers.map(function (renderer) {
									return renderer.item;
								})
								.indexOf(item);
			if (rendererIndex >= 0) {
				return renderers[rendererIndex];
			}
		},

		getItemRendererByIndex: function (index) {
			var itemRenderers = query("." + this._cssClasses.item, this.containerNode);
			var returned = null;
			if (index < itemRenderers.length) {
				returned = query("." + this._cssClasses.item, this.containerNode)[index];
			}
			return returned;
		},

		getItemRendererIndex: function (renderer) {
			var index = query("." + this._cssClasses.item, this.containerNode).indexOf(renderer);
			return index < 0 ? null : index;
		},

		getEnclosingRenderer: function (node) {
			var currentNode = dom.byId(node);
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

		/////////////////////////////////
		// Selection implementation
		/////////////////////////////////

		getIdentity: function (item) {
			return item;
		},

		updateRenderers: function (items) {
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

		/////////////////////////////////
		// Private methods
		/////////////////////////////////

		_initContent: function () {
			var queryResult = this.store.query(this.query, this.queryOptions);
			if (queryResult.observe) {
				// FIXME: SHOULD WE STORE THE HANDLE AND CLOSE IT WHEN THE WIDGET IS DESTROYED ?
				queryResult.observe(lang.hitch(this, "_observer"), true);
			}
			this._addItemRenderers(queryResult, "last");
		},

		_observer: function (object, removedFrom, insertedInto) {
			if (removedFrom >= 0 && insertedInto < 0) { // item removed
				this._itemDeletedHandler(object, false);
			}
			if (removedFrom < 0 && insertedInto >= 0) { // item added
				this._itemAddedHandler(object, insertedInto);
			}
		},

		_toggleListLoadingStyle: function () {
			domClass.toggle(this, this._cssClasses.loading);
		},

		_removeNode: function (node) {
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
					// FIXME: can it be a category header, with no _getNextFocusableChild method ?
					returned = focusedRenderer._getNextFocusableChild(child, dir);
				}
			} else {
				returned = (dir === 1 ? this._getFirst() : this._getLast());
			}
			return returned;
		},

		_onLeftArrow: function () {
			var nextChild;
			if (this._getFocusedRenderer()._getNextFocusableChild) {
				nextChild = this._getFocusedRenderer()._getNextFocusableChild(null, -1);
				if (nextChild) {
					this.focusChild(nextChild);
				}
			}
		},

		_onRightArrow: function () {
			var nextChild;
			if (this._getFocusedRenderer()._getNextFocusableChild) {
				nextChild = this._getFocusedRenderer()._getNextFocusableChild(null, 1);
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