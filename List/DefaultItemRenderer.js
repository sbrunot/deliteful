define(["dcl/dcl",
        "delite/register",
        "dojo/dom-construct",
        "dojo/dom-class",
        "./ItemRendererBase"
], function (dcl, register, domConstruct, domClass, ItemRendererBase) {
	
	var DefaultItemRenderer = dcl([ItemRendererBase], {

		renderItem: function (item) {
			this._renderTextNode("labelNode", item ? item.label : null, "d-list-item-label");
			this._renderImageNode("iconNode", item ? item.icon : null, "d-list-item-icon");
			this._renderTextNode("rightText", item ? item.rightText : null, "d-list-item-right-text");
			this._renderImageNode("rightIcon2", item ? item.rightIcon2 : null, "d-list-item-right-icon2");
			this._renderImageNode("rightIcon", item ? item.rightIcon : null, "d-list-item-right-icon");
			this._setFocusableChildren(["iconNode", "labelNode", "rightText", "rightIcon2", "rightIcon"]);
		},

		_renderTextNode: function (nodeName, text, nodeClass) {
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