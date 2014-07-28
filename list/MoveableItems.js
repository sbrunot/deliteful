define(["dcl/dcl",
        "dojo/_base/lang",
        "dojo/_base/array",
        "dojo/on",
        "dojo/keys",
        "dojo/dom",
        "dojo/dom-class",
        "dojo/dom-style",
        "dojo/dom-geometry",
        "dpointer/events",
        "delite/theme!./List/themes/{{theme}}/Editable.css"
], function (dcl, lang, array, on, keys, dom, domClass, domStyle, domGeometry, pointer) {

	return dcl(null, {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		moveable: true, // Should be a statefull property
		
		moveHandleClass: "", // ONE COULD ADD THE CLASS OF THE HANDLE HERE

		moveOnLongPress: true,

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

		// Called before an item is moved through the UI move action.
		// If it returns false, the item is not moved. The item is moved
		// if it returns any other value.
		// TODO: RENAME "beforeItemMove" or "beforeItemMoved" ?
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
				this.moveable = false;
			}
			if (this.moveable) {
				this.on("pointerdown", lang.hitch(this, "_pointerdownHandler"));
			}
			domClass.toggle(this, "d-moveable-items", this.moveable);
		}),

		refreshRendering: function (props) {
			if ("moveable" in props) {
				domClass.toggle(this, "d-moveable-items", this.moveable);
				// TODO: SET / REMOVE EVENT HANDLERS
			}
		},

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		/**
		 * This method is called when a pointerdown event is received on an item renderer.
		 * If it returns true, the corresponding item becomes moveable.
		 * @param {Event} event the pointerdown event
		 */
		shouldStartDragging: function (event) {
			if (this.moveHandleClass) {
				return domClass.contains(event.target, this.moveHandleClass);
			}
			return false;
		},

		////////////////////////////////////
		// TODO: KEYBOARD NAVIGATION !!!
		////////////////////////////////////

		///////////////////////////////
		// Pointer events handlers (private)
		///////////////////////////////
		
		_pointerdownHandler: function (event) {
			if (this._draggedRenderer) {
				return;
			}
			var renderer = this.getEnclosingRenderer(event.target);
			if (renderer) {
				if (this.shouldStartDragging(event)) {
					this._startDraggingItem(renderer, event);
				} else if (this.moveOnLongPress) {
					this._timeoutHandle = this.defer(function () {
						this._timeoutHandle = null;
						this._startDraggingItem(renderer, event);
					}, 1000); // TODO: SHOULD THE DURATION BE A PROPERTY OF THE MIXIN ?
				} else {
					return;
				}
				this._touchHandlersRefs.push(this.own(on(document, "pointerup",
						lang.hitch(this, "_pointerupHandler")))[0]);
				this._touchHandlersRefs.push(this.own(on(document, "pointermove",
						lang.hitch(this, "_pointermoveHandler")))[0]);
			}
		},

		_pointerupHandler: function (event) {
			if (this._timeoutHandle) {
				this._timeoutHandle.remove();
				this._timeoutHandle = null;
				this._removeTouchHandlers();
			}
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
				this._removeTouchHandlers();
				if (this._placeHolder) {
					this._placeHolder.parentNode.removeChild(this._placeHolder);
					this._placeHolder = null;
				}
				event.preventDefault();
				event.stopPropagation();
			}
		},

		_pointermoveHandler: function (event) {
			///////////////////////////////////////////////////////////
			// TODO: CATEGORIZED LISTS SUPPORT
			///////////////////////////////////////////////////////////
			if (this._timeoutHandle) {
				this._timeoutHandle.remove();
				this._timeoutHandle = null;
				this._removeTouchHandlers();
			}
			if (this._draggedRenderer) {
				var	pageY = event.touches ? event.touches[0].pageY : event.pageY,
						clientY = event.touches ? event.touches[0].clientY : event.clientY;
				this._draggedRendererTop = this._startTop + (pageY - this._touchStartY);
				this._stopEditableAutoScroll();
				this._draggedRenderer.style.top = this._draggedRendererTop + "px";
				this._updatePlaceholderPosition(clientY);
				event.preventDefault();
				event.stopPropagation();
			}
		},

		///////////////////////////////
		// Other private methods
		///////////////////////////////

		_startDraggingItem: function (renderer, event) {
			var rendererItemIndex = this.getItemRendererIndex(renderer);
			this._draggedRenderer = renderer;
			this._draggedItemIndex = rendererItemIndex;
			this._dropPosition = rendererItemIndex;
			this._placeHolder = this.ownerDocument.createElement("div");
			this._placeHolder.className = this._cssClasses.item;
			this._placeHolder.style.height = this._draggedRenderer.offsetHeight + "px";
			this._placePlaceHolder(this._draggedRenderer, "after");
			this._setDraggable(this._draggedRenderer, true);
			this._touchStartY = event.touches ? event.touches[0].pageY : event.pageY;
			this._startTop = domGeometry.getMarginBox(this._draggedRenderer).t;
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
				if (this.getBottomDistance(this._placeHolder) <= 0) {
					// Place holder is at the bottom of the list, stop scrolling
					this._stopEditableAutoScroll();
				} else {
					this._editableAutoScroll(15, clientY);
				}
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

		_removeTouchHandlers: function () {
			array.forEach(this._touchHandlersRefs, function (handlerRef) {
				handlerRef.remove();
			});
			this._touchHandlersRefs = [];
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
			if (pos === "after") {
				var next = refNode.nextSibling;
				if (next) {
					return this._placePlaceHolder(next, "before");
				} else {
					refNode.parentElement.appendChild(this._placeHolder);
				}
			} else {
				refNode.parentElement.insertBefore(this._placeHolder, refNode);
			}
			this._placeHolderClientRect = this._placeHolder.getBoundingClientRect();
		}

	});
});