"use strict";

/*global require*/

var editor = require("./js/editor.js"),
    d3 = require("d3"),
    bar = editor(
	d3.select(document.body)
    );

bar(
    d3.select("#first"),
    function(d, i, content) {
	console.log("changed #first");
    }
);

bar(
    d3.select("#second"),
    function(d, i, content) {
	console.log("changed #second");
    }
);

