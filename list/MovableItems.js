/** @module deliteful/list/MovableItems */
define(["dcl/dcl",
    "decor/sniff",
    "delite/keys",
    "dojo/dom-class",
    "dpointer/events",
    "./List",
    "delite/theme!./List/themes/{{theme}}/Editable.css" // FIXME: USES MOVABLE.css INSTEAD OF EDITABLE.css ?
], function (dcl, has, keys, domClass, pointer, List) {

	// TODO: HOW TO CANCEL A MOVE WHEN USING A TOUCH DEVICE (EQUIVALENT TO KEYBOARD ESC) ?
	/**
	 * A mixin for {@link module:deliteful/List} that allows user interactions to move items from within the list.
	 * Note that this mixin doesn't allows moving items in a categorized list, and does not apply
	 * to {@link module:deliteful/PageableList}. 
	 * 
	 * When items are movable, this mixin support two different user interactions to grab an item:
	 * 1. the user can grab an item by clicking on a move handle on the item renderer. Each time
	 * a pointer down event is received on an item renderer, the method {@link #isGrabEvent} returns
	 * a boolean value that indicates if the item should be grabbed as a result of the event. The default
	 * implementation checks if the target of the event has the css class defined by property
	 * {@link #grabHandleClass};
	 * 2. the user can grab an item by doing a long press on it. The duration of the press is defined
	 * by property {@linkl #grabPressDuration}
	 * 
	 * @class module:deliteful/list/MovableItems
	 * @augments module:deliteful/list/List
	 */
	return dcl(List, {

		/**
		 * Indicates whether items can me moved around in the list or not.
		 * Allows to switch between a mode where items cannot be moved and
		 * a mode where items can be moved.
		 * @member {boolean}
		 * @default true
		 */
		movable: true,

		_setMovableAttr: function (value) {
			if (value && (this._isCategorized())) {
				throw new Error("items of a categorized list cannot be moved.");
			} else {
				this._set("movable", value);
			}
		},

		/**
		 * CSS class of item renderer elements that can be clicked to grab the item.
		 * @member {string}
		 * @default ""
		 */
		grabHandleClass: "",

		/**
		 * Duration of a long press on an item renderer to grab the item. A value
		 * of 0 means that an item cannot be grabbed with a long press on the renderer.
		 * @member {number}
		 * @default 1000
		 */
		grabPressDuration: 1000,

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		/*
		_autoScrollRef: null,
		_pointerdownHandlerRef: null,
		_touchHandlersRefs: null,
		_dropZone: null,
		_dropZoneClientRect: null,
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

		attachedCallback: dcl.after(function () {
			if (this._isCategorized()) {
				// moving items not yet supported on categorized lists
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

		//////////// Public methods ///////////////////////////////////////

		/**
		 * This method is called when a pointerdown event is received on an item renderer.
		 * If it returns true, the corresponding item becomes movable.
		 * @param {Event} event the pointerdown event
		 * @returns {boolean}
		 */
		isGrabEvent: function (event) {
			if (this.grabHandleClass) {
				return domClass.contains(event.target, this.grabHandleClass);
			}
			return false;
		},

		//////////// Pointer events handlers (private) ///////////////////////////////////////

		_pointerdownHandler: function (event) {
			if (this._grabbedRenderer) {
				return;
			}
			var renderer = this.getEnclosingRenderer(event.target);
			if (renderer) {
				if (this.isGrabEvent(event)) {
					this._grabItem(renderer, event);
				} else if (this.grabPressDuration) {
					this._grabTimer = this.defer(function () {
						this._grabTimer = null;
						this._grabItem(renderer, event);
					}, this.grabPressDuration);
				} else {
					return;
				}
				this._touchHandlersRefs = [
				    this.on("pointerup", this._pointerupHandler.bind(this), document),
                    this.on("pointermove", this._pointermoveHandler.bind(this), document),
                    this.on("pointercancel", this._pointercancelHandler.bind(this), document)
                ];
			}
			// On safari desktop, avoid the default scroll behavior (click and move to the top or bottom => scroll)
			// that causes auto scroll issues.
			// FIXME: THEY ARE STILL AUTO SCROLL ISSUES ON ANDROID 4.4.2 stock browser
			if (has("safari") && !has("ios")) {
				// FIXME: THIS IS TRIGGERED ON ANDROID PLATFORM
				// Issue created: https://github.com/ibm-js/decor/issues/24
				event.preventDefault();
			}
		},

		_pointercancelHandler: function () {
			this._clearGrabTimer();
			this._removeTouchHandlers();
		},

		_pointerupHandler: function () {
			this._dropItem();
		},

		_pointermoveHandler: function (event) {
			this._clearGrabTimer();
			if (this._grabbedRenderer) {
				this._grabbedRendererTop = this._startTop + (event.pageY - this._touchStartY);
				this._cancelAutoScroll();
				this._grabbedRenderer.style.top = this._grabbedRendererTop + "px";
				this._updateDropZonePosition(event.clientY, true);
				// Needed to avoid the default scroll behavior (click and move to the top or bottom => scroll)
				// on some browsers
				event.preventDefault();
			}
		},

		//////////// Keyboard navigation ///////////////////////////////////////

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
					this._updateDropZonePosition(this._dropZoneClientRect.bottom + 1);
					this._grabbedRenderer.style.top = this._dropZone.offsetTop + "px";
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
					this._updateDropZonePosition(this._dropZoneClientRect.top - 1);
					this._grabbedRenderer.style.top = this._dropZone.offsetTop + "px";
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

		//////////// Other private methods ///////////////////////////////////////

		// TODO: some of these methods should be protected to allow custom implementations ?

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

		_clearGrabTimer: function () {
			if (this._grabTimer) {
				this._grabTimer.remove();
				this._grabTimer = null;
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
			this._dropZone = this.ownerDocument.createElement("div");
			this._dropZone.setAttribute("aria-dropeffect", "move");
			this._dropZone.className = this._cssClasses.item;
			this._dropZone.style.height = this._grabbedRenderer.offsetHeight + "px";
			this._placeDropZone(this._grabbedRenderer, "after");
			this._touchStartY = event.pageY;
			this._setGrabbed(this._grabbedRenderer, true);
			this._startTop = this._grabbedRenderer.offsetTop;
		},

		_dropItem: function (cancelMove) {
			if (cancelMove) {
				this._dropPosition = this._initialPosition;
			}
			this._clearGrabTimer();
			this._removeTouchHandlers();
			if (this._grabbedRenderer) {
				if (this._dropPosition >= 0) {
					if (this._dropPosition !== this._grabbedItemIndex) {
						var next = this._dropZone.nextElementSibling;
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
				if (this._dropZone) {
					this._dropZone.parentNode.removeChild(this._dropZone);
					this._dropZone = null;
				}
				// Emit the event AT THE END, to make sure that the list is clean
				// when accessed from an handler of the event (no drop zone, ...)
				if (eventToEmit) {
					this.emit("item-moved", eventToEmit);
				}
			}
		},

		/* jshint maxcomplexity: 11*/
		_updateDropZonePosition: function (clientY, autoScrollEnabled) {
			var nextRenderer, previousRenderer;
			if (clientY < this._dropZoneClientRect.top) {
				previousRenderer = this._getNextRenderer(this._dropZone, -1);
				if (previousRenderer === this._grabbedRenderer) {
					previousRenderer = this._getNextRenderer(previousRenderer, -1);
				}
				if (previousRenderer) {
					this._placeDropZone(previousRenderer, "before");
					this._dropPosition--;
				}
			} else if (clientY > this._dropZoneClientRect.bottom) {
				nextRenderer = this._getNextRenderer(this._dropZone, 1);
				if (nextRenderer === this._grabbedRenderer) {
					nextRenderer = this._getNextRenderer(nextRenderer, 1);
				}
				if (nextRenderer) {
					this._placeDropZone(nextRenderer, "after");
					this._dropPosition++;
				}
			}
			if (autoScrollEnabled) {
				// TODO: maybe we should have variable autoscroll speed,
				// depending on how far from edges the pointer is ?
				var clientRect = this.getBoundingClientRect();
				if (clientY < clientRect.top + 15) {
					this._autoScroll(-15, clientY);
				} else if (clientY > clientRect.top + clientRect.height - 15) {
					if (this.getBottomDistance(this._dropZone) <= 0) {
						// Drop zone is at the bottom of the list, stop scrolling
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
			this._cancelAutoScroll();
			this._autoScrollRef = this.defer(function () {
				var oldScroll = this.getCurrentScroll().y;
				this.scrollBy({y: rate});
				this.defer(function () {
					var realRate = this.getCurrentScroll().y - oldScroll;
					if (realRate !== 0) {
						if (this._dropZone) {
							this._dropZoneClientRect = this._dropZone.getBoundingClientRect();
							this._startTop += realRate;
							this._grabbedRendererTop += realRate;
							this._grabbedRenderer.style.top = this._grabbedRendererTop + "px";
							this._updateDropZonePosition(clientY, true);
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
			if (this._touchHandlersRefs) {
				this._touchHandlersRefs.forEach(function (handlerRef) {
					handlerRef.remove();
				});
				this._touchHandlersRefs = null;
			}
		},

		_setGrabbed: function (renderer, draggable) {
			if (draggable) {
				dcl.mix(renderer.style, {
					width: renderer.offsetWidth + "px",
					top: renderer.offsetTop + "px"
				});
				domClass.add(renderer, "d-list-item-dragged");
				renderer.renderNode.setAttribute("aria-grabbed", "true");
			} else {
				domClass.remove(renderer, "d-list-item-dragged");
				dcl.mix(renderer.style, {
					width: "",
					top: ""
				});
				renderer.renderNode.setAttribute("aria-grabbed", "false");
			}
			this.disableTouchScroll = draggable;
		},

		_placeDropZone: function (refNode, pos) {
			refNode.parentElement.insertBefore(this._dropZone, pos === "before" ? refNode : refNode.nextSibling);
			this._dropZoneClientRect = this._dropZone.getBoundingClientRect();
		},

		//////////// List methods ///////////////////////////////////////

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