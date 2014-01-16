define(["dcl/dcl",
        "delite/register",
        "delite/Widget"
], function (dcl, register, Widget) {

	// module:
	//		deliteful/List/ItemRendererBase

	return dcl([Widget], {
		// summary:
		//		Base class for a widget that render an item inside a deliteful/List widget.
		//
		// description:
		//		This base class provide all the infrastructure that a deliteful/List widget
		//		expect from an item renderer, including keyboard navigation support.
		//
		//		A concrete item renderer must extend this class an implement its render method
		//		to render the item inside the container node of the widget (this.containerNode).
		//
		//		Keyboard navigation is defined using the setFocusableChildren method.

		// item: Object
		//		the list item to render.
		item: null,
		_setItemAttr: function (/*Object*/value) {
			this._set("item", value);
			this.render(value);
			// Set a label attribute For text search in keyboard navigation
			this.label = value.label;
		},

		// baseClass: [protected] String
		//		CSS class of an item renderer. This value is expected by the deliteful/List widget
		//		so it must not be changed.
		baseClass: "d-list-item",

		// _focusableChildren: Array
		//		contains the names of all the renderer nodes that can be focused, in the same order
		//		that they are to be focused during keyboard navigation with the left and right arrow
		//		keys. The name of a focusable node is such that this[name] returns the node.
		_focusableChildren: null,

		// _focusedChild: Widget
		//		the renderer child that currently has the focus (null if no child has the focus)
		_focusedChild: null,

		//////////// PROTECTED METHODS ///////////////////////////////////////

		/* jshint unused:vars */
		render: function (/*Object*/item) {
			// summary:
			//		This method must be implemented by the item renderer concrete class.
			//		It should render the item inside the renderer container node
			//		(this.containerNode). It is called every time that the item attribute
			//		of the renderer is assigned to a value, and might be called more than once
			//		during the List life cycle, with a different item value each time.
			// item: Object
			//		The item to render.
			// tags:
			//		protected extension
		},

		setFocusableChildren: function (/*Array*/nodes) {
			// summary:
			//		This method set the list of children of the renderer that can
			//		be focused during keyboard navigation, by keyboard navigation
			//		order. This method is generally called from the render method
			//		implementation, after the focused node have been created and
			//		assigned as named attributes of the renderer.
			// nodeNames: Array
			//		An array that contains the focusable children (dom nodes)
			//		of the renderer, in the order they are focusable using keyboard
			//		navigation.
			// tags:
			//		protected
			var i, node, that = this;
			this._focusableChildren = [];
			this._focusedChild = null;
			for (i = 0; i < nodes.length; i++) {
				node = nodes[i];
				if (node) {
					// this value will then be returned by getNextFocusableChild
					// and processed by delite/KeyNav, that needs a proper delite/Widget
					// value for the child.
					register.dcl.mix(node, new Widget());
					node.onfocus = function () {
						that._focusedChild = this;
					};
					this._focusableChildren.push(node);
				}
			}
		},

		buildRendering: function () {
			// summary:
			//		Create the widget container node, into which an item will be rendered.
			// tags:
			//		protected
			this.containerNode = register.createElement("div");
			this.containerNode.className = "d-list-item-node";
			this.appendChild(this.containerNode);
		},

		destroy: function () {
			// summary:
			//		Destroy the widget.
			// tags:
			//		protected
			var i;
			if (this._focusableChildren) {
				for (i = 0; i < this._focusableChildren.length; i++) {
					if (this._focusableChildren[i]) {
						this._focusableChildren[i].destroy();
					}
				}
			}
		},

		focus: dcl.superCall(function (sup) {
			// summary:
			//		Focus the widget.
			// tags:
			//		protected
			return function () {
				this._focusedChild = null;
				sup.apply(this, arguments);
			};
		}),

		getNextFocusableChild: function (fromChild, dir) {
			// summary:
			//		Get the next renderer child that can be focused using arrow keys.
			// fromChild: Widget
			//		The child from which the next focusable child is requested
			// dir: int
			//		The direction, from fromChild, of the next child: 1 for the child that
			//		comes after in the focusable order, -1 for the child that comes before.
			// tags:
			//		protected
			// returns:
			//		the next focusable child if there is one.
			if (this._focusableChildren) {
				// retrieve the position of the from node
				var nextChildIndex, fromChildIndex = -1, refNode = fromChild || this._focusedChild;
				if (refNode) {
					fromChildIndex = this._focusableChildren.indexOf(refNode);
				}
				if (dir === 1) {
					nextChildIndex = fromChildIndex + 1;
				} else {
					nextChildIndex = fromChildIndex - 1;
				}
				if (nextChildIndex >= this._focusableChildren.length) {
					nextChildIndex = 0;
				} else if (nextChildIndex < 0) {
					nextChildIndex = this._focusableChildren.length - 1;
				}
				return this._focusableChildren[nextChildIndex]; // Widget
			}
		}

	});

});