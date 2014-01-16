define(["dcl/dcl",
        "delite/register",
        "dojo/dom-construct",
        "dojo/dom-class",
        "./ItemRendererBase"
], function (dcl, register, domConstruct, domClass, ItemRendererBase) {
	
	// module:
	//		deliteful/list/DefaultItemRenderer

	var DefaultItemRenderer = dcl([ItemRendererBase], {
		// summary:
		//		Default item renderer for the deliteful/list/List widget.
		//
		// description:
		//		This renderer renders generic items that can have any of the following attributes (display
		//		position of the rendering described for LTR direction) :
		//		- icon: path to an image to render as an icon on the left side of the list item.
		//				Rendered with CSS class d-list-item-icon;
		//		- label: string to render on the left side of the node, after the icon.
		//				Rendered with CSS class d-list-item-label;
		//		- rightText: string to render of the right side if the node.
		//				Rendered with CSS class d-list-item-right-text;
		//		- rightIcon2: path to an image to render as icon on the right side, after the right text. 
		//				Rendered with CSS class d-list-item-right-icon2;
		//		- rightIcon: path to an image to render as icon on the right side, after rightIcon2. 
		//				Rendered with CSS class d-list-item-right-icon;
		//		All the nodes that renders the attributes are focusable with keyboard navigation (using left and
		//		right arrows).

		//////////// PROTECTED METHODS ///////////////////////////////////////

		render: function (item) {
			// summary:
			//		render the item.
			// item: Object
			//		The item to render.
			// tags:
			//		protected
			this._renderTextNode("labelNode", item ? item.label : null, "d-list-item-label");
			this._renderImageNode("iconNode", item ? item.icon : null, "d-list-item-icon");
			this._renderTextNode("rightText", item ? item.rightText : null, "d-list-item-right-text");
			this._renderImageNode("rightIcon2", item ? item.rightIcon2 : null, "d-list-item-right-icon2");
			this._renderImageNode("rightIcon", item ? item.rightIcon : null, "d-list-item-right-icon");
			this.setFocusableChildren([this.iconNode, this.labelNode, this.rightText, this.rightIcon2, this.rightIcon]);
		},

		//////////// PRIVATE METHODS ///////////////////////////////////////

		_renderTextNode: function (nodeName, text, nodeClass) {
			// summary:
			//		render a text node.
			// nodeName: String
			//		the name of the attribute to use to store a reference to the node in the renderer.
			// text: String
			//		the text to render (null if there is no text and the node should be deleted).
			// nodeClass: String
			//		CSS class for the node.
			// tag:
			//		private
			if (text) {
				if (this[nodeName]) {
					this[nodeName].innerHTML = text;
				} else {
					this[nodeName] = domConstruct.create("DIV",
							{id: this.id + nodeName, innerHTML: text, class: nodeClass, tabindex: -1},
							this.containerNode, 0);
				}
			} else {
				if (this[nodeName]) {
					this[nodeName].parentNode.removeChild(this[nodeName]);
					delete this[nodeName];
				}
			}
		},

		_renderImageNode: function (nodeName, image, nodeClass) {
			// summary:
			//		render an image node.
			// nodeName: String
			//		the name of the attribute to use to store a reference to the node in the renderer.
			// image: String
			//		path of the image to render.
			// nodeClass: String
			//		CSS class for the node.
			// tags:
			//		private
			if (image) {
				if (this[nodeName]) {
					if (this[nodeName].getAttribute("src") !== image) {
						this[nodeName].src = image;
					}
				} else {
					this[nodeName] = domConstruct.create("IMG",
							{id: this.id + nodeName, src: image, class: nodeClass, tabindex: -1},
							this.containerNode, 0);
				}
			} else {
				if (this[nodeName]) {
					this[nodeName].parentNode.removeChild(this[nodeName]);
					delete this[nodeName];
				}
			}
		}

	});

	return register("d-list-item", [HTMLElement, DefaultItemRenderer]);
});