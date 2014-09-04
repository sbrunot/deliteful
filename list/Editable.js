define(["dcl/dcl",
        "dojo/_base/lang",
        "dojo/_base/array",
        "dojo/on",
        "dojo/keys",
        "dojo/dom",
        "dojo/dom-class",
        "dojo/dom-style",
        "dojo/dom-construct",
        "dojo/dom-geometry",
        "dpointer/events",
        "delite/theme!./List/themes/{{theme}}/Editable.css"
], function (dcl, lang, array, on, keys, dom, domClass, domStyle, domConstruct, domGeometry, pointer) {

	return dcl(null, {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		movable: true, // Should be a statefull property

		deletable: true,  // Should be a statefull property
		
		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_indexOfDeletableItem: -1,
		_touchHandlersRefs: null,
		_placeHolder: null,
		_placeHolderClientRect: null,
		_draggedRenderer: null,
		_touchStartY: null,
		_startTop: null,
		_draggedRendererTop: null,
		_draggedItemIndex: null,
		_dropPosition: -1,

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		// Called before the deletion of an item through the UI delete action.
		// If it returns false, the item is not deleted. The item is deleted
		// if it returns any other value.
		// TODO: RENAME "beforeItemDelete" or "beforeItemDeletion" ?
		/*jshint unused:false */
		onItemDelete: function (item, itemIndex) {
			// to be implemented
		},

		/*jshint unused:false */
		onItemMove: function (item, originalIndex, newIndex) {
			// to be immplemented
		},

		/////////////////////////////////
		// Widget lifecycle
		/////////////////////////////////

		preCreate: dcl.after(function () {
			this._touchHandlersRefs = [];
		}),

		attachedCallback: dcl.after(function () {
			if (this._isCategorized() || (this.pageLength && this.autoLoad)) {
				// moving items not yet supported on categorized lists or on paginated lists with auto loading
				this.movable = false;
			}
			if (this.deletable) {
				this._onRendererEvent("click", lang.hitch(this, "_rendererClickHandler"));
			}
			if (this.movable) {
				this.on("pointerdown", lang.hitch(this, "_editableTouchPressHandler"));
			}
			this._onRendererEvent("keydown", lang.hitch(this, "_rendererKeydownHandler"));
			domClass.toggle(this, "d-movable-items", this.movable);
			domClass.toggle(this, "d-deletable-items", this.deletable);
		}),

		refreshRendering: function (props) {
		},

		destroy: dcl.after(function () {
			if (this._rightEditNode) {
				if (this._rightEditNode.parentNode) {
					this._rightEditNode.parentNode.removeChild(this._rightEditNode);
				}
				delete this._rightEditNode;
			}
		}),

		/////////////////////////////////
		// List methods
		/////////////////////////////////

		/*jshint unused:vars */
		_handleSelection: dcl.superCall(function (sup) {
			return function (event) {
				if (!this.deletable) { // cannot select / unselect items while items are deletable
					return sup.apply(this, arguments);
				}
			};
		}),

		_createItemRenderer: dcl.superCall(function (sup) {
			return function (item) {
				var renderer = sup.apply(this, arguments);
				// This is a new renderer
				if (this.deletable || this.movable) {
					// TODO: EXTERNALIZE IN A PROTECTED METHOD THAT IS EASY TO OVERRIDE
					var rightEditNode = this.ownerDocument.createElement("div");
					domClass.add(rightEditNode, "d-list-item-right-edit");
					renderer.appendChild(rightEditNode);
				}
				if (this.deletable) {
					// TODO: EXTERNALIZE IN A PROTECTED METHOD THAT IS EASY TO OVERRIDE
					var leftEditNode = this.ownerDocument.createElement("div");
					domClass.add(leftEditNode, "d-list-item-left-edit");
					renderer.insertBefore(leftEditNode, renderer.firstChild);
				}
				return renderer;
			};
		}),

		/////////////////////////////////
		// Private methods
		/////////////////////////////////

		_onRendererEvent: function (/*String*/event, /*Function*/func) {
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

		_showDeleteButton: function (itemIndex) {
			// TODO: USE i18n string
			var renderer = this.getItemRendererByIndex(itemIndex);
			domClass.add(renderer, "d-delete-button");
		},

		_hideDeleteButton: function (itemIndex) {
			var renderer = this.getItemRendererByIndex(itemIndex);
			domClass.remove(renderer, "d-delete-button");
		},

		_deleteAtIndex: function (itemIndex) {
			var renderer = this.getItemRendererByIndex(itemIndex),
				item = renderer.item;
			if (this.onItemDelete(item, itemIndex) !== false) {
				if (this.store) {
					this.store.remove(this.store.getIdentity(item));
				} else {
					this._removeRenderer(renderer);
				}
			}
		},

		_setRightEditNodeInnerHTML: function (itemIndex, innerHTML) {
			var renderer = this.getItemRendererByIndex(itemIndex);
			if (renderer) {
				renderer.children[2].innerHTML = innerHTML;
			}
		},

		_isRightEditNodeDescendant: function (node) {
			var currentNode = node;
			while (currentNode) {
				if (domClass.contains(currentNode, "d-list-item-right-edit")) {
					return true;
				}
				currentNode = currentNode.parentNode;
			}
			return false;
		},

		////////////////////////////////////
		// TODO: KEYBOARD NAVIGATION !!!
		////////////////////////////////////

		_rendererClickHandler: function (evt, renderer) {
			var node = evt.target;
			var resetDeletableItem = true;
			var itemIndex = this.getItemRendererIndex(renderer);
			if (this.deletable) {
				while (node && !domClass.contains(node, this.baseClass)) {
					if (domClass.contains(node, "d-list-item-left-edit")) {
						if (this._indexOfDeletableItem === itemIndex) {
							// do nothing
							resetDeletableItem = false;
							break;
						} else if (this._indexOfDeletableItem >= 0) {
							this._hideDeleteButton(this._indexOfDeletableItem);
						}
						this._showDeleteButton(itemIndex);
						this._indexOfDeletableItem = itemIndex;
						resetDeletableItem = false;
						this.focusChild(this.getItemRendererByIndex(itemIndex));
						break;
					} else if (domClass.contains(node, "d-list-item-right-edit")) {
						if (this._indexOfDeletableItem === itemIndex) {
							this._hideDeleteButton(itemIndex);
							this._indexOfDeletableItem = -1;
							this._deleteAtIndex(itemIndex);
						}
						break;
					}
					node = node.parentNode;
				}
			}
			if (resetDeletableItem && this._indexOfDeletableItem >= 0) {
				this._hideDeleteButton(this._indexOfDeletableItem);
				this._indexOfDeletableItem = -1;
			}
		},

		_rendererKeydownHandler: function (evt, renderer) {
			var itemIndex = this.getItemRendererIndex(renderer);
			if (itemIndex >= 0 && evt.keyCode === keys.DELETE && this.deletable) {
				if (this._indexOfDeletableItem >= 0) {
					if (this._indexOfDeletableItem === itemIndex) {
						this._hideDeleteButton(itemIndex);
						this._indexOfDeletableItem = -1;
						this._deleteAtIndex(itemIndex);
					} else {
						this._hideDeleteButton(this._indexOfDeletableItem);
						this._showDeleteButton(itemIndex);
						this._indexOfDeletableItem = itemIndex;
					}
				} else {
					this._showDeleteButton(itemIndex);
					this._indexOfDeletableItem = itemIndex;
				}
			}
			// TODO: implement moving item using keyboard
		},

		///////////////////////////////
		// Movable implementation
		///////////////////////////////
		
		_editableTouchPressHandler: function (event) {
			if (this._draggedRenderer) {
				return;
			}
			var renderer = this.getEnclosingRenderer(event.target),
				rendererItemIndex = this.getItemRendererIndex(renderer);
			if (renderer && this._isRightEditNodeDescendant(event.target)) {
				if (rendererItemIndex === this._indexOfDeletableItem) {
					return;
				}
				this._draggedRenderer = renderer;
				this._draggedItemIndex = rendererItemIndex;
				this._dropPosition = rendererItemIndex;
				this._placeHolder = domConstruct.create("div",
						{className: this._cssClasses.item});
				this._placeHolder.style.height = this._draggedRenderer.offsetHeight + "px";
				this._placePlaceHolder(this._draggedRenderer, "after");
				this._setDraggable(this._draggedRenderer, true);
				this._touchStartY = event.touches ? event.touches[0].pageY : event.pageY;
				this._startTop = domGeometry.getMarginBox(this._draggedRenderer).t;
				this._touchHandlersRefs.push(this.own(on(document, "pointerup",
						lang.hitch(this, "_editableTouchReleaseHandler")))[0]);
				this._touchHandlersRefs.push(this.own(on(document, "pointermove",
						lang.hitch(this, "_editableTouchMoveHandler")))[0]);
				event.preventDefault();
				event.stopPropagation();
			}
		},

		_editableTouchMoveHandler: function (event) {
			///////////////////////////////////////////////////////////
			// TODO: CATEGORIZED LISTS SUPPORT
			///////////////////////////////////////////////////////////
			var	pageY = event.touches ? event.touches[0].pageY : event.pageY,
				clientY = event.touches ? event.touches[0].clientY : event.clientY;
			this._draggedRendererTop = this._startTop + (pageY - this._touchStartY);
			this._stopEditableAutoScroll();
			this._draggedRenderer.style.top = this._draggedRendererTop + "px";
			this._updatePlaceholderPosition(clientY);
			event.preventDefault();
			event.stopPropagation();
		},

		_updatePlaceholderPosition: function (clientY) {
			var nextRenderer, previousRenderer;
			if (clientY < this._placeHolderClientRect.top) {
				previousRenderer = this._getNextRenderer(this._placeHolder, -1);
				if (previousRenderer === this._draggedRenderer) {
					previousRenderer = this._getNextRenderer(previousRenderer, -1);
				}
				if (previousRenderer) {
					this._placePlaceHolder(previousRenderer, "before");
					this._dropPosition--;
				}
			} else if (clientY > this._placeHolderClientRect.bottom) {
				nextRenderer = this._getNextRenderer(this._placeHolder, 1);
				if (nextRenderer === this._draggedRenderer) {
					nextRenderer = this._getNextRenderer(nextRenderer, 1);
				}
				if (nextRenderer) {
					this._placePlaceHolder(nextRenderer, "after");
					this._dropPosition++;
				}
			}
			var clientRect = this.getBoundingClientRect();
			if (clientY < clientRect.top + 15) {
				this._editableAutoScroll(-15, clientY);
			} else if (clientY > clientRect.top + clientRect.height - 15) {
				this._editableAutoScroll(15, clientY);
			} else {
				this._stopEditableAutoScroll();
			}
		},

		_editableAutoScroll: function (rate, clientY) {
			this._editableAutoScrollID = setTimeout(lang.hitch(this, function () {
				var oldScroll = this.getCurrentScroll().y;
				this.scrollBy({y: rate});
				setTimeout(lang.hitch(this, function () {
					var realRate = this.getCurrentScroll().y - oldScroll;
					if (realRate !== 0) {
						if (this._placeHolder) {
							this._placeHolderClientRect = this._placeHolder.getBoundingClientRect();
							this._startTop += realRate;
							this._draggedRendererTop += realRate;
							this._draggedRenderer.style.top = this._draggedRendererTop + "px";
							this._updatePlaceholderPosition(clientY);
						}
					}
				}));
			}), 50);
		},

		_stopEditableAutoScroll: function () {
			if (this._editableAutoScrollID) {
				clearTimeout(this._editableAutoScrollID);
				this._editableAutoScrollID = null;
			}
		},

		_editableTouchReleaseHandler: function (event) {
			if (this._draggedRenderer) {
				if (this._dropPosition >= 0) {
					if (this._dropPosition !== this._draggedItemIndex) {
						// TODO: ADD A HANDLER THAT IS ABLE TO CANCEL THE MOVE !!!
						console.log("TODO: MOVE ITEM IN THE STORE (from index " + this._draggedItemIndex + " to " + this._dropPosition + ")");
					}
					this._draggedItemIndex = null;
					this._dropPosition = -1;
				}
				this.defer(function () { // iPhone needs setTimeout (via defer)
					this._setDraggable(this._draggedRenderer, false);
					this._draggedRenderer = null;
				});
				array.forEach(this._touchHandlersRefs, function (handlerRef) {
					handlerRef.remove();
				});
				this._touchHandlersRefs = [];
				if (this._placeHolder) {
					this._placeHolder.parentNode.removeChild(this._placeHolder);
					this._placeHolder = null;
				}
				event.preventDefault();
				event.stopPropagation();
			}
		},

		_setDraggable: function (node, draggable) {
			if (draggable) {
				domStyle.set(node, {
					width: domGeometry.getContentBox(node).w + "px",
					top: node.offsetTop + "px"
				});
				domClass.add(node, "d-list-item-dragged");
			} else {
				domClass.remove(node, "d-list-item-dragged");
				domStyle.set(node, {
					width: "",
					top: ""
				});
			}
			this.disableTouchScroll = draggable;
		},
		
		_placePlaceHolder: function (refNode, pos) {
			domConstruct.place(this._placeHolder, refNode, pos);
			this._placeHolderClientRect = this._placeHolder.getBoundingClientRect();
		}

	});
});