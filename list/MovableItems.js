define(["dcl/dcl",
    "dojo/on",
    "dojo/keys",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-geometry",
    "dpointer/events",
    "delite/theme!./List/themes/{{theme}}/Editable.css" // FIXME: USES MOVABLE.css INSTEAD OF EDITABLE.css ?
], function (dcl, on, keys, domClass, domStyle, domGeometry, pointer) {

	// TODO: HOW TO CANCEL A MOVE WHEN USING A TOUCH DEVICE (EQUIVALENT TO KEYBOARD ESC) ?
	return dcl(null, {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		movable: true,

		_setMovableAttr: function (value) {
			if (value && (this._isCategorized()  || (this.pageLength && this.autoLoad))) {
				throw new Error("items of a categorized list or of a pageable list with autoLoad cannot be moved.");
			} else {
				this._set("movable", value);
			}
		},

		grabHandleClass: "",

		grabPressDuration: 1000,

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		/*
		_autoScrollRef: null,
		_pointerdownHandlerRef: null,
		_touchHandlersRefs: null,
		_placeHolder: null,
		_placeHolderClientRect: null,
		_grabbedRenderer: null,
		_touchStartY: null,
		_startTop: null,
		_grabbedRendererTop: null,
		_grabbedItemIndex: null,
		*/
		_dropPosition: -1,
		_initialPosition: -1,

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
				// TODO: LOG AN ERROR MESSAGE ?
			}
			this.notifyCurrentValue("movable");
		}),

		refreshRendering: function (props) {
			if ("movable" in props) {
				domClass.toggle(this, "d-movable-items", this.movable);
				if (this.movable) {
					this._pointerdownHandlerRef = this.on("pointerdown", this._pointerdownHandler.bind(this));
				} else {
					if (this._pointerdownHandlerRef) {
						this._pointerdownHandlerRef.remove();
						this._pointerdownHandlerRef = null;
						this._removeTouchHandlers();
						this._cancelAutoScroll();
					}
				}
				this._refreshAriaGrabbed();
			}
		},

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		/**
		 * This method is called when a pointerdown event is received on an item renderer.
		 * If it returns true, the corresponding item becomes movable.
		 * @param {Event} event the pointerdown event
		 */
		isGrabEvent: function (event) {
			if (this.grabHandleClass) {
				return domClass.contains(event.target, this.grabHandleClass);
			}
			return false;
		},

		///////////////////////////////
		// Pointer events handlers (private)
		///////////////////////////////

		_pointerdownHandler: function (event) {
			if (this._grabbedRenderer) {
				return;
			}
			var renderer = this.getEnclosingRenderer(event.target);
			if (renderer) {
				if (this.isGrabEvent(event)) {
					this._grabItem(renderer, event);
				} else if (this.grabPressDuration) {
					this._grabTimeoutHandle = this.defer(function () {
						this._grabTimeoutHandle = null;
						this._grabItem(renderer, event);
					}, this.grabPressDuration);
				} else {
					return;
				}
				this._touchHandlersRefs.push(this.own(on(document, "pointerup",
						this._pointerupHandler.bind(this)))[0]);
				this._touchHandlersRefs.push(this.own(on(document, "pointermove",
						this._pointermoveHandler.bind(this)))[0]);
				this._touchHandlersRefs.push(this.own(on(document, "pointercancel",
						this._pointercancelHandler.bind(this)))[0]);
			}
			// Needed on webkit to avoid the default scroll behavior (click and move to the top or bottom => scroll)
			event.preventDefault();
		},

		_pointercancelHandler: function () {
			this._clearGrabTimeout();
			this._removeTouchHandlers();
		},

		_pointerupHandler: function () {
			this._dropItem();
		},

		_pointermoveHandler: function (event) {
			///////////////////////////////////////////////////////////
			// TODO: CATEGORIZED LISTS SUPPORT ?
			///////////////////////////////////////////////////////////
			this._clearGrabTimeout();
			if (this._grabbedRenderer) {
				var	pageY = event.touches ? event.touches[0].pageY : event.pageY,
						clientY = event.touches ? event.touches[0].clientY : event.clientY;
				this._grabbedRendererTop = this._startTop + (pageY - this._touchStartY);
				this._cancelAutoScroll();
				this._grabbedRenderer.style.top = this._grabbedRendererTop + "px";
				this._updatePlaceholderPosition(clientY, true);
				// Needed on webkit to avoid the default scroll behavior (click and move to the top or bottom => scroll)
				event.preventDefault();
			}
		},

		////////////////////////////////////
		// Keyboard navigation
		////////////////////////////////////

		_onContainerKeydown: dcl.superCall(function (sup) {
			return function (event) {
				if (this.movable) {
					if (event.keyCode !== keys.TAB) {
						// To avoid the default List keydown handler behaviour
						// and the default scroll on webkit browsers
						event.preventDefault();
					}
					if (this._grabbedRenderer) {
						if (event.keyCode === keys.SPACE) {
							this._dropItem();
						} else if (event.keyCode === keys.ESCAPE) {
							this._dropItem(true);
						}
					} else {
						if (event.keyCode === keys.SPACE) {
							var renderer = this.getEnclosingRenderer(event.target);
							if (renderer) {
								this._grabItem(renderer, event);
							}
						}
					}
				}
				sup.apply(this, arguments);
			};
		}),

		_onDownArrow: dcl.superCall(function (sup) {
			return function () {
				if (this._grabbedRenderer) {
					this._updatePlaceholderPosition(this._placeHolderClientRect.bottom + 1);
					this._grabbedRenderer.style.top = this._placeHolder.offsetTop + "px";
					if (this.getBottomDistance(this._grabbedRenderer) > 0) {
						this._grabbedRenderer.scrollIntoView(false);
					}
				} else {
					sup.apply(this, arguments);
				}
			};
		}),

		_onUpArrow: dcl.superCall(function (sup) {
			return function () {
				if (this._grabbedRenderer) {
					this._updatePlaceholderPosition(this._placeHolderClientRect.top - 1);
					this._grabbedRenderer.style.top = this._placeHolder.offsetTop + "px";
					if (this.getTopDistance(this._grabbedRenderer) < 0) {
						this._grabbedRenderer.scrollIntoView();
					}
				} else {
					sup.apply(this, arguments);
				}
			};
		}),

		_onBlur: dcl.superCall(function (sup) {
			return function () {
				if (this._grabbedRenderer) {
					this._dropItem(true);
				}
				sup.apply(this, arguments);
			};
		}),

		///////////////////////////////
		// Other private methods
		///////////////////////////////

		_refreshAriaGrabbed: function () {
			var renderers = this.containerNode.querySelectorAll("." + this._cssClasses.item);
			for (var i = 0; i < renderers.length; i++) {
				if (this.movable) {
					renderers[i].renderNode.setAttribute("aria-grabbed", false);
				} else {
					renderers[i].renderNode.removeAttribute("aria-grabbed");
				}
			}
		},

		_clearGrabTimeout: function () {
			if (this._grabTimeoutHandle) {
				this._grabTimeoutHandle.remove();
				this._grabTimeoutHandle = null;
			}
		},

		_grabItem: function (renderer, event) {
			// FIXME: THIS SHOULD BE A FEATURE OF pointer: set default action to none when the item is grabbed
			var touchId = event.pointerId - 2;
			if (pointer.touchTracker[touchId]) {
				pointer.touchTracker[touchId]._touchAction = 3; // Action: none
			}
			// ENDOF FIXME
			var rendererItemIndex = this.getItemRendererIndex(renderer);
			this._grabbedRenderer = renderer;
			this._grabbedItemIndex = rendererItemIndex;
			this._dropPosition = this._initialPosition = rendererItemIndex;
			this._setGrabbed(this._grabbedRenderer, true);
			this._placeHolder = this.ownerDocument.createElement("div");
			this._placeHolder.setAttribute("aria-dropeffect", "move");
			this._placeHolder.className = this._cssClasses.item;
			this._placeHolder.style.height = this._grabbedRenderer.offsetHeight + "px";
			this._placePlaceHolder(this._grabbedRenderer, "after");
			this._touchStartY = event.touches ? event.touches[0].pageY : event.pageY;
			this._startTop = domGeometry.getMarginBox(this._grabbedRenderer).t;
		},

		_dropItem: function (cancelMove) {
			if (cancelMove) {
				this._dropPosition = this._initialPosition;
			}
			this._clearGrabTimeout();
			this._removeTouchHandlers();
			if (this._grabbedRenderer) {
				if (this._dropPosition >= 0) {
					if (this._dropPosition !== this._grabbedItemIndex) {
						var next = this._placeHolder.nextElementSibling;
						var beforeId = null;
						if (next && next.item) {
							beforeId = next.item.id;
						}
						var eventToEmit = {
							item: this._grabbedRenderer.item,
							fromIndex: this._grabbedItemIndex,
							toIndex: this._dropPosition,
							beforeId: beforeId
						};
					}
					this._grabbedItemIndex = null;
					this._dropPosition = -1;
				}
				this.defer(function () { // iPhone needs setTimeout (via defer)
					this._setGrabbed(this._grabbedRenderer, false);
					if (cancelMove) {
						this._grabbedRenderer.scrollIntoView();
					}
					this._grabbedRenderer = null;
				});
				this._removeTouchHandlers();
				if (this._placeHolder) {
					this._placeHolder.parentNode.removeChild(this._placeHolder);
					this._placeHolder = null;
				}
				// Emit the event AT THE END, to make sure that the list is clean
				// when accessed from an handler of the event (no placeholder, ...)
				if (eventToEmit) {
					this.emit("item-moved", eventToEmit);
				}
			}
		},

		/* jshint maxcomplexity: 11*/
		_updatePlaceholderPosition: function (clientY, autoScrollEnabled) {
			var nextRenderer, previousRenderer;
			if (clientY < this._placeHolderClientRect.top) {
				previousRenderer = this._getNextRenderer(this._placeHolder, -1);
				if (previousRenderer === this._grabbedRenderer) {
					previousRenderer = this._getNextRenderer(previousRenderer, -1);
				}
				if (previousRenderer) {
					this._placePlaceHolder(previousRenderer, "before");
					this._dropPosition--;
				}
			} else if (clientY > this._placeHolderClientRect.bottom) {
				nextRenderer = this._getNextRenderer(this._placeHolder, 1);
				if (nextRenderer === this._grabbedRenderer) {
					nextRenderer = this._getNextRenderer(nextRenderer, 1);
				}
				if (nextRenderer) {
					this._placePlaceHolder(nextRenderer, "after");
					this._dropPosition++;
				}
			}
			if (autoScrollEnabled) {
				var clientRect = this.getBoundingClientRect();
				if (clientY < clientRect.top + 15) {
					this._autoScroll(-15, clientY);
				} else if (clientY > clientRect.top + clientRect.height - 15) {
					if (this.getBottomDistance(this._placeHolder) <= 0) {
						// Place holder is at the bottom of the list, stop scrolling
						this._cancelAutoScroll();
					} else {
						this._autoScroll(15, clientY);
					}
				} else {
					this._cancelAutoScroll();
				}
			}
		},
		/* jshint maxcomplexity: 10*/

		_autoScroll: function (rate, clientY) {
			this._autoScrollRef = this.defer(function () {
				var oldScroll = this.getCurrentScroll().y;
				this.scrollBy({y: rate});
				this.defer(function () {
					var realRate = this.getCurrentScroll().y - oldScroll;
					if (realRate !== 0) {
						if (this._placeHolder) {
							this._placeHolderClientRect = this._placeHolder.getBoundingClientRect();
							this._startTop += realRate;
							this._grabbedRendererTop += realRate;
							this._grabbedRenderer.style.top = this._grabbedRendererTop + "px";
							this._updatePlaceholderPosition(clientY, true);
						}
					}
				});
			}, 50);
		},

		_cancelAutoScroll: function () {
			if (this._autoScrollRef) {
				this._autoScrollRef.remove();
				this._autoScrollRef = null;
			}
		},

		_removeTouchHandlers: function () {
			this._touchHandlersRefs.forEach(function (handlerRef) {
				handlerRef.remove();
			});
			this._touchHandlersRefs = [];
		},

		_setGrabbed: function (renderer, draggable) {
			if (draggable) {
				domStyle.set(renderer, {
					width: domGeometry.getContentBox(renderer).w + "px",
					top: renderer.offsetTop + "px"
				});
				domClass.add(renderer, "d-list-item-dragged");
				renderer.renderNode.setAttribute("aria-grabbed", "true");
			} else {
				domClass.remove(renderer, "d-list-item-dragged");
				domStyle.set(renderer, {
					width: "",
					top: ""
				});
				renderer.renderNode.setAttribute("aria-grabbed", "false");
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
		},

		///////////////////////////////
		// List methods
		///////////////////////////////

		_createItemRenderer: dcl.superCall(function (sup) {
			return function () {
				var renderer = sup.apply(this, arguments);
				if (this.movable) {
					renderer.renderNode.setAttribute("aria-grabbed", "false");
				}
				return renderer;
			};
		})
	});
});