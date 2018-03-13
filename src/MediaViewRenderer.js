"use strict";



function MediaViewRenderer() {


	var me = this;

	/**
	 * Render simple items, fields, buttons etc.
	 */
	me._renderer = require('../').ViewRenderer.SharedInstance();;
}


var extend = function() {


	var a=arguments[0];
	var items=Array.prototype.slice.call(arguments, 1);

	items.forEach(function(b){
		b = b || {};
		Object.keys(b).forEach(function(k) {
			a[k] = b[k];
		});
	})
	

	return a;
}


MediaViewRenderer.prototype.renderMediaPicker = function(container, field) {

	var me = this;

	var wrapLayoutModule = require("ui/layouts/wrap-layout");
	var imageModule = require("ui/image");


	var mediaSelection = new wrapLayoutModule.WrapLayout();

	me._renderer._addClass(mediaSelection, "media-selection")
	me._renderer._addClass(mediaSelection, field);
	container.addChild(mediaSelection);

	var mediaOptions = extend({

		showImage: true,
		showVideo: false,
		showAudio: false,

		labelForImage: "Add Image",
		labelForVideo: "Add Video",
		labelForAudio: "Add Audio"



	}, field);

	var hideButton = function() {

		/**
		 * can only hide button is media is required (automatically enter picker without tap)
		 * and limit is 1.
		 */

		return mediaOptions.hideButton && mediaOptions.required && mediaOptions.limit == 1;
	}

	var imageAssets = [];

	var assets=me._renderer._model.get(field.name);
	console.log('Assets ('+field.name+'): '+JSON.stringify(assets, null, '   '));
	if(assets&&assets.length){
		imageAssets=assets;
	}else{
		me._renderer._model.set(field.name, imageAssets);
	}

	

	if (mediaOptions.showImage || mediaOptions.showVideo) {



		require('../').DataAcquisitionApplication.SharedInstance().requireAccessToCamera().then(function(camera) {



			var renderImageAsset=function(imageAsset, imagePath){

				console.log('renderImageAsset '+imageAsset+':'+imagePath);

				//var imageAssetModule = require("tns-core-modules/image-asset/image-asset");

				var assetName = false;
				if(!imagePath){

					me._storeAsset(imageAsset).then(function(name) {
						imagePath = name;
						imageAssets.push(name);
						me._renderer._model.set(field.name, imageAssets);
					});

				}

				//TODO: force ios refresh after append image!!

				var buttonset = me._renderer.renderButtonset(mediaSelection, {
					"className": 'image-selection',
					"buttons": [{
						"icon": imageAsset,
						"stretch": "aspectFill",
						"className": "image-icon",
						"action": "form",
						"name": "image-viewer",
						"fields": [{
							"type": "image",
							"image": function() {
								return imagePath;
							}
						}]

					}, {
						"icon": "remove-media",
						"className": "remove-media",
						"action": function() {
							mediaSelection.removeChild(buttonset);
							var i = imageAssets.indexOf(imagePath);
							if (i >= 0) {
								imageAssets.splice(i, 1);
								me._renderer._model.set(field.name, imageAssets);


								if (field.required && imageAssets.length == 0) {
									addPhoto();
								}
							}
						}
					}]
				});
			}



			var addPhoto = function() {


				camera.takePicture({
						cameraFacing:(!!field.selfie)?"front":"back",
						width: 500,
						height: 500,
						keepAspectRatio: true,
						saveToGallery: true
					})
					.then(function(imageAsset) {

						renderImageAsset(imageAsset);

					}).catch(function(err) {
						console.log("Camera Error -> " + err);
					});
			}


			var addVideo = function() {

				console.log("add video");
				var video = require("nativescript-videorecorder");
				var videorecorder = new video.VideoRecorder();
				var options = {
					saveToGallery: false, //!!require('application').android,
					duration: 60, //(seconds) default no limit | optional
					format: 'mp4', //allows videos to be played on android devices | optional | recommended for cross platform apps
					size: 10, //(MB) default none | optional #android
					hd: true, //default false low res | optional
					explanation: "Required to add video content to your stories" //optional on api 23 #android
				}

				videorecorder.record(options)
					.then((data) => {
						console.log(data.file)

						/*
						 
						 
						 */


						imageAssets.push(data.file);
						me._renderer._model.set(field.name, imageAssets);

						var buttonset = me._renderer.renderButtonset(mediaSelection, {
							"buttons": [{
								"icon": "video-icon",
								"className": "video-icon",
								"action": "form",
								"name": "video-viewer",
								"fields": [{
									"type": "video",
									"video": data.file
								}]
							}, {
								"icon": "remove-media",
								"className": "remove-media",
								"action": function() {

									mediaSelection.removeChild(buttonset);
									var i = imageAssets.indexOf(data.file);
									if (i >= 0) {
										imageAssets.splice(i, 1);
										me._renderer._model.set(field.name, imageAssets);


										if (field.required && imageAssets.length == 0) {
											addVideo();
										}
									}


								}
							}]
						});


					})
					.catch((err) => {
						console.log('Video Error:' + err)
					})

			};


			if(imageAssets.length>0){
					imageAssets.map(function(path){
						renderImageAsset(path, path);
					});
				}

			if (field.required) {

				if (imageAssets.length == 0) {


					setTimeout(function() {
						try {
							console.log('Attempt to take photo 3');
							addPhoto();
						} catch (e) {
							console.log("Photo Error" + e);
						}
					}, 100);


				}
			}

			var buttons = []
			
			if (mediaOptions.showImage && (!hideButton())) {
				me._renderer.renderField(mediaSelection, extend({

					type:"button",
					label: mediaOptions.labelForImage,
					className: "add-photo"
					
				}, field.imageButton||field.button, {

					action: function() {
						addPhoto();
					}

				}));
			}

			if (mediaOptions.showVideo && (!hideButton())) {
				me._renderer.renderField(mediaSelection, extend({
					type:"button",
					label: mediaOptions.labelForVideo,
					className: "add-video"
					
				}, field.videoButton||field.button, {
					action: function() {
						addVideo();
					}
				}));
			}

		});

	}



	var showAddAudioView = function() {



		me._renderer._showSubform({
			"className": "submit",

			"name": "audio-picker",

			"fields": [{
					"position": "top-center",
					"type": "heading",
					"value": "Audio Recorder"
				},
				// {
				// 	"type": "style",
				// 	"stylename": "app-style"
				// },
				{
					"type": "data",
					"data": {
						"seconds": 0.0,
						"hasAudio": false
					}
				}, {
					"type": "label",
					"value": "{data.seconds}",
					"className": "timer {data.hasAudio|?``:`empty`}"
				}, {
					"type": "audiorecorder"
				}, {
					// 	"type": "label",
					// 	"value":"File: {data.filename}"
					// },{
					"className": "cancel",
					"type": "button",
					"position": "bottom-left",
					"label": "Cancel Audio Selection",
					"action": function(data) {
						me._renderer.cancel();
					}
				}, {
					"className": "submit",
					"enabled": "{data.hasAudio}",
					"position": "bottom-right",
					"enabled": "{data.hasAudio}",
					"type": "button",
					"label": "Save",
					"action": function(data) {

						me._renderer.back();
						me._renderer._model.set("audio-picker", data);
						console.log("audiorecorder data: " + JSON.stringify(data, null, "   "));
						console.log("Main data: " + JSON.stringify(me._renderer.getCurrentViewData(), null, "   "));


						imageAssets.push(data.filename);
						me._renderer._model.set(field.name, imageAssets);

						var buttonset = me._renderer.renderButtonset(mediaSelection, {

							"buttons": [{
								"icon": "audio-icon",

								"className": "preview-audio",
								"action": function(d, el) {


									var TNSPlayer = require("nativescript-audio").TNSPlayer;
									if (!me._renderer._player) {
										me._renderer._player = new TNSPlayer();
									}



									me._renderer._player.playFromFile({
										audioFile: data.audio, // ~ = app directory
										loop: false,
										completeCallback: function() {
											//me._renderer._model.set('playing', false);
											me._renderer._removeClass(el, 'playing');
										},
										errorCallback: function(e) {
											console.log('Error Playing! ' + e);
										}
									}).then(function() {
										//me._renderer._model.set('playing', true);
										console.log('Playing!');
										me._renderer._addClass(el, 'playing');
										me._renderer._player.getAudioTrackDuration().then(function(duration) {
											// iOS: duration is in seconds
											// Android: duration is in milliseconds
											console.log(`song duration:`, duration);

										});
									});


								}
							}, {
								"icon": "remove-media",

								"className": "remove-media",

								"action": function() {

									mediaSelection.removeChild(buttonset);
									var i = imageAssets.indexOf(data.filename);
									if (i >= 0) {
										imageAssets.splice(i, 1);
										me._renderer._model.set(field.name, imageAssets);


										if (field.required && imageAssets.length == 0) {

										}
									}

								}
							}]
						});



					}

				}
			]
		});

	}

	if (mediaOptions.showAudio) {

		if (field.required) {
			if (imageAssets.length == 0) {


				setTimeout(function() {
					try {
						console.log('Attempt to record audio');
						showAddAudioView();
					} catch (e) {
						console.log("Audio Error" + e);
					}
				}, 100);


			}
		}


		if (!hideButton()){


			var buttons = [];
			me._renderer.renderField(mediaSelection, extend({
				type:"button",
				label: mediaOptions.labelForAudio,
				className: "add-video"
				
			}, field.audioButton||field.button, {
				action: function() {
					showAddAudioView();
				}
			}))
		}


	}



}



MediaViewRenderer.prototype.renderAudioRecorder = function(container, field) {

	var me = this;


	var application = require("application");
	var filename = new Date().getTime() + (application.android ? '.mp3' : '.m4a');



	var fs = require("file-system");
	var savepath = fs.knownFolders.documents().path;
	var filepath = fs.path.join(savepath, filename);



	var recorderOptions = {
		filename: filepath,
		infoCallback: function() {
			console.log("callback: " + JSON.stringify(arguments));
		},
		errorCallback: function() {
			console.log(arguments);
		}
	};
	if (application.android) {
		var permissions = require('nativescript-permissions');
		permissions.requestPermission(android.Manifest.permission.RECORD_AUDIO, "Let me hear your thoughts...")
			.then(function() {})


		recorderOptions.source = android.media.MediaRecorder.AudioSource.MIC;


	}



	//var permissions = require('nativescript-permissions');



	me._renderer._model.set('filename', filename);

	console.log(filename);

	var interval = null;
	var secondsx10 = 0;
	me._renderer._model.set('seconds', 0.0);
	me._renderer._model.set('labelState', 'Record');
	me._renderer._model.set('recording', false);
	me._renderer._model.set('playing', false);
	me._renderer._model.set('hasAudio', false);

	var button = me._renderer.renderButtonset(container, {
		"className": "btn-main",
		"buttons": [{
			"icon": "record-audio",
			"label": "{data.labelState}",
			"className": "record-audio",
			"action": function() {
				if (!me._renderer._model.get('recording')) {

					var TNSRecorder = require("nativescript-audio").TNSRecorder;
					if (!me._renderer._recorder) {
						me._renderer._recorder = new TNSRecorder();
					}



					if (TNSRecorder.CAN_RECORD()) {
						console.log('Ready to record');
						me._renderer._recorder.start(recorderOptions).then(function(something) {


							console.log('Recording');
							console.log(something);
							secondsx10 = 0;

							me._renderer._model.set('recording', true);
							me._renderer._model.set('labelState', 'Stop Recording');
							me._renderer._model.set('seconds', 0.0);
							me._renderer._model.set('hasAudio', false);


							interval = setInterval(function() {
								secondsx10 += 1;
								me._renderer._model.set('seconds', Math.round(secondsx10) / 10.0);
							}, 100);


						}).catch(function(e) {
							console.log("Audio Error " + e);
						});
					} else {

						console.log('Not Ready')
					}



				} else {

					me._renderer._recorder.stop();
					me._renderer._model.set('recording', false);
					me._renderer._model.set('labelState', 'Record Again');
					me._renderer._model.set('audio', filepath);
					me._renderer._model.set('hasAudio', true);
					if (interval) {
						clearInterval(interval);
					}
				}

			}
		}]
	})[0];



	me._renderer.renderButtonset(container, {

		"buttons": [{
			"icon": "preview-audio",
			"label": "{data.playing|?`Playing`:`Listen`}",
			"className": "preview-audio {data.hasAudio|?``:`transparent`}",
			"enabled": "{data.hasAudio}",
			"action": function(d, el) {


				var TNSPlayer = require("nativescript-audio").TNSPlayer;
				if (!me._renderer._player) {
					me._renderer._player = new TNSPlayer();
				}



				me._renderer._player.playFromFile({
					audioFile: filepath, // ~ = app directory
					loop: false,
					completeCallback: function() {
						me._renderer._model.set('playing', false);
						me._renderer._removeClass(el, 'playing');
					},
					errorCallback: function() {
						console.log('Error Playing!');
					}
				}).then(function() {
					me._renderer._model.set('playing', true);
					console.log('Playing!');
					me._renderer._addClass(el, 'playing');
					me._renderer._player.getAudioTrackDuration().then(function(duration) {
						// iOS: duration is in seconds
						// Android: duration is in milliseconds
						console.log(`song duration:`, duration);

					});
				});


			}
		}, {
			"icon": "remove-media",
			"label": "Remove",
			"className": "preview-audio {data.hasAudio|?``:`transparent`}",
			"enabled": "{data.hasAudio}",
			"action": function() {

				me._renderer._model.set('labelState', 'Record');
				me._renderer._model.set('hasAudio', false);
				me._renderer._model.set('seconds', '0.0');
			}
		}]
	});

}



MediaViewRenderer.prototype.renderAudioPlayer = function(container, field) {

	var me = this;
	return me._renderer.renderButtonset(container, {

		"buttons": [{
			"icon": field.icon || "preview-audio",
			"className": "preview-audio {data.hasAudio|?``:`transparent`}",

			"action": function(d, el) {

				var TNSPlayer = require("nativescript-audio").TNSPlayer;
				if (!me._renderer._player) {
					me._renderer._player = new TNSPlayer();
				}

				var audio = me._renderer._parse(field.audio);

				me._renderer._player.playFromUrl({
					audioFile: audio, // ~ = app directory
					loop: false,
					completeCallback: function() {
						//me._renderer._model.set('playing', false);
						me._renderer._removeClass(el, 'playing');
					},
					errorCallback: function() {
						console.log('Error Playing!');
					}
				}).then(function() {
					//me._renderer._model.set('playing', true);
					console.log('Playing!');
					me._renderer._addClass(el, 'playing');
					me._renderer._player.getAudioTrackDuration().then(function(duration) {
						// iOS: duration is in seconds
						// Android: duration is in milliseconds
						console.log(`song duration:`, duration);

					});
				}).catch(function(e) {
					console.log('player error ' + e);
				});



			}
		}]
	});

}
MediaViewRenderer.prototype.renderVideoPlayer = function(container, field) {

	var me = this;
	return me._renderer.renderButtonset(container, {

		"buttons": [{
			"icon": field.icon || "{video-icon}",
			"action": "form",
			"name": "video-viewer",
			"fields": [{
				"type": "inlinevideo",
				"video": me._renderer._parse(field.video)
			}]
		}]
	});

}
MediaViewRenderer.prototype.renderInlineVideoPlayer = function(container, field) {


	var me = this;

	var video = me._createInlineVideo(field.video);
	container.addChild(video);

	return null;
}

MediaViewRenderer.prototype._createInlineVideo = function(field) {

	var me = this;

	var url = field;
	if (field.video) {
		url = field.video;
	}

	if (typeof url == 'function') {
		url = url();
	}

	if (typeof url == 'string') {
		me._renderer._parse(url);
	}

	if (me._renderer._isLocalFileAsset(url)) {
		return me._videoFromLocalFileAsset(url);
	}


	var src = url;

	if (typeof src != "string") {
		throw 'Expected image src to be a string ' + src + " " + (typeof src);
	}

	if (url.indexOf('{') >= 0) {
		src = me._renderer._parse(url);
		console.log('Variable Video: ' + src);
	}

	if (src[0] !== "~") {
		var protocol = global.client.getProtocol();
		src = (src.indexOf(protocol) !== 0 ? protocol + '://' + global.client.getUrl() + "/" : "") + src;
		return me._videoFromUrl(src);
	}



	throw 'Implement url video for: ' + src;
}


MediaViewRenderer.prototype._videoFromLocalFileAsset = function(asset) {
	if (typeof asset == "string") {
		var filepath = asset;

		if (filepath.indexOf('/') < 0) {
			var fs = require("file-system");
			var savepath = fs.knownFolders.documents().path;
			filepath = fs.path.join(savepath, asset);
		}

		var Video = require("nativescript-videoplayer").Video
		var video = new Video({
			src: filepath
		});
		return video;


	}
	throw 'Expected file path: ' + (typeof asset);
}


MediaViewRenderer.prototype._videoFromUrl = function(url) {
	if (typeof url == "string") {


		var Video = require("nativescript-videoplayer").Video
		var video = new Video({

		});
		extend(video, {
			src: url,
			height: 400,
			autoplay: true
		})

		return video;


	}
	throw 'Expected string url: ' + (typeof url);
}



MediaViewRenderer.prototype._storeAsset = function(imageAsset) {


	return global.storeImageSource(imageAsset).catch(function(err) {
		console.log("StoreImageSource Error -> " + err.message);
	});



}



module.exports = MediaViewRenderer;