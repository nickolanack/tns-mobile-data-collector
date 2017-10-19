"use strict";



var labelModule = require("ui/label");
var imageModule = require("ui/image");
var ImageSource = require("image-source");

var gridLayoutModule = require("ui/layouts/grid-layout");
var stackLayoutModule = require("ui/layouts/stack-layout");

var GridLayout = gridLayoutModule.GridLayout;
var ItemSpec = gridLayoutModule.ItemSpec ;
var renderLabel = function(field) {



	var label = new labelModule.Label();
	label.text = field.value;
	label.className = "label";
	return label;

}

var renderHeading = function(field) {

	var label = new labelModule.Label();
	label.text = field.value;
	label.className = "heading";
	return label;

}

var renderImage = function(url) {
	var image = new imageModule.Image();
	var src='https://' + global.client.getUrl() + "/" + url;

	if(url[0]==="~"){
		src=url;
	}

	image.src = src
	return image;
}

var renderStack = function(items) {
	var stackLayout = new stackLayoutModule.StackLayout();

	items.forEach(function(item){
		stackLayout.addChild(item);
	})

	return stackLayout;
}

var grid = function(container, left, right) {

	var gridLayout = new GridLayout();
	var firstColumn = new ItemSpec(80, "pixel");
	var secondColumn = new ItemSpec(1, "star");
	var firstRow = new ItemSpec(1, "auto");
	gridLayout.addColumn(firstColumn);
	gridLayout.addColumn(secondColumn);
	gridLayout.addRow(firstRow);


	var line=renderLabel({
			"value": ""
		});

	GridLayout.setColumn(line, 0);
	GridLayout.setRow(line, 0);
	gridLayout.addChild(line);
	line.className="line";


	if(!left){
		left=renderLabel({
			"value": ""
		});
	}

	if(!right){
		right=renderLabel({
			"value": ""
		});
	}




	GridLayout.setColumn(left, 0);
	GridLayout.setRow(left, 0);

	GridLayout.setColumn(right, 1);
	GridLayout.setRow(right, 0);

	gridLayout.addChild(left);
	left.className+=" left";
	gridLayout.addChild(right);
	right.className+=" right";

	container.addChild(gridLayout);
	return gridLayout;
}



var renderList = function(list, container, model, page) {

	var moment = require('moment');


	grid(container, null, renderLabel({
				"value": "Today, "+moment().format('dddd MMMM Do')
			})).className="first";

	list.forEach(function(item) {

		console.log('render item ' + item.name);

		console.log(JSON.stringify(item, null, '   '));
		console.log(JSON.stringify(images, null, '   '));

		console.log(container);

		
		
		var time=renderLabel({
			"value": /*" #" + Math.round(((item.id * 1.3) + 99999)) + ' ' +*/ moment(item.creationDate+" GMT-0000").fromNow()
		});
		time.className+=" time";
		grid(container, null, time);


		var Parser = require('./HtmlParser.js');
		var images = Parser.ParseImages(item.description);

		
	


		var stack=renderStack([
			renderHeading({
				"value": item.name
			}),
			renderLabel({
				"value": item.point[0]+', '+item.point[1]
			}),
			renderImage(images[0].url)
		]);
		stack.className+=" item";
		grid(container, renderImage(item.icon), stack);


		


	});
	
	grid(container, renderImage("~/bcwf-logo-filled-140.png"),renderLabel({
			"value": "Created Account, "+moment(global.configuration.getLocalDataModifiedDate("account")).fromNow()
		})).className="second-last";
	grid(container, null,null).className="last";


	if (list.length === 0) {
		
	}

}

function ListViewRenderer(container) {
	var me=this;
	var emptyLabel=renderLabel({
			"value": "loading"
	});
	//var empty=renderStack([emptyLabel]);
	//empty.className="empty";
	container.addChild(emptyLabel);
	//me.empty=empty;
	me.emptyLabel=emptyLabel;
};

ListViewRenderer.prototype.renderList = function(list, container, model, page) {
	var me=this;
	if(list.length){
		container.removeChild(me.emptyLabel);
		renderList(list, container, model, page);
		console.log('rendered list');
	}else{
		me.emptyLabel.text="You have not created any reports";
	}
	
}

module.exports = ListViewRenderer;