define(["dcl/dcl",
        "delite/register",
        "dojo/dom-construct",
        "dojo/dom-class",
        "./ItemRendererBase"
], function (dcl, register, domConstruct, domClass, ItemRendererBase) {
	
	// module:
	//		deliteful/list/ItemRenderer

	var ItemRenderer = dcl([ItemRendererBase], {
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
			this._renderNode("text", "labelNode", item ? item.label : null, "d-list-item-label");
			this._renderNode("image", "iconNode", item ? item.icon : null, "d-list-item-icon");
			this._renderNode("text", "rightText", item ? item.rightText : null, "d-list-item-right-text");
			this._renderNode("image", "rightIcon2", item ? item.rightIcon2 : null, "d-list-item-right-icon2");
			this._renderNode("image", "rightIcon", item ? item.rightIcon : null, "d-list-item-right-icon");
			this.setFocusableChildren(this.iconNode, this.labelNode, this.rightText, this.rightIcon2, this.rightIcon);
		},

		//////////// PRIVATE METHODS ///////////////////////////////////////

		_renderNode: function (nodeType, nodeName, data, nodeClass) {
			// summary:
			//		render a node.
			// nodeType: String
			//		"text" for a text node, "image" for an image node.
			// nodeName: String
			//		the name of the attribute to use to store a reference to the node in the renderer.
			// data: String
			//		the data to render (null if there is no data and the node should be deleted).
			//		For a nodeType of "text", data is the text to render.
			//		For a nodeType of "image", data is the path of the image to render
			// nodeClass: String
			//		CSS class for the node.
			// tag:
			//		private
			var dataAttribute = (nodeType === "text" ? "innerHTML" : "src");
			var nodeTag = (nodeType === "text" ? "DIV" : "IMG");
			if (data) {
				if (!this[nodeName]) {
					this[nodeName] = domConstruct.create(nodeTag,
							{id: this.id + nodeName, class: nodeClass, tabindex: -1},
							this.containerNode, 0);
				}
				if (this[nodeName].getAttribute(dataAttribute) !== data) {
					this[nodeName][dataAttribute] = data;
				}
			} else {
				if (this[nodeName]) {
					this[nodeName].parentNode.removeChild(this[nodeName]);
					delete this[nodeName];
				}
			}
		}

	});

	return register("d-list-item", [HTMLElement, ItemRenderer]);
});