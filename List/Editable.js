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
        "dojo/touch",
    	"delite/themes/load!./themes/{{theme}}/Editable_css"
], function (dcl, lang, array, on, keys, dom, domClass, domStyle, domConstruct, domGeometry, touch) {

	return dcl(null, {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		moveable: true, // Should be a statefull property

		deleteable: true,  // Should be a statefull property
		
		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_indexOfDeleteableEntry: -1,
		_touchHandlersRefs: null,
		_placeHolder: null,
		_placeHolderClientRect: null,
		_draggedCell: null,
		_touchStartY: null,
		_startTop: null,
		_draggedCellTop: null,
		_draggedEntryIndex: null,
		_dropPosition: -1,

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		setEditableMode: function (moveable, deleteable) {
			this.moveable = moveable;
			this.deleteable = deleteable;
			// TODO: EVENT HANDLERS, RENDERING, ETC...
		},

		// Called before the deletion of an entry through the UI delete action.
		// If it returns false, the entry is not deleted. The entry is deleted
		// if it returns any other value.
		// TODO: RENAME "beforeEntryDelete" or "beforeEntryDeletion" ?
		/*jshint unused:false */
		onEntryDelete: function (entry, entryIndex) {
			// to be implemented
		},

		/*jshint unused:false */
		onEntryMove: function (entry, originalIndex, newIndex) {
			// to be immplemented
		},

		/////////////////////////////////
		// Widget lifecycle
		/////////////////////////////////

		preCreate: dcl.after(function () {
			this._touchHandlersRefs = [];
		}),

		enteredViewCallback: dcl.after(function () {
			if (this.categoryAttribute || (this.pageLength && this.autoLoad)) {
				// moving entries not yet supported on categorized lists or on paginated lists with auto loading
				this.moveable = false;
			}
			if (this.deleteable) {
				this.onCellEvent("click", lang.hitch(this, "_onCellClick"));
			}
			if (this.moveable) {
				this.on(touch.press, lang.hitch(this, "_onEditableTouchPress"));
			}
			this.onCellEvent("keydown", lang.hitch(this, "_onCellKeydown"));
		}),

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
				if (!this.deleteable) { // cannot select / unselect entries while entries are deleteable
					return sup.apply(this, arguments);
				}
			};
		}),

		_createEntryCell: dcl.superCall(function (sup) {
			return function (entry) {
				var cell = sup.apply(this, arguments);
				// This is a new cell
				if (this.deleteable || this.moveable) {
					domConstruct.create("div", {innerHTML: this.moveable
						? "<div class='duiDomButtonGrayKnob' style='cursor: move;'>"
						  + "<div><div><div></div></div></div></div></div>"
						: "<div></div>",
						className: "d-list-entry-right-edit"}, cell);
				}
				if (this.deleteable) {
					domConstruct.create("div", {innerHTML:
						"<div class='duiDomButtonRedCircleMinus' style='cursor: pointer;'>"
						+ "<div><div><div></div></div></div></div></div>",
						className: "d-list-entry-left-edit"}, cell, 0);
				}
				return cell;
			};
		}),

		/////////////////////////////////
		// Private methods
		/////////////////////////////////

		_showDeleteButton: function (entryIndex) {
			// TODO: USE i18n string
			this._setRightEditNodeInnerHTML(entryIndex,
					"<div class='d-list-delete-button'>delete</div>");
		},

		_hideDeleteButton: function (entryIndex) {
			var innerHTML = this.moveable
					? "<div class='duiDomButtonGrayKnob' style='cursor: move;'>"
					  + "<div><div><div></div></div></div></div></div>"
					: "<div></div>";
			this._setRightEditNodeInnerHTML(entryIndex, innerHTML);
		},

		_deleteAtIndex: function (entryIndex) {
			var cell = this.getEntryCellByIndex(entryIndex),
				entry = cell.entry;
			if (this.onEntryDelete(entry, entryIndex) !== false) {
				if (this.store) {
					this.store.remove(this.store.getIdentity(entry));
				} else {
					this._removeCell(cell);
				}
			}
		},

		_setRightEditNodeInnerHTML: function (entryIndex, innerHTML) {
			var cell = this.getEntryCellByIndex(entryIndex);
			if (cell) {
				cell.children[2].innerHTML = innerHTML;
			}
		},

		_isRightEditNodeDescendant: function (node) {
			var currentNode = node;
			while (currentNode) {
				if (domClass.contains(currentNode, "d-list-entry-right-edit")) {
					return true;
				}
				currentNode = currentNode.parentNode;
			}
			return false;
		},

		////////////////////////////////////
		// TODO: KEYBOARD NAVIGATION !!!
		////////////////////////////////////

		_onCellClick: function (evt, entryIndex) {
			var node = evt.target;
			var resetDeleteableEntry = true;
			if (this.deleteable) {
				while (node && !domClass.contains(node, this.baseClass)) {
					if (domClass.contains(node, "d-list-entry-left-edit")) {
						if (this._indexOfDeleteableEntry === entryIndex) {
							// do nothing
							resetDeleteableEntry = false;
							break;
						} else if (this._indexOfDeleteableEntry >= 0) {
							this._hideDeleteButton(this._indexOfDeleteableEntry);
						}
						this._showDeleteButton(entryIndex);
						this._indexOfDeleteableEntry = entryIndex;
						resetDeleteableEntry = false;
						this.focusChild(this.getEntryCellByIndex(entryIndex));
						break;
					} else if (domClass.contains(node, "d-list-entry-right-edit")) {
						if (this._indexOfDeleteableEntry === entryIndex) {
							this._hideDeleteButton(entryIndex);
							this._indexOfDeleteableEntry = -1;
							this._deleteAtIndex(entryIndex);
						}
						break;
					}
					node = node.parentNode;
				}
			}
			if (resetDeleteableEntry && this._indexOfDeleteableEntry >= 0) {
				this._hideDeleteButton(this._indexOfDeleteableEntry);
				this._indexOfDeleteableEntry = -1;
			}
		},

		_onCellKeydown: function (evt, entryIndex) {
			if (entryIndex != null && evt.keyCode === keys.DELETE && this.deleteable) {
				if (this._indexOfDeleteableEntry >= 0) {
					if (this._indexOfDeleteableEntry === entryIndex) {
						this._hideDeleteButton(entryIndex);
						this._indexOfDeleteableEntry = -1;
						this._deleteAtIndex(entryIndex);
					} else {
						this._hideDeleteButton(this._indexOfDeleteableEntry);
						this._showDeleteButton(entryIndex);
						this._indexOfDeleteableEntry = entryIndex;
					}
				} else {
					this._showDeleteButton(entryIndex);
					this._indexOfDeleteableEntry = entryIndex;
				}
			}
			// TODO: implement moving item using keyboard
		},

		///////////////////////////////
		// Moveable implementation
		///////////////////////////////
		
		_onEditableTouchPress: function (event) {
			if (this._draggedCell) {
				return;
			}
			var cell = this.getParentCell(event.target),
				cellEntryIndex = this.getEntryCellIndex(cell);
			if (cell && this._isRightEditNodeDescendant(event.target)) {
				if (cellEntryIndex === this._indexOfDeleteableEntry) {
					return;
				}
				this._draggedCell = cell;
				this._draggedEntryIndex = cellEntryIndex;
				this._dropPosition = cellEntryIndex;
				this._placeHolder = domConstruct.create("div",
						{className: this._cssClasses.entry});
				this._placeHolder.style.height = this._draggedCell.getHeight() + "px";
				this._placePlaceHolder(this._draggedCell, "after");
				this._setDraggable(this._draggedCell, true);
				this._touchStartY = event.touches ? event.touches[0].pageY : event.pageY;
				this._startTop = domGeometry.getMarginBox(this._draggedCell).t;
				this._touchHandlersRefs.push(this.own(on(document, touch.release,
						lang.hitch(this, "_onEditableTouchRelease")))[0]);
				this._touchHandlersRefs.push(this.own(on(document, touch.move,
						lang.hitch(this, "_onEditableTouchMove")))[0]);
				event.preventDefault();
				event.stopPropagation();
			}
		},

		_onEditableTouchMove: function (event) {
			///////////////////////////////////////////////////////////
			// TODO: CATEGORIZED LISTS SUPPORT
			///////////////////////////////////////////////////////////
			var	pageY = event.touches ? event.touches[0].pageY : event.pageY,
				clientY = event.touches ? event.touches[0].clientY : event.clientY;
			this._draggedCellTop = this._startTop + (pageY - this._touchStartY);
			this._stopEditableAutoScroll();
			this._draggedCell.style.top = this._draggedCellTop + "px";
			this._updatePlaceholderPosition(clientY);
			event.preventDefault();
			event.stopPropagation();
		},

		_updatePlaceholderPosition: function (clientY) {
			var nextCell, previousCell;
			if (clientY < this._placeHolderClientRect.top) {
				previousCell = this._getPreviousCell(this._placeHolder);
				if (previousCell === this._draggedCell) {
					previousCell = this._getPreviousCell(previousCell);
				}
				if (previousCell) {
					this._placePlaceHolder(previousCell, "before");
					this._dropPosition--;
				}
			} else if (clientY > this._placeHolderClientRect.bottom) {
				nextCell = this._getNextCell(this._placeHolder);
				if (nextCell === this._draggedCell) {
					nextCell = this._getNextCell(nextCell);
				}
				if (nextCell) {
					this._placePlaceHolder(nextCell, "after");
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
				var oldScroll = this.getScroll();
				this.scrollBy(rate);
				setTimeout(lang.hitch(this, function () {
					var realRate = this.getScroll() - oldScroll;
					if (realRate !== 0) {
						if (this._placeHolder) {
							this._placeHolderClientRect = this._placeHolder.getBoundingClientRect();
							this._startTop += realRate;
							this._draggedCellTop += realRate;
							this._draggedCell.style.top = this._draggedCellTop + "px";
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

		_onEditableTouchRelease: function (event) {
			if (this._draggedCell) {
				if (this._dropPosition >= 0) {
					if (this._dropPosition !== this._draggedEntryIndex) {
						// TODO: ADD A HANDLER THAT IS ABLE TO CANCEL THE MOVE !!!
						if (this.store) {
							console.log("TODO: MOVE ENTRY IN THE STORE (from index " + this._draggedEntryIndex + " to " + this._dropPosition + ")");
						} else {
							this._moveCell(this.getEntryCellByIndex(this._draggedEntryIndex), this._dropPosition)
						}
					}
					this._draggedEntryIndex = null;
					this._dropPosition = -1;
				}
				this.defer(function () { // iPhone needs setTimeout (via defer)
					this._setDraggable(this._draggedCell, false);
					this._draggedCell = null;
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
				domClass.add(node, "d-list-entry-dragged");
			} else {
				domClass.remove(node, "d-list-entry-dragged");
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