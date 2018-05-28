ListViewRenderer.js




function ListViewRenderer() {


	var me = this;

	/**
	 * Render simple items, fields, buttons etc.
	 */
	me._renderer = require('../').ViewRenderer.SharedInstance();;
}



var extend = function(a, b) {

	b = b || {};
	Object.keys(b).forEach(function(k) {
		a[k] = b[k];
	});

	return a;
}



ListViewRenderer.prototype.renderSplit = function(container, field) {

	var me=this;

	var left=field.left||false;
	var right=field.right||false;



	var options=extend({
		"left":[80, "pixel"],
		"right":[1, "star"]
	}, field.options||{})

 	var GridLayout = require("ui/layouts/grid-layout").GridLayout;
 	var ItemSpec = require("ui/layouts/grid-layout").ItemSpec ;

	var gridLayout = new GridLayout();
	var firstColumn = new ItemSpec(options.left[0], options.left[1]);
	var secondColumn = new ItemSpec(options.right[0], options.right[1]);
	var firstRow = new ItemSpec(1, "auto");
	gridLayout.addColumn(firstColumn);
	gridLayout.addColumn(secondColumn);
	gridLayout.addRow(firstRow);


	var line=me._renderer._createText({
		"value": "",
		"className":"label"
	});

	GridLayout.setColumn(line, 0);
	GridLayout.setRow(line, 0);
	gridLayout.addChild(line);
	line.className="line";


	// if(!left){
	// 	left={
	// 		"value": "",
	// 		"type":"label"
	// 	};
	// }

	// if(!right){
	// 	right={
	// 		"value": "",
	// 		"type":"label"
	// 	};
	// }


	var stack=me._renderer._createStack();
	me._renderer._renderFields(stack, left);
	left=stack;



	var stack=me._renderer._createStack();
	me._renderer._renderFields(stack, right);
	right=stack;
	



	GridLayout.setColumn(left, 0);
	GridLayout.setRow(left, 0);

	GridLayout.setColumn(right, 1);
	GridLayout.setRow(right, 0);

	gridLayout.addChild(left);
	left.className+=" left";
	gridLayout.addChild(right);
	right.className+=" right";

	container.addChild(gridLayout);
	me._renderer._addClass(gridLayout, field);

	return gridLayout;
}
ListViewRenderer.prototype._prepareTemplate = function(str, template, params) {

	var me = this;

	if(!params){
		params = me._renderer._params();
	}
	
	return me._renderer._getParser().prepareTemplate(str, params, template);

}

ListViewRenderer.prototype.renderList = function(container, field) {
	
	var me=this;
	var list=field;
	if(list.list){
		list=list.list;
	}


	var model=me._renderer._model;
	model.set('listLoading', true);
	
	

	var stack=me._renderer._createStack();

	if(field.pullsToRefresh){
		var pulltorefresh =new (require('nativescript-pulltorefresh').PullToRefresh)();
		container.addChild(pulltorefresh);
		pulltorefresh.content=stack;
	}else{
		container.addChild(stack);
	}


	



	me._renderer._addClass(stack, "list");
	me._renderer._addClass(stack, field);



	me._renderer._renderFields(stack, {
		
		"condition":"{data.listLoading|?}",
		"type":"spinner"
			
	});

	me._resolveList(list).then(function(list){

		try{
			console.log('Resolved list');

			
			model.set('listLoading', false);
			if(list&&list.length>0){
				


				var fieldSetList=me._renderer._parse(list, field.listItemFormat||"{value}");

				if(field.sort){
					fieldSetList=fieldSetList.sort(function(a, b){
						var sa=me._renderer._parse(a, field.sort);
						var sb=me._renderer._parse(b, field.sort);
						//console.log('sort: '+sa+' '+sb);
						return sa>sb?1:0;
						
					})
				}


				if(field.before){
					var fieldsBefore=me._prepareTemplate({list:fieldSetList}, field.before);
					me._renderer._renderFields(stack, fieldsBefore);
				}

				console.log("fieldSetList: "+JSON.stringify(fieldSetList));
				var listItemStack=me._renderer._createStack();
				stack.addChild(listItemStack);
				var renderItemsFieldset=function(fieldSet, i){
						


						var fields=me._prepareTemplate(fieldSet, field.listItemFields);
						//console.log(JSON.stringify(fields, null, '   '));

						try{
							var listItem=list[i];
							
							me._renderer._config().extendDefaultParameters({"item-value":listItem});
							var preparsedFields=me._prepareTemplate(listItem, fields);
							
							me._renderer._renderFields(listItemStack, fields);

						}catch(e){
 							console.log('Some List Item Render Error: '+e+ JSON.stringify(fields, null, '   '));
 							console.error(e);
						}

					
				};

				if(field.listItemFields){

					fieldSetList.splice(0, 10).forEach(renderItemsFieldset);
					var interval=setInterval(function(){
						fieldSetList.splice(0, 10).forEach(renderItemsFieldset);
						if(fieldSetList.length==0){
							clearInterval(interval);
						}
					},2000);

				}else{
					console.log('Did not find field.listItemFields in list template.')
				}
				
				


				if(field.after){

					

					me._renderer._renderFields(stack, field.after);

					
				}

			}


			if (list.length === 0) {
				if(field.empty){
					me._renderer._renderFields(stack, field.empty);
				}
		}

		}catch(e){
			console.log('Some List Error: '+e)
			console.error(e);
		}

	}).catch(function(e){
		console.log('List Error: '+e);
		console.error(e);
	});
	


	return pulltorefresh;

}

ListViewRenderer.prototype.setListResolver = function(name, fn) {
	var me=this;
	if(!me._listResolvers){
		me._listResolvers={};
	}
	me._listResolvers[name]=fn;
}

ListViewRenderer.prototype._resolveList = function(list) {
	var me=this;
	if(typeof list=='string'){
		var args=[];
		var promise = me._listResolvers[list].apply(null, args);
		console.log('Return Promise');
		return promise;
	}

	return new Promise(function(resolve){
		resolve(list);
	});
}

module.exports = ListViewRenderer;

