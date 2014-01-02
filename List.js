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
	"./List/DefaultEntryRenderer",
	"./List/DefaultCategoryRenderer",
	"./List/ScrollableList",
	"delite/themes/load!./List/themes/{{theme}}/List_css"
], function (dcl, register, lang, when, on, query, dom, domConstruct, domClass, keys, Widget,
		Selection, KeyNav, Invalidating, DefaultEntryRenderer, DefaultCategoryRenderer, ScrollableList) {

	// FIXME: The List is only a container of list entries, I don't think it should inherit from Container
	var List = dcl([Widget, Selection, KeyNav, Invalidating], {

		/////////////////////////////////
		// Public attributes
		/////////////////////////////////

		 // Name of the list entry attribute that define the category of a list entry.
		//  If falsy, the list is not categorized.
		categoryAttribute: "",

		// The widget class to use to render list entries. It MUST extend the deliteful/List/AbstractEntryRenderer class.
		entriesRenderer: DefaultEntryRenderer,

		// The widget class to use to render category headers when the list entries are categorized.
		// It MUST extend the deliteful/List/AbstractEntryRenderer class.
		categoriesRenderer: DefaultCategoryRenderer,

		// The base class that defines the style of the list.
		// Available values are:
		// - "d-round-rect-list" (default), that render a list with rounded corners and left and right margins;
		// - "d-edge-to-edge-list", that render a list with no rounded corners and no left and right margins.
		baseClass: "d-round-rect-list",
		_setBaseClassAttr: function (value) {
			if (this.baseClass !== value) {
				domClass.replace(this, value, this.baseClass);
				this._set("baseClass", value);
			}
		},

		// The selection mode for list entries (see delite/Selection).
		selectionMode: "none",

		/////////////////////////////////
		// Private attributes
		/////////////////////////////////

		_cssClasses: {entry: "d-list-entry",
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

		enteredViewCallback: function () {
			// FIXME: THIS IS A WORKAROUND, BECAUSE Widget.enteredViewCallback IS RESETING THE TAB INDEX TO -1.
			// => WITH THIS WORKAROUND, ANY CUSTOM TABINDEX SET ON A WIDGET NODE IS IGNORED AND REPLACED WITH 0
			this._enteredView = true;
			this.setAttribute("tabindex", "0");
			this.tabIndex = "0";
			domClass.add(this, this.baseClass);
			// END OF WORKAROUND

			// This is not a workaround and should be defined here,
			// when we have the real initial value for this.selectionMode
			// FIXME: WHEN REMOVING THE WORKAROUND, enteredViewCallback must be a dcl.after method
			if (this.selectionMode !== "none") {
				this.on("click", lang.hitch(this, "_handleSelection"));
			}
		},

		startup: function () {
			var i, len, cell, list = this;
			this._store = {
					data: [],
					_queried: false,
					query: function (query, options) {
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
							list._entryAddedHandler(item, beforeIndex >= 0 ? beforeIndex : this.data.length - 1);
						}
						return item;
					},
					remove: function (id) {
						var index = this.data.indexOf(id), item;
						if (index >= 0 && index < this.data.length) {
							item = this.data.splice(index, 1)[0];
							if (this._queried) {
								list._entryDeletedHandler(item, false);
							}
							return true;
						}
					}
			    };
			if (this.childNodes.length > 1) {
				len = this.childNodes.length;
				for (i = 0; i < len; i++) {
					cell = this.firstChild;
					if (cell) {
						if (cell.startup) {
							cell.startup();
						}
						if (cell.entry) {
							this._store.add(cell.entry);
						}
						this._removeNode(cell);
					}
				}
			}
			this._initContent();
		},

		_initContent: function () {
			this._addEntryCells(this._store.query(), "last");
		},

		/*jshint unused:false */
		// TODO: REPLACE BY addEntry METHOD !!!???
		addEntryRenderer: function (widget, insertIndex) {
			var cellAtIndex, options = {};
			if (this._started) { // If widget is not started, the child will be processed later by the start method
				if (insertIndex === "first") {
					insertIndex = 0;
				}
				// TODO: support negative indexes (counting from the last element, where -1 is the last, -2 is the one before that, ...) and "last" ("last" === -1)
				if (insertIndex >= 0) {
					cellAtIndex = this.getEntryCellByIndex(insertIndex);
					if (cellAtIndex) {
						options.before = cellAtIndex.entry;
					}
				}
				if (widget && widget.entry) {
					this._store.add(widget.entry, options);
					// TODO: destroy the widget ?
				}
			} else {
				widget.placeAt(this, insertIndex);
			}
		},

		// TODO: REPLACE BY removeEntry METHOD !!!???
		removeEntryRenderer: function (/*Widget|int*/ widget) {
			var cell = widget;
			if (typeof widget === "number") {
				// TODO: Support negative index (counting from the last element, where -1 is the last, -2 is the one before that, ...) and "first" / "last" ?
				cell = this.getEntryCellByIndex(widget);
			}
			if (cell && cell.entry) {
				this._store.remove(this._store.getIdentity(cell.entry));
			}
		},

		/////////////////////////////////
		// Public methods
		/////////////////////////////////

		// Register a handler for a type of events generated in any of the list cells.
		// Parameters:
		//		event: the type of events ("click", ...)
		//		handler: the event handler
		// When the event handler is called, it receive the list as its first parameter, the event
		// as its second and the index of the list entry displayed in the cell.
		// TODO: WHAT IF THE CELL IS A CATEGORY HEADER ???
		onCellEvent: function (event, handler) {
			var that = this;
			return this.on(event, function (e) {
				var parentCell;
				if (domClass.contains(e.target, this.baseClass)) {
					return;
				} else {
					parentCell = that.getParentCell(e.target);
					if (parentCell) {
						// TODO: Pass the parentCell too ?
						// Or run the handler in the parentCell context and pass the list ?
						// TODO: Pass the parentCell INSTEAD of the entry index,
						// as it contains itself the entry index and the entry ?
						return handler.call(that, e, that.getEntryCellIndex(parentCell));
					}
				}
			});
		},

		getCellByEntry: function (entry) {
			var cells = query("." + this._cssClasses.entry, this.containerNode);
			var cellIndex = cells.map(function (cell) {
									return cell.entry;
								})
								.indexOf(entry);
			if (cellIndex >= 0) {
				return cells[cellIndex];
			}
		},

		getEntryCellByIndex: function (index) {
			var entryCells = query("." + this._cssClasses.entry, this.containerNode);
			var returned = null;
			if (index < entryCells.length) {
				returned = query("." + this._cssClasses.entry, this.containerNode)[index];
			}
			return returned;
		},

		getEntryCellIndex: function (cell) {
			var index = query("." + this._cssClasses.entry, this.containerNode).indexOf(cell);
			return index < 0 ? null : index;
		},

		getParentCell: function (node) {
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

		getIdentity: function (entry) {
			return entry;
		},

		updateRenderers: function (entries) {
			var i = 0, currentEntry, cell;
			if (this.selectionMode !== "none") {
				for (; i < entries.length; i++) {
					currentEntry = entries[i];
					cell = this.getCellByEntry(currentEntry);
					if (cell) {
						domClass.toggle(cell, "d-selected", this.isSelected(currentEntry));
					}
				}
			}
		},

		/////////////////////////////////
		// Private methods
		/////////////////////////////////

		_toggleListLoadingStyle: function () {
			domClass.toggle(this, this._cssClasses.loading);
		},

		_removeNode: function (node) {
			HTMLElement.prototype.removeChild.call(node.parentNode, node);
		},

		/////////////////////////////////
		// Model updates handler
		/////////////////////////////////

		_entryDeletedHandler: function (entry, keepSelection) {
			var cell = this.getCellByEntry(entry);
			if (cell) {
				this._removeCell(cell, keepSelection);
			}
		},

		_entryAddedHandler: function (entry, atIndex) {
			var newCell = this._createEntryCell(entry);
			// FIXME: WHAT ABOUT CATEGORIZED LISTS ???
			this._addEntryCell(newCell, atIndex);
		},

		_entryMovedHandler: function (entry, fromIndex, toIndex) {
			console.log("TODO: Entry " + entry + " moved from index " + fromIndex + " to " + toIndex);
		},

		/////////////////////////////////
		// Private methods for cell life cycle
		/////////////////////////////////

		// FIXME: CATEGORY HEADERS ARE NOT CORRECTLY POSITIONNED WITH THIS ALGORITHM
		_addEntryCells: function (/*Array*/ entries, pos) {
			if (!this.containerNode.firstElementChild) {
				this.containerNode.appendChild(this._createCells(entries, 0, entries.length, null));
			} else {
				if (pos === "first") {
					this.containerNode.insertBefore(this._createCells(entries, 0, entries.length, null),
							this.containerNode.firstElementChild);
				} else if (pos === "last") {
					this.containerNode.appendChild(this._createCells(entries, 0, entries.length,
							this._getLastCell().entry));
				} else {
					console.log("_addEntryCells: only first and last positions are supported.");
				}
			}
		},

		_createCells: function (/*Array*/ entries, fromIndex, count, previousEntry) {
			var currentIndex = fromIndex,
				currentEntry, toIndex = fromIndex + count - 1;
			var documentFragment = document.createDocumentFragment();
			for (; currentIndex <= toIndex; currentIndex++) {
				currentEntry = entries[currentIndex];
				if (this.categoryAttribute) {
					if (!previousEntry
							|| currentEntry[this.categoryAttribute] !== previousEntry[this.categoryAttribute]) {
						documentFragment.appendChild(this._createCategoryCell(currentEntry[this.categoryAttribute]));
					}
				}
				documentFragment.appendChild(this._createEntryCell(currentEntry));
				previousEntry = currentEntry;
			}
			return documentFragment;
		},

		_addEntryCell: function (cell, atEntryIndex) {
			var cellAtIndex = atEntryIndex >= 0 ? this.getEntryCellByIndex(atEntryIndex) : null;
			var previousCell = null, cellCategory, newCategoryCell;
			if (this.categoryAttribute) {
				cellCategory = cell.entry[this.categoryAttribute];
				previousCell = cellAtIndex ? this._getPreviousCell(cellAtIndex) : this._getLastCell();
				if (previousCell) {
					if (previousCell._isCategoryCell) {
						if (cellCategory !== previousCell.category) {
							cellAtIndex = previousCell;
							previousCell = this._getPreviousCell(previousCell);
						}
					}
					if (!previousCell || (!previousCell._isCategoryCell && previousCell.entry[this.categoryAttribute] !== cellCategory)) {
						this.insertBefore(this._createCategoryCell(cellCategory), cellAtIndex);
					}
				} else {
					newCategoryCell = this._createCategoryCell(cellCategory);
					if (cellAtIndex) {
						this.insertBefore(newCategoryCell, cellAtIndex);
					} else {
						this.appendChild(newCategoryCell);
					}
				}
				if (cellAtIndex && !cellAtIndex._isCategoryCell) {
					if (cellAtIndex.entry[this.categoryAttribute] !== cellCategory) {
						newCategoryCell = this._createCategoryCell(cellCategory);
						this.insertBefore(newCategoryCell, cellAtIndex);
						cellAtIndex = newCategoryCell;
					}
				}
			}
			if (cellAtIndex) {
				this.insertBefore(cell, cellAtIndex);
			} else {
				this.appendChild(cell);
			}
		},

		_removeCell: function (cell, keepSelection) {
			// Update category headers before removing the cell, if necessary
			var cellIsCategoryHeader = cell._isCategoryCell,
				nextCell, previousCell, nextFocusCell;
			if (this.categoryAttribute && !cellIsCategoryHeader) {
				previousCell = this._getPreviousCell(cell);
				// remove the previous category header if necessary
				if (previousCell && previousCell._isCategoryCell) {
					nextCell = this._getNextCell(cell);
					if (!nextCell || (nextCell && nextCell._isCategoryCell)) {
						this._removeCell(previousCell);
					}
				}
			}
			// Update focus if necessary
			if (this._getFocusedCell() === cell) {
				nextFocusCell = this._getNext(cell, 1) || this._getNext(cell, -1);
				if (nextFocusCell) {
					this.focusChild(nextFocusCell);
				}
			}
			if (!keepSelection && !cell._isCategoryCell && this.isSelected(cell.entry)) {
				// deselected the entry before removing the cell
				this.setSelected(cell.entry, false);
			}
			// remove and destroy the cell
			this._removeNode(cell);
			cell.destroy();
		},

		_moveCell: function (cell, toIndex) { // This is the same as _addCell !!!
			console.log("TODO: category management for _moveCell ?");
			var cellAtIndex = getEntryCellByIndex(toIndex);
			if (cellAtIndex != null) {
				this.insertBefore(cell, cellAtIndex);
			} else {
				this.appendChild(cell);
			}
		},

		_createEntryCell: function (entry) {
			var cell = new this.entriesRenderer({tabindex: "-1"});
			cell.startup();
			cell.entry = entry;
			if (this.selectionMode !== "none") {
				domClass.toggle(cell, "d-selected", this.isSelected(entry));
			}
			return cell;
		},

		_createCategoryCell: function (category) {
			var cell = new this.categoriesRenderer({category: category, tabindex: "-1"});
			cell.startup();
			return cell;
		},

		_getNextCell: function (cell) {
			return cell.nextElementSibling;
		},

		_getPreviousCell: function (cell) {
			return cell.previousElementSibling;
		},

		_getFirstCell: function () {
			var firstCell = this.getEntryCellByIndex(0);
			if (this.categoryAttribute) {
				var previousCell = null;
				if (firstCell) {
					previousCell = firstCell.previousElementSibling;
					if (previousCell && domClass.contains(previousCell, this._cssClasses.category)) {
						firstCell = previousCell;
					}
				}
			}
			return firstCell;
		},

		_getLastCell: function () {
			var children = this.getChildren(), lastCell = null;
			if (children.length) {
				lastCell = children[children.length - 1];
				while (lastCell
						&& !domClass.contains(lastCell, this._cssClasses.category)
						&& !domClass.contains(lastCell, this._cssClasses.entry)) {
					lastCell = lastCell.previousElementSibling;
				}
			}
			return lastCell;
		},

		/////////////////////////////////
		// Keyboard navigation (KeyNav implementation)
		/////////////////////////////////

		// Handle keydown events
		_onContainerKeydown: dcl.before(function (evt) {
			var continueProcessing = true, cell = this._getFocusedCell();
			if (cell && cell.onKeydown) {
				// onKeydown implementation can return false to cancel the default action
				continueProcessing = cell.onKeydown(evt);
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
			return this._getFirstCell();
		},

		_getLast: function () {
			return this._getLastCell();
		},

		_getNext: function (child, dir) {
			var focusedCell, refChild, returned = null;
			if (this.focusedChild) {
				focusedCell = this._getFocusedCell();
				if (focusedCell === this.focusedChild) {
					// The cell itself has the focus
					refChild = child || this.focusedChild;
					if (refChild) {
						// do not use _nextCell and _previousCell as we want to include the pageloader
						// if it exists
						returned = refChild[(dir === 1) ? "nextElementSibling" : "previousElementSibling"];
					}
				} else {
					// A descendant of the cell has the focus
					// FIXME: can it be a category header, with no _getNextFocusableChild method ?
					returned = focusedCell._getNextFocusableChild(child, dir);
				}
			} else {
				returned = (dir === 1 ? this._getFirst() : this._getLast());
			}
			return returned;
		},

		_onLeftArrow: function () {
			var nextChild;
			if (this._getFocusedCell()._getNextFocusableChild) {
				nextChild = this._getFocusedCell()._getNextFocusableChild(null, -1);
				if (nextChild) {
					this.focusChild(nextChild);
				}
			}
		},

		_onRightArrow: function () {
			var nextChild;
			if (this._getFocusedCell()._getNextFocusableChild) {
				nextChild = this._getFocusedCell()._getNextFocusableChild(null, 1);
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
			var child, cell = this._getFocusedCell();
			if (cell) {
				if (cell === this.focusedChild) {
					child = this._getNext(cell, dir);
					if (!child) {
						child = cell;
					}
				} else {
					child = cell;
				}
				this.focusChild(child);
			}
		},

		_getFocusedCell: function () {
			return this.focusedChild ? this.getParentCell(this.focusedChild) : null;
		},

		/////////////////////////////////
		// Other event handlers
		/////////////////////////////////

		_handleSelection: function (event) {
			var entry, entrySelected, eventCell;
			eventCell = this.getParentCell(event.target || event.srcElement);
			if (eventCell) {
				entry = eventCell.entry;
				if (entry) {
					entrySelected = !this.isSelected(entry);
					this.setSelected(entry, entrySelected);
					this.emit(entrySelected ? "entrySelected" : "entryDeselected", {entry: entry});
				}
			}
		}

	});

	return register("d-list", [HTMLElement, List, ScrollableList]);
});