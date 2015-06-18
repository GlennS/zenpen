"use strict";

/*global module, require, setTimeout*/

var d3 = require("d3"),
    /*
     Off-screen position - a quick way to hide things.
     */
    nowhere = "-999px",
    editable = "editable-text";

var findNodes = function(element) {
    var nodeNames = {};
    nodeNames[editable] = false;

    // Internal node?
    var selection = window.getSelection();

    while (element.parentNode) {
	nodeNames[element.nodeName] = true;
	element = element.parentNode;

	if (element.nodeName === 'A') {
	    nodeNames.url = element.href;
	}

	if (element !== document && d3.select(element).classed(editable)) {
	    nodeNames[editable] = element;
	}
    }

    return nodeNames;
},

    hasNode = function(nodeList, name) {
	return !!nodeList[name];
    },

    anchorAttr = function(a) {
	if (a.tagName.toLowerCase() === "a") {
	    if (!a.getAttribute("contentEditable")) {
		a.setAttribute("contentEditable", false);
	    }
	    
	    if (!a.getAttribute("target")) {
		a.setAttribute("target", "_top");
	    }
	}
    };

/*
 Makes an editor toolbar.
 A toolbar may be shared between multiple elements by calling this function for each of them.
 */
module.exports = function(container) {
    var composing = false,
	onCompositionStart = function() {
	    composing = true;
	},

	onCompositionEnd = function() {
	    composing = false;
	},

	/*
	 Last selection is a temporary holiding place for a range (useful when we have to get some user input before operating on that range).
	 Last type is a boolean.
	 */
	lastSelection,
	lastType,

	rehighlightLastSelection = function() {
	    window.getSelection().addRange(lastSelection);
	},

	/*
	 Make toolbar HTML elements.
	 */
	textOptions = container
	    .append("div")
	    .classed("text-options", true),
	optionsBox = textOptions.append("div")
	    .classed("options", true),
	noOverflow = optionsBox.append("span")
	    .classed("no-overflow", true),
	lengthenUIInputs = noOverflow.append("span")
	    .classed("lengthen ui-inputs", true),

	onChange = function() {
	    if (currentNodeList[editable]) {
		currentNodeList[editable].onChange();
	    }
	},

	onBoldClick = function() {
	    document.execCommand('bold', false);
	},
	
	onItalicClick = function() {
	    document.execCommand('italic', false);
	},

	onQuoteClick = function() {
	    var nodeNames = findNodes(window.getSelection().focusNode);

	    if (hasNode(nodeNames, 'BLOCKQUOTE')) {
		document.execCommand('formatBlock', false, 'p');
		document.execCommand('outdent');
	    } else {
		document.execCommand('formatBlock', false, 'blockquote');
	    }
	},

	onUrlClick = function(d, i) {
	    if (optionsBox.classed("url-mode")) {
		optionsBox.classed("url-mode", false);

	    } else {
		optionsBox.classed("url-mode", true);

		// Set timeout here to debounce the focus action
		setTimeout(
		    function() {
			var nodeNames = findNodes(window.getSelection().focusNode);
			
			if (hasNode(nodeNames , "A")) {
			    urlInput.node().value = nodeNames.url;
			} else {
			    // Symbolize text turning into a link, which is temporary, and will never be seen.
			    document.execCommand('createLink', false, '/');
			}

			// Since typing in the input box kills the highlighted text we need
			// to save this selection, to add the url link if it is provided.
			lastSelection = window.getSelection().getRangeAt(0);
			lastType = false;

			urlInput.node().focus();
		    },
		    100
		);		
	    }
	},

	onUrlInputKeyDown = function(d, i) {
	    if (d3.event.keyCode === 13) {
		d3.event.preventDefault();
		applyURL(urlInput.node().value);
		urlInput.node().blur();
	    }
	},

	onUrlInputBlur = function() {
	    optionsBox.classed("url-mode", false);
	    applyURL(urlInput.node().value);
	    urlInput.node().value = '';

	    currentNodeList = findNodes(window.getSelection().focusNode);
	    updateBubbleStates();
	},	

	urlButton = lengthenUIInputs.append("button")
	    .classed("url", true)
	    .classed("useicons", true)
	    .on("mousedown", onUrlClick)
	    .html("&#xe005;"),

	urlInput = lengthenUIInputs.append("input")
	    .classed("url-input", true)
	    .attr("type", "text")
	    .attr("placeholder", "Type or Paste URL here")
	    .on("blur", onUrlInputBlur)
	    .on("keydown", onUrlInputKeyDown),
	
	boldButton = lengthenUIInputs.append("button")
	    .classed("bold", true)
	    .on("click", onBoldClick)
	    .text("b"),

	italicButton = lengthenUIInputs.append("button")
	    .classed("italic", true)
	    .on("click", onItalicClick)
	    .text("i"),

	quoteButton = lengthenUIInputs.append("button")
	    .classed("quote", true)
	    .on("click", onQuoteClick)
	    .html("&rdquo;"),

	updateBubblePosition = function() {
	    var selection = window.getSelection();

	    if (selection.isCollapsed === "Range") {
		onSelectorBlur();
	    } else {
		var range = selection.getRangeAt(0),
		    boundary = range.getBoundingClientRect();
		
		textOptions.style("top", boundary.top - 5 + window.pageYOffset + "px");
		textOptions.style("left", (boundary.left + boundary.right)/2 + "px");
	    }
	},

	currentNodeList,
	
	updateBubbleStates = function() {
	    d3.map({
		'B': boldButton,
		'I': italicButton,
		'BLOCKQUOTE': quoteButton,
		'A': urlButton
	    }).forEach(function(element, button) {
		button.classed(
		    "active",
		    hasNode(currentNodeList, element)
		);
	    });
	    
	},

	checkTextHighlighting = function() {
	    var selection = window.getSelection();

	    if (d3.event) {
		var target = d3.select(d3.event.target || d3.event.toElement);

		if (target.classed("url-input") ||
		    target.classed("url")) {
		    
		    currentNodeList = findNodes(selection.focusNode);
		    updateBubbleStates();
		    return;
		}
	    }
	    
	    // Check selections exist
	    if (selection.isCollapsed === true && lastType === false) {
		onSelectorBlur();
	    }

	    // Text is selected
	    if (selection.isCollapsed === false && composing === false) {

		currentNodeList = findNodes(selection.focusNode);

		// Find if highlighting is in the editable area
		if (hasNode(currentNodeList, editable)) {
		    updateBubbleStates();
		    updateBubblePosition();

		    // Show the ui bubble
		    textOptions.classed("active", true);
		}
	    }

	    lastType = selection.isCollapsed;
	},

	onSelectorBlur = function() {
	    textOptions.classed("fade", true);
	    setTimeout(
		function() {
		    if (textOptions.classed("fade")) {
			textOptions.classed("fade", false)
			    .style("top", nowhere)
			    .style("left", nowhere);
		    }
		},
		260
	    );
	},

	createEventBindings = function() {
	    document.body.addEventListener('scroll', function() {
		updateBubblePosition();
	    });

	    window.addEventListener('resize', function(event) {
		updateBubblePosition();
	    });	    

	    // Composition bindings. We need them to distinguish
	    // IME composition from text selection
	    document.addEventListener('compositionstart', onCompositionStart);
	    document.addEventListener('compositionend', onCompositionEnd);
	},

	applyURL = function(url) {
	    rehighlightLastSelection();

	    // Unlink any current links
	    document.execCommand('unlink', false);

	    if (url !== "") {

		// Insert HTTP if it doesn't exist.
		if (!url.match("^(http|https)://")) {

		    url = "http://" + url;	
		} 

		document.execCommand('createLink', false, url);

		var resultRange = document.getSelection().getRangeAt(0);

		if (resultRange.startContainer === resultRange.endContainer) {
		    anchorAttr(
			resultRange.commonAncestorContainer.parentNode
		    );
		    
		} else {
		    Array.prototype.forEach.call(
			resultRange.commonAncestorContainer.querySelectorAll("a"),
			anchorAttr
		    );
		}
	    }

	    onChange();
	};

    createEventBindings();

    /*
     Connects the toolbar to an element.
     */
    var m = function(documents, onChange)  {
	documents.attr("contenteditable", true)
	    .classed(editable, true)
	    .on("input", function(d, i) {
		this.onChange();
	    })
	    .on("keyup", function(d, i) {
		d3.event.stopPropagation();
		checkTextHighlighting();
	    })
	    .on("mousedown", function(d, i) {
		d3.event.stopPropagation();
		checkTextHighlighting();
	    })
	    .on("mouseup", function(d, i) {
		setTimeout(
		    function() {
			checkTextHighlighting();
		    },
		    1
		);		
	    })
	    .each(function(d, i) {
		var el = d3.select(this);

		/*
		 We'll hang our update function on the dom element itself.
		 */
		this.onChange = function() {
		    if (onChange) {
			onChange(el.datum(), null, el.html());
		    }
		};
	    });
    };

    m.update = function() {
	updateBubblePosition();
    };

    m.hide = function() {
	onSelectorBlur();
    };

    return m;
};
