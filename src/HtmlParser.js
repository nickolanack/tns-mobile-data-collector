function JSImageUtilites() {}
JSImageUtilites.prototype = {};

function ObjectAppend(a, b){
    a=a||{};
    b=b||{};
	Object.keys(b).forEach(function(k){
		a[k]=b[k];
	});
	return a;
};


function JSTextUtilities() {}
JSTextUtilities.prototype = {};
JSTextUtilities.CompareUrls = function(a, b) {
    var ab = [];
    ([a, b]).forEach(function(img, i) {


        if (img.indexOf(window.location.hostname + "/") == 0)
            img = img.replace(window.location.hostname + "/", '');
        if (img.indexOf(window.location.protocol + "//" + window.location.hostname + "/") == 0)
            img = img.replace(window.location.protocol + "//" + window.location.hostname + "/", '');

        //for joomla, administrator user-files is an alias to user-files
        if (img.indexOf('administrator/') == 0)
            img = img.replace('administrator/', '');


        ab[i] = img.split('?')[0];
    });


    if (ab[0] == ab[1]) return true;
    if (ab[0] == unescape(ab[1])) return true; //this is more likely than the next becuase a is usually from an image src.
    if (ab[1] == unescape(ab[0])) return true;
    return false;



};
JSTextUtilities.UrlIndexOfValueInArray = function(url, array) {
    if (!array) {
        return -1;
    }
    for (var i = 0; i < array.length; i++) {
        if (JSTextUtilities.CompareUrls(url, array[i])) {
            return i;
        }
    }
    return -1;

};

JSTextUtilities.UrlValueOfKeyInObject = function(url, object) {
    if (!object) {
        return false;
    }
    var keys = Object.keys(object);
    for (var i = 0; i < keys.length; i++) {
        if (JSTextUtilities.CompareUrls(url, keys[i])) {
            return keys[i];
        }
    }
    return false;
};

JSTextUtilities.UrlProcessVideo = function(options) {
    var handlers = {

        youtube: function(options) {

            var div = new Element('div', {
                rel: "{handler:'adopt'}"
            });
            div.innerHTML = '<object width="640" height="480"><param name="movie" value="http://www.youtube.com/v/' + options.code + '?version=3&amp;hl=en_US"></param><param name="allowFullScreen" value="true"></param><param name="allowscriptaccess" value="always"></param><embed src="http://www.youtube.com/v/' + options.code + '?version=3&amp;hl=en_US" type="application/x-shockwave-flash" width="640" height="480" allowscriptaccess="always" allowfullscreen="true"></embed></object>';
            (window.parent || window).PushBoxWindow.open(div, {
                size: {
                    x: 640,
                    y: 480
                },
                push: true,
                handler: 'append'
            });
            return false;

        },
        geolive: function(options) {


            return false;

        }

    };


    if (handlers[options.handler]) {

        return handlers[options.handler](options);
    }

    return true;
};



JSTextUtilities.URLVideoHookDetails = function(url) {



    if (url.indexOf('www.youtube.com/embed') >= 0) {
        var params = url.split('/');

        var ytid = params[params.length - 1];

        return {
            onclick: "JSTextUtilities.UrlProcessVideo({handler:'youtube', code:'" + ytid + "'})",
            thumbnail: "http://i.ytimg.com/vi/" + ytid + "/0.jpg"
        };


    }


    if (url.indexOf('youtube.com/watch') >= 0) {
        var params = url.split('?');
        var vars = params[1].split('&');
        var ytidRaw = vars[0].split('=');
        var ytid = ytidRaw[1];

        return {
            onclick: "JSTextUtilities.UrlProcessVideo({handler:'youtube', code:'" + ytid + "'})",
            thumbnail: "http://i.ytimg.com/vi/" + ytid + "/0.jpg"
        };


    }

    if (url.indexOf('youtu.be/') >= 0) {
        var params = url.split('.be/');
        var ytid = params[1];

        return {
            onclick: "JSTextUtilities.UrlProcessVideo({handler:'youtube', code:'" + ytid + "'})",
            thumbnail: "http://i.ytimg.com/vi/" + ytid + "/0.jpg"
        };


    }

    if (url.indexOf('[ViDeO]') >= 0) {
        return {
            onclick: "JSTextUtilities.UrlProcessVideo({handler:'geolive', url:'" + url + "'})",
            thumbnail: "http://i.ytimg.com/vi/" + 0 + "/0.jpg"
        };
    }

    return false;
};


JSTextUtilities.ParseCoordinateString = function(str, options) {



    var details = (function(str) {

        //creates an object with info about the string
        //what tries to find a characters to split on
        //detect DMS characters

        var d = {};


        var _detectSplitPosition = function(charlist, options) {
            var config = ObjectAppend({
                allowMutlipleMatches: false,
                override: function(a, b, c) {
                    /*
                     * a=new index, b=old index, c=string
                     */
                    var mid = Math.abs((c.length / 2) - b);
                    var cur = Math.abs((c.length / 2) - a);

                    if (cur < mid) {
                        return true; //should update
                    }
                    return false; //keep old values
                },
                split: {
                    'on': ['and ', ', '],
                    'before': [' n', ' s', ' e', ' w']
                } //if any of these are used then 
            }, options);

            for (var si = 0; si < charlist.length; si++) {
                var s = charlist[si];
                var c = str.match(new RegExp(s, 'g'));
                if (c !== null && (config.allowMutlipleMatches || c.length == 1)) {

                    var i = -1;
                    while ((i = str.indexOf(s, i + 1)) != -1) {
                        var useCur = false;
                        if (d.splitAt != null) {
                            //already has a match, so use comparator to select best match
                            useCur = config.override(i, d.splitAt, str);
                        } else {
                            useCur = true; //use the first match always.
                        }

                        if (useCur) {

                            d.split = 'after';
                            if (config.split['on'].indexOf(s) >= 0)
                                d.split = 'on';
                            if (config.split['before'].indexOf(s) >= 0)
                                d.split = 'before';
                            d.splitAt = i;
                            d.splitStr = s;
                            if (config.override === false) return;
                        }
                    }

                }


            }



        };

        var _detectCoordinateSystem = function(str, options) {

            var config = ObjectAppend({
                mode: 'dec'
            }, options);
            d.mode = config.mode;
            var foundDMS = false;
            //if any of the DMS characters are detected, asume DMS format. this doesn't check if they are placed correctly.
            // "�" degrees, "'" minutes, '"' seconds
            ([String.fromCharCode(176) /*"�"*/ , "'", '"']).forEach( function(s) {
                if (str.indexOf(s) >= 0) {
                    d.mode = 'dms';
                    foundDMS = true;
                }
            });

            if (!foundDMS) {
                //sometimes dms uses only spaces... but if there is at least one
                //space, then there should be a valid number on eighter side of the space;
                var i = d.splitAt;
                if (d.split == 'after')
                    i += d.splitStr.length;
                var left = str.substring(0, i).trim();
                var right = str.substring(i + (d.split == 'on') ? d.splitStr.length : 0);
                var parts = [left, right];
                for (var h = 0; h < parts.length; h++) {

                    var spc = parts[h].match(/ /g);
                    if (spc != null && spc.length > 0) {
                        var n = left.split(' ');
                        var v = 0;
                        for (var i = 0; i < n.length; i++) {
                            //parse float from component reduced to only have numbers (and only one decimal)
                            var f = parseFloat(n[i].replace(/[^0-9.�-]/g, ""));
                            if (!isNaN(f)) v++;
                        }

                        //at least 2 valid numbers should be found otherwise dec coordinate
                        if (v > 1) {
                            d.mode = 'dms';
                            break;
                        }
                    }
                }



            }
        };

        var _formatComponents = function(str, options) {
            var i = d.splitAt;
            if (d.split == 'after')
                i += d.splitStr.length;
            var left = str.substring(0, i).trim();
            var right = str.substring(i + ((d.split == 'on') ? d.splitStr.length : 0));

            d.left = {
                string: left
            };
            d.right = {
                string: right
            };


           	(['left', 'right']).forEach( function(pos, i) {
                if (d.mode == 'dec') {

                    d[pos].value = parseFloat(d[pos].string.replace(/[^0-9.-]/g, ""));

                } else {


                    var n = d[pos].string.split(' ');
                    var values = [];
                    for (var i = 0; i < n.length; i++) {
                        //parse float from component reduced to only have numbers (and only one decimal)

                        var f = parseFloat(n[i].replace(/[^0-9.-]/g, ""));
                        if (!isNaN(f)) values.push(Math.abs(f)); //sign needs to apply to each component. so only apply after totalling
                    }

                    d[pos].values = values;
                    d[pos].value = 0;
                    (values).forEach( function(v, i) {
                        d[pos].value += v / (Math.pow(60, i)); //1, 60, 3600
                    });

                    if (d[pos].string.indexOf('s') >= 0 || d[pos].string.indexOf('w') >= 0) {
                        d[pos].value *= -1; //invert the sign
                    }

                    if (d[pos].string.indexOf('-') >= 0) {
                        d[pos].value *= -1; //invert the sign
                    }

                }

            });

            if (d.left.value != null && !isNaN(d.left.value) && d.right.value != null && !isNaN(d.right.value)) {

                d.lat = d.left.value;
                d.lng = d.right.value;

            }

        };

        _detectSplitPosition([', ', 'and ', 'lat ', 'latitude ', 'lng ', 'long ', 'longitude ']);
        if (d.splitAt == null) {
            _detectSplitPosition(['n ', 's ', 'e ', 'w ', ' n', ' s', ' e', ' w']);
        }
        if (d.splitAt == null) {
            _detectSplitPosition(['north ', 'south ', 'east ', 'west ', ' north', ' south', ' east', ' west']);
        }
        if (d.splitAt == null) {
            _detectSplitPosition([' '], {
                allowMutlipleMatches: true
            });
            JSConsoleWarn('Coordinate String Parser: Did not detect a reliable seperator (used whitespace)');
        }

        _detectCoordinateSystem(str);
        _formatComponents(str);
        return d;

    })(str.trim().toLowerCase().replace(new RegExp(String.fromCharCode(8211), 'g'), '-'));


    if (details.lat && details.lng) {
        return new google.maps.LatLng(details.lat, details.lng);
    }

    return false;

   

};


/*
 * returns a string with location formatting matching the first item in array (formats)
 * in which all symbols where successfully replaced. 
 */
JSTextUtilities.FormatGoogleGeolocation = function(locationObject, formats) {
    /*
     *
     */
    var location = locationObject[0];
    if (!formats)
        formats = ['formatted_address']; //default format

    for (var i = 0; i < formats.length; i++) {
        var format = formats[i];
        (location.address_components).forEach(function(c) {
            if (format.indexOf(c.types[0]) != -1) {
                if (format.indexOf(c.types[0] + '.short_name') != -1) {
                    format = format.replace(c.types[0] + '.short_name', c.short_name);
                } else if (format.indexOf(c.types[0] + '.long_name') != -1) {
                    format = format.replace(c.types[0] + '.long_name', c.long_name);
                } else {
                    format = format.replace(c.types[0] + '', c.long_name);
                }
            }
        });

        if (format.indexOf('formatted_address') != -1) {
            format = format.replace('formatted_address', location.formatted_address);
        }

        if (format.indexOf('latitude') != -1) {
            format = format.replace('latitude', location.geometry.location.lat());
        }

        if (format.indexOf('longitude') != -1) {
            format = format.replace('longitude', location.geometry.location.lng());
        }

        var completed = true;
        (['formatted_address',
            'latitude',
            'longitude',
            'street_address', //indicates a precise street address.
            'route', // indicates a named route (such as "US 101").
            'intersection', //indicates a major intersection, usually of two major roads.
            'political', //indicates a political entity. Usually, this type indicates a polygon of some civil administration.
            'country', //indicates the national political entity, and is typically the highest order type returned by the Geocoder.
            'administrative_area_level_1', //indicates a first-order civil entity below the country level. Within the United States, these administrative levels are states. Not all nations exhibit these administrative levels.
            'administrative_area_level_2', //indicates a second-order civil entity below the country level. Within the United States, these administrative levels are counties. Not all nations exhibit these administrative levels.
            'administrative_area_level_3', //indicates a third-order civil entity below the country level. This type indicates a minor civil division. Not all nations exhibit these administrative levels.
            'colloquial_area', //indicates a commonly-used alternative name for the entity.
            'locality', //indicates an incorporated city or town political entity.
            'sublocality', //indicates a first-order civil entity below a locality. For some locations may receive one of the additional types: sublocality_level_1 through to sublocality_level_5. Each sublocality level is a civil entity. Larger numbers indicate a smaller geographic area.
            'neighborhood', //indicates a named neighborhood
            'premise', //indicates a named location, usually a building or collection of buildings with a common name
            'subpremise', //indicates' a first-order entity below a named location, usually a singular building within a collection of buildings with a common name
            'postal_code', //indicates a postal code as used to address postal mail within the country.
            'natural_feature', //indicates a prominent natural feature.
            'airport', //indicates an airport.
            'park', //indicates a named park.
            'point_of_interest'
        ]).forEach(function(c) {
            if (format.indexOf(c) != -1)
                completed = false;
        });
        if (completed) return format;

    }

    return false;

};
JSTextUtilities.ParseDate = function(string) {
    var date = JSTextUtilities.ParseSqlDate(string);
    if (date) return date;
    return false;
};
//return date object expecting string like
//yyyy-mm-dd, yyyy-mm, <-default 1st yyyy <-jan 1st
//or return false
JSTextUtilities.ParseSqlDate = function(string) {
    var v = string;
    if (v && v != '') {
        var parts = v.split(/[\s-,:]/);
        var year;
        var month = 0;
        var day = 1;
        if (parts.length) {
            if (parts[0].length == 4) {

                year = parts[0];


                if (parts.length > 1) {
                    if (parts[1].length == 2) {
                        var m = (parseInt(parts[1]) - 1);
                        if (m >= 0 && m <= 11) {
                            month = m;
                        }
                    }

                    if (parts.length > 2) {
                        if (parts[2].length == 2) {
                            day = (parseInt(parts[2]));
                        }
                    }

                }

                return new Date(year, month, day);
            }

        }
    }
    return false;
};
JSTextUtilities.FormatRelativeDate = function(timeString, timezoneOffset) {


    var now = new Date();

    var time = new Date(timeString.replace(/-/g, "/"));
    var serverMilli = time.getTime() + (60000*((timezoneOffset || 0) - now.getTimezoneOffset()));
    var relative = now.getTime() - serverMilli;

    var sMins = (relative / 1000.0 / 60.0);
    var sHours = (sMins / 60.0);
    var sDays = (sHours / 24.0);
    var sMonthsAprox = (sDays / 30.0);
    var sYears = (sDays / 256.25);

    var weeks = Math.round(sDays / 7);
    var remWeeks = (Math.round(sDays) % 7);


    //JSConsole(time+"{ years:"+sYears+", months:"+sMonthsAprox+", weeks:"+weeks+"-remainder:"+remWeeks+" days:"+sDays+" hours:"+sHours+"), minutes:"+sMins+" offset:"+offset+"}");

    //knock off the really old posts first.
    if (sYears >= 2) return Math.round(sYears) + " years ago";
    if (sMonthsAprox > 11 && sMonthsAprox < 13) return "a year ago";
    if (sMonthsAprox >= 13) {
        var remMonths = Math.round(sMonthsAprox) - 12;
        return "a year " + (remMonths > 1 ? "and " + remMonths + " months" : "and a month") + " ago";
    }
    if (sMonthsAprox > 1.6) return Math.round(sMonthsAprox) + " months ago";
    if (sMonthsAprox > 1.3) return "1 and a half months ago";
    if (sMonthsAprox > 1.1) return "just over a month ago";
    if (sMonthsAprox > 0.9) return " a month ago";
    if (sMonthsAprox > 0.8) return "almost a month ago";

    if (weeks > 1) {
        if (remWeeks == 1) {
            remWeeks = 0;
        }
        if (remWeeks == 6) {
            remWeeks = 0;
            weeks++;
        }

    }
    if (weeks > 0 && remWeeks == 0) return (weeks == 1 ? "1 week ago" : weeks + " weeks ago");
    if (weeks > 1) return (weeks == 1 ? "1 week" : weeks + " weeks") + " and " + (remWeeks == 1 ? "1 day ago" : remWeeks + " days ago");

    if (sDays > 2) return Math.round(sDays) + " days ago";
    if (sHours > 40) return "almost 2 days ago";
    if (sHours > 32) return "1 and a half days ago";
    if (sHours > 28) return "just over 1 day ago";
    if (sHours > 20) return "less than a day ago";
    if (sHours < 14 && sHours > 10) return "half a day ago";
    if (sHours > 2) return Math.round(sHours) + " hours ago";

    if (sMins > 140) return "2 and a half hours ago";
    if (sMins > 130) return "just over 2 hours ago";
    if (sMins > 110) return "2 hours ago";
    if (sMins > 100) return "almost 2 hours ago";
    if (sMins > 80) return "1 and a half hours ago";
    if (sMins > 70) return "just over 1 hour ago";
    if (sMins > 55) return "1 hour ago";
    if (sMins < 35 && sMins > 25) return "half an hour ago";



    if (sMins <= 2) return "just now";
    if (sMins <= 5) return "a few minutes ago";

    return Math.round(sMins) + " minutes ago";

};

JSTextUtilities.StripIFrames = function(text, options) {
    return JSTextUtilities.StripHtmlTags(text, 'iframe');
};

JSTextUtilities.ParseIFrames = function(text, options) {

    var iframes = JSTextUtilities.ParseHtmlTags(text, 'iframe');
    var iframeDetails = [];

    (iframes).forEach( function(iframe) {

        var url = JSTextUtilities.ParseHtmlAttribute(iframe.html, 'src');
        iframeDetails.push(ObjectAppend(iframe, {
            url: url.split('?')[0],
        }));

    });

    return iframeDetails;

};

JSTextUtilities.StripObjects = function(text, options) {
    return JSTextUtilities.StripHtmlTags(text, 'object');
};
JSTextUtilities.StripEmbeds = function(text, options) {
    return JSTextUtilities.StripHtmlTags(text, 'embed');
};

JSTextUtilities.ParseObjects = function(text, options) {
    return JSTextUtilities.ParseHtmlTags(text, 'object');
};
JSTextUtilities.ParseEmbeds = function(text, options) {
    return JSTextUtilities.ParseHtmlTags(text, 'embed');
};

JSTextUtilities.StripAudios = function(text, options) {
    return JSTextUtilities.StripHtmlTags(text, 'audio');
};

JSTextUtilities.StripVideos = function(text, options) {
    return JSTextUtilities.StripHtmlTags(text, 'video');
};
JSTextUtilities.StripImages = function(text, options) {
    return JSTextUtilities.StripHtmlTags(text, 'img');
};

JSTextUtilities.NoCacheUrl = function(url) {
    var t = '?';
    if (url.indexOf('?') >= 0) {
        t = '&';
    }
    return url += t + Math.floor((Math.random() * 899) + 100) + '=nocache';
};

JSTextUtilities.ParseUrlMime = function(url, options) {
    var ext = ((url.toLowerCase()).split('.')).pop().split('?')[0];
    var type = '';
    switch (ext) {

        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'bmp':
        case 'gif':

            type = 'image/' + ext;
            return type;
            break;

        case 'mp4':
        case 'webm':
        case 'flv':
        case 'ogv':
        case 'avi':


            type = 'video/' + ext;
            return type;
            break;

        case 'mp3':
        case 'ogg':
        case 'wav':

            type = 'audio/' + ext;
            return type;
            break;

    }
    return null;
};
/**
 * returns an array of image objects, found (from <img tags)
 * @param text
 * @param options
 * @returns {Array}
 */
JSTextUtilities.ParseImages = function(text, options) {

    var imageElments = JSTextUtilities.ParseHtmlTags(text, 'img');
    var imageDetailsArray = [];

   (imageElments).forEach(function(image) {

        var url = JSTextUtilities.ParseHtmlAttribute(image.html, 'src');

        imageDetailsArray.push(ObjectAppend(image, {
            origional: image.html,
            html: '<img src="' + url + '" />',
            origionalUrl: url,
            url: url.split('?')[0],
            type: JSTextUtilities.ParseUrlMime(url) || "unknown"
        }));

    });

    return imageDetailsArray;
};

JSTextUtilities.ParseImageUrlList = function(text, options) {

    var config = ObjectAppend({}, {
        distinct: true
    }, options);

    var images = [];

  	(JSTextUtilities.ParseImages(text)).forEach( function(imageDetails) {
        if (config.distinct && images.indexOf(imageDetails.url) >= 0) image.push(imageDetails.url);
    });

    var urls = JSTextUtilities.ParseUrls(text, {
        distinct: true
    });
    if (urls && urls.length) {
        (urls).forEach( function(o) {
            var url = o.url;
            switch (((url.toLowerCase()).split('.')).pop().split('?')[0]) {

                case 'png':
                case 'jpg':
                case 'jpeg':
                case 'bmp':
                case 'gif':

                    if (config.distinct && images.indexOf(url) < 0) images.push(url);
                    break;
            }

        });
    }

    return images;
};

JSTextUtilities.StripScripts = function(text, options) {
    return JSTextUtilities.StripHtmlTags(text, 'script');
};

JSTextUtilities.StripStyles = function(text, options) {
    return JSTextUtilities.StripHtmlTags(text, 'style');
};

// returns the inner html of an element. 
// ie: <div><p></p></div> would have inner html equal to: '<p></p>'
JSTextUtilities.ParseInnerHTML = function(text) {
    return text.substring(text.indexOf('>') + 1, text.lastIndexOf('<'));
};

// given an html tagname (case insensitive), returns an array string reference objects for each item
// each item is an object like {html:string, start:int(str pos), end:int, [warnings:[...]]}
JSTextUtilities.ParseHtmlTags = function(text, tagname) {
    var lower = text.toLowerCase(); //use lowercase string for all comparisons. eg <AUDIO behaves as <audio.
    var startFrom = 0;
    var start = -1;
    var items = [];
    var tag = tagname.toLowerCase();

    var shouldBeSelfClosing = (['img', 'br', 'source'].indexOf(tag) >= 0) ? true : false;

    while ((start = JSTextUtilities.FirstOccuranceOf(lower, ['<' + tag + ' ', '<' + tag + '>'], startFrom)) >= 0) {

        var warnings = [];

        var emptyClosing = lower.indexOf('/>', start);
        var selfClosing = lower.indexOf('>', start);
        var end = -1;
        if (emptyClosing >= 0 && emptyClosing < selfClosing) {
            end = selfClosing + 1;
        } else {
            end = lower.indexOf('</' + tag + '>', start); //oops what about spaces?
            if (end >= 0) {
                end += tag.length + 3;

                if (shouldBeSelfClosing) {
                    warnings.push('[' + tag + '] should be self closing');
                }

            } else {
                end = text.length;
                //this situation means that the string text did not contain the closing tag. or text had invalid html. 
                //if the later, then their might be trailing html. to fix this (as best as possible), html could trimed from the end
                if (shouldBeSelfClosing) {
                    end = selfClosing + 1;
                    warnings.push('[' + tag + '] end tag not found and did not find self closing characters \' />\'');
                } else {
                    warnings.push('[' + tag + '] ran out of text before finding closing tag');
                }
            }
        }
        var result = {
            html: text.substring(start, end),
            start: start,
            end: end
        };
        if (warnings.length) {
            result.warnings = warnings;
        }
        items.push(result);
        startFrom = end;
    }
    return items;
};

JSTextUtilities.StripTags = function(text) {

    parts=([text.substring(0, text.indexOf('<'))]).concat(text.split('>').slice(1));

     return parts.map(function(t){
       return  t.split('<')[0]
    }).filter(function(t){
        if((!t)||t==''){
            return false;
        }
        return true;
    }).join(' ')
    
};

JSTextUtilities.StripHtmlTags = function(text, tagname) {

    var audios = (JSTextUtilities.ParseHtmlTags(text, tagname)).reverse(); //working from back to front allows substring to not affect the next action
    (audios).forEach( function(a) {
        text = text.substring(0, a.start) + text.substring(a.end);
    });
    return text;
};

JSTextUtilities.StripParseResults = function(text, results, options) {

    var cleaned = [];
    var shifted = false;
   	(results).forEach( function(r) {
        if (r.start != null && r.start >= 0 && r.end != null && r.end >= 0) {
            var overlap = false;
            (cleaned).forEach( function(s) {
                if ((r.start >= s.start && r.start <= s.end) || (s.start >= r.start && s.start <= r.end)) {
                    overlap = true;
                    if (r.start != s.start && r.end != s.end) {
                        if ((r.start >= s.start && r.end >= s.end) || (s.start >= r.start && s.end >= r.end)) {
                            shifted = true; //this may cause previous items to now overlap and will need to be cleaned
                        }
                        if (r.end > s.end) {
                            s.end = r.end; //expand previous item to surround both
                        }
                        if (r.start < s.start) {
                            s.start = r.start; //expand previous item to surround both
                        }
                    }
                }
            });
            if (!overlap) {
                cleaned.push(ObjectAppend({}, r)); //push copy, so that results argument remains unchanged.
            }
        }
    });
    if (shifted) return JSTextUtilities.StripParseResults(text, cleaned, options);

    cleaned.sort(function(a, b) {
        return b.start - a.start;
    });

    var stripped = text;
    (cleaned).forEach( function(r) {
        stripped = stripped.substring(0, r.start) + stripped.substring(r.end);
    });

    return stripped;

};

JSTextUtilities.ReplaceParseResults = function(text, replace, results, options) {
    var list = results.sort(function(a, b) {
        return b.start - a.start; //larger start indexes first.
    });
    var output = text;
    (list).forEach( function(result) {

        output = JSTextUtilities.ReplaceParseResult(output, replace, result, options);

    });

    return output;
};

JSTextUtilities.ReplaceParseResult = function(text, replace, result, options) {

    var replaceText = replace;
    if (typeOf(replace) == 'function')
        replaceText = replace(result);
    return text.substring(0, result.start) + replaceText + text.substring(result.end);

};

JSTextUtilities.ParseHtmlAttribute = function(text, attribute) {
    var lower = text.toLowerCase(); //use lowercase string for all comparisons. eg <AUDIO behaves as <audio.
    var start = -1;
    if ((start = lower.indexOf(' ' + attribute + '=')) >= 0) {

        var quote = lower.charAt(JSTextUtilities.FirstOccuranceOf(text, ['"', "'"], start)); //could be using either quote style
        var i = lower.indexOf(quote, start) + 1;
        var j = lower.indexOf(quote, i);
        return text.substring(i, j);

    }
    return null;
};

/**
 * finds the index of the first occurance of any of the substrings from offset 
 */
JSTextUtilities.FirstOccuranceOf = function(string, substrings, offset) {

    var min = -1;
    (substrings).forEach( function(substring) {
        var index = string.indexOf(substring, offset);
        if (index >= 0)
            min = min == -1 ? index : Math.min(min, index);
    });
    return min;

};

JSTextUtilities.ParseAudios = function(text, options) {
    /*
     this is what an audio element should look like.
    <audio controls="controls">
        <source src="http://trt.geolive.ca/components/com_mediamapserver/users_files/user_files_65/uploads/[g]_[audio]_os9_usx_aza.mp3" type="audio/mp3" />
        <source src="http://trt.geolive.ca/components/com_mediamapserver/users_files/user_files_65/uploads/[g]_[audio]_os9_usx_aza.ogg" type="audio/ogg" />
        <source src="http://trt.geolive.ca/components/com_mediamapserver/users_files/user_files_65/uploads/[g]_[audio]_os9_usx_aza.wav" type="audio/wav" />
        <source src="http://trt.geolive.ca/components/com_mediamapserver/users_files/user_files_65/uploads/[g]_[audio]_os9_usx_aza.aiff" type="audio/aiff" />
        <embed height="50" width="100" src="http://trt.geolive.ca/components/com_mediamapserver/users_files/user_files_65/uploads/[g]_[audio]_os9_usx_aza.mp3" / type="audio/mp3">
    </audio>

     * 
     */


    var audioElements = JSTextUtilities.ParseHtmlTags(text, 'audio');
    var audiosDetailsArray = [];

    (audioElements).forEach( function(audio) {

        var sources = JSTextUtilities.ParseHtmlTags(audio.html, 'source');
        var urls = [];
        var types = [];
        var url = null;
        var type = null;
        (sources).forEach( function(srcEl) {
            var src = JSTextUtilities.ParseHtmlAttribute(srcEl.html, 'src');
            var mime = JSTextUtilities.ParseHtmlAttribute(srcEl.html, 'type');
            urls.push(src);
            types.push(mime || JSTextUtilities.ParseUrlMime(src));
            if (url == null) {
                url = src;
                type = mime;
            }
            if (mime == 'audio/wav') {
                url = src; //best choice (for queries)
                type = mime;
            }

        });

        var embeds = JSTextUtilities.ParseHtmlTags(audio.html, 'embed');

        audiosDetailsArray.push(ObjectAppend(audio, {
            origional: audio.html,
            urls: urls,
            types: types, //audio/mp3
            embed: embeds.length ? embeds[0].html : false,
            url: url,
            type: type
        }));

    });

    return audiosDetailsArray;
};


/**
 * returns an array of videoDetail objects from 
 * @param text
 * @param options
 */
JSTextUtilities.ParseVideos = function(text, options) {


    var config = ObjectAppend({
        formatSrc: false,
        nocache: false,
        autoplay: false,
    }, options);

    var videoElements = JSTextUtilities.ParseHtmlTags(text, 'video');
    var videoDetailsArray = [];

    (videoElements).forEach( function(video) {

        var sources = JSTextUtilities.ParseHtmlTags(video.html, 'source');
        var poster = JSTextUtilities.ParseHtmlAttribute(video.html, 'poster');

        var urls = [];
        var types = [];

        var url = null;
        var type = null;

        sources.sort(function(a, b) {
            //prefer webm as the actual playable source type, the best format for firefox and chrome.

            if (JSTextUtilities.ParseUrlMime(JSTextUtilities.ParseHtmlAttribute(a.html, 'src')) == 'video/mp4') return -1;
            if (JSTextUtilities.ParseUrlMime(JSTextUtilities.ParseHtmlAttribute(b.html, 'src')) == 'video/mp4') return 1;

            return 0;

        });

        (sources).forEach( function(srcEl) {
            var src = JSTextUtilities.ParseHtmlAttribute(srcEl.html, 'src');
            var mime = JSTextUtilities.ParseHtmlAttribute(srcEl.html, 'type');
            urls.push(src);
            types.push(mime || JSTextUtilities.ParseUrlMime(src));

            if (url == null) {
                url = src;
                type = mime;
            }
            if (mime == 'video/mp4') {
                //set this as the default file for the video although urls, and types contains multiple video formats
                url = src;
                type = mime;
            }

        });

        var embeds = JSTextUtilities.ParseHtmlTags(video.html, 'embed');
        var details = ObjectAppend(video, {
            origional: video.html,
            urls: urls,
            types: types, //audio/mp3
            embed: embeds.length ? embeds[0].html : false,
            poster: poster,
            url: url,
            type: type
        });

        var html = '<video' + (config.autoplay ? ' autoplay="autoplay" ' : '') + '>';
        (urls).forEach( function(u, i) {
            var s = u;

            if (config.formatSrc && typeOf(config.formatSrc) == 'function')
                s = config.formatSrc(s);
            if (config.nocache)
                s = JSTextUtilities.NoCacheUrl(s);
            html += '<source src="' + s + '" type="' + types[i] + '" /> ';
        });
        html += '</video>';
        details.html = html;

        //delete details.html;

        videoDetailsArray.push(details);

    });

    return videoDetailsArray;
};

/**
 * return an array of url objects from text 
 * generally only plain urls (not a links) are returned
 * 
 * exampl result: [{"www.geolive.ca", start:100, end:114}, ...]
 */
JSTextUtilities.ParseUrls = function(text, options) {
    var config = ObjectAppend({}, {
        skipLinks: true, //only show urls that are not within a tags.
        skipAudios: true, // .. audio tags
        skipVideos: true, // ..video
        skipImages: true, // images

        skip: [],

    }, options);

    var skip = config.skip;

    if (config.skipLinks)
        skip = skip.concat(JSTextUtilities.ParseLinks(text));
    if (config.skipAudios)
        skip = skip.concat(JSTextUtilities.ParseAudios(text));
    if (config.skipVideos)
        skip = skip.concat(JSTextUtilities.ParseVideos(text));
    if (config.skipImages)
        skip = skip.concat(JSTextUtilities.ParseImages(text));

    var txt = text.replace(/(\[|\(|{|\r\n|\n|\r|\t|}|\]|\))/gm, ' '); //make all whitespace chars the same.

    var pieces = txt.split(' ');
    var rawurls = [];

    for (var i = 0; i < pieces.length; i++) {
        var piece = pieces[i];
        var p = -1;
        //needs all these round brackets to keep p as an int, not a bool. becuase if it gets converted to 
        //a bool that is the same as adding a 1 character offset (if true) and p=0 is treated as true
        if ((p = piece.indexOf('http://')) >= 0 || ((p = piece.indexOf('https://')) || ((p = piece.indexOf('www.'))) >= 0) >= 0) {

            var start = text.indexOf(piece);
            var end = start + piece.length;
            rawurls.push({
                html: piece,
                start: start,
                end: end,
                offset: p
            });
        } else {

            //general url was not found. here, could lookup common urls like 'youtu.be.com', 

        }
    }
    var urls = [];
    (rawurls).forEach( function(o) {
        var url = {
            html: o.html.substring(o.offset),
            url: o.html.substring(o.offset),
            start: o.start + o.offset,
            end: o.end,
            type: 'url'
        };
        if (config.skipLinks) {
            var skip = false;
            (skip).forEach( function(l) {
                if (url.start >= l.start && url.start <= l.end) {
                    skip = true;
                }
            });
            if (!skip) urls.push(url);
        } else {
            urls.push(url);
        }
    });

    return urls;
};

JSTextUtilities.ParseLinks = function(text, options) {
    var links = JSTextUtilities.ParseHtmlTags(text, 'a');
    (links).forEach( function(link) {

        link.url = JSTextUtilities.ParseHtmlAttribute(link.html, 'href');
        link.type = 'link';
        link.text = JSTextUtilities.ParseInnerHTML(link.html);

    });
    return links;
};

/* 
 * Partially deprecated. 
 * be more flexible and use the other methods in this section.
 */
JSTextUtilities.ParseText = function(text, options) {
    var config = Object.merge({}, {
        parseUrls: true,
        parseEmails: true,
        parseNewLines: true,
        removeTags: false,
        linkOptions: {
            parentClassName: 'parsedUrl',
            parentStyles: {}
        },
        videoOptions: {
            parentClassName: 'parsedVideo',
            parentStyles: {
                display: 'block'
            }
        }
    }, options);


    var formatString = function(string) {
        var any = false;
        var txt = string.replace(/(\r\n|\n|\r)/gm, ' <br/> ').replace("\t", ' ');
        if (txt.indexOf('<br/>') >= 0)
            any = true;
        var sects = txt.split(" ");
        var i = 0;

        if (config['parseUrls']) {
            for (i = 0; i < sects.length; i++) {

                if (sects[i].indexOf('http://') == 0 || sects[i].indexOf('www.') == 0) {

                    var video = JSTextUtilities.URLVideoHookDetails(sects[i]);

                    var parentClassName = "";
                    var parentStyles = [];
                    var typeOptions = {};

                    if (video) {
                        typeOptions = config.videoOptions;
                    } else {
                        typeOptions = config.linkOptions;
                    }

                    if (typeOptions.parentClassName)
                        parentClassName = typeOptions.parentClassName;
                    if (typeOptions.parentStyles) Object.each(typeOptions.parentStyles, function(a, b) {
                        parentStyles.push(a + ":" + b + ';');
                    });
                    parentStyles = parentStyles.join(" ");



                    // list of possible trailing characters that might be inserted after the url,
                    // that would eighter dismiss the string as a url or be appended to the url
                    //var trailing=[").","].","}.",")","]","}", ".", ";"];
                    //TODO: fix trailing url.
                    var tempClassName = 'parsed_' + Math.floor((Math.random() * 10000)) + '_link';
                    var url = sects[i];
                    sects[i] = '<span class="' + parentClassName + '" style="' + parentStyles + '"><a class="' + tempClassName + " " + (video && (!video.thumbnail) ? "videoLink" : "") + '" target="_blank" href="' + (sects[i].indexOf('http://') == -1 ? "http://" : "") + sects[i] + '">' + (sects[i]) + '</a></span>' + ((video && video.thumbnail) ? '<a class="videoLink" target="_blank" href="' + (sects[i].indexOf('http://') == -1 ? "http://" : "") + sects[i] + '"   ' + (video && video.onclick ? 'onclick="return ' + video.onclick + ';"' : '') + '>' + ((video && video.thumbnail) ? '<img class="videoThumb" style="" src="' + video.thumbnail + '" />' : sects[i]) + '</a>' : '');

                    (function(url, className) {
                        var urlMetadata = new UrlMetadataRequest({
                            url: url
                        });
                        urlMetadata.addEvent('onSuccess', function(m) {

                            if (m.success) {
                                var item = $$('.' + className)[0];
                                var t = m.title;

                                //JSConsole(['url decode',item, t, className]);

                                if (t && t != "" && (t.trim()).length > 10) {
                                    t = (t.trim());
                                    item.innerHTML = t;
                                }
                            }
                        });
                        urlMetadata.execute();
                    })(url, tempClassName);

                    any = true;

                }

            }
        }

        if (config['parseEmails']) {
            for (i = 0; i < sects.length; i++) {
                var atIndex = sects[i].indexOf('@');
                if (atIndex > 0 && atIndex < (sects[i].length - 4)) {

                    var dotIndex = sects[i].indexOf('.', atIndex);
                    //JSConsole("BooYa Kapow @ "+dotIndex+" "+sects[i].length);
                    if (dotIndex && dotIndex < (sects[i].length - 2)) {

                        sects[i] = '<a target="_blank" href="mailto:' + sects[i] + '" >' + sects[i] + '</a>';
                        any = true;
                        break;
                    }
                }
            }
        }


        if (any) {

            return sects.join(' ');
        }
        return false;

    };
    var formatDom = function(e) {
        if (!e) return null;
        //JSConsole(e); JSConsole(typeOf(e));

        if (typeOf(e) == 'element' && e.tagName.toLowerCase() == 'iframe') {

            var video = JSTextUtilities.urlVideoHook(e.src);
            if (video) {
                //JSConsole(["IFRAME",video]);
                var unframe = new Element('div', {
                    'class': 'replacedContent'
                });
                unframe.setStyle('textAlign', 'center');
                unframe.innerHTML = ((video && video.thumbnail) ? '<a class="videoLink" target="_blank" href="' + (e.src.indexOf('http://') == -1 ? "http://" : "") + e.src + '"   ' + (video && video.onclick ? 'onclick="return ' + video.onclick + ';"' : '') + '>' + ((video && video.thumbnail) ? '<img class="videoThumb" style="" src="' + video.thumbnail + '" />' : e.src) + '</a>' : '');
                e.parentNode.replaceChild(unframe, e);
                return unframe;
            }

        }

        if (typeOf(e) == 'element' && e.childNodes) {
            //JSConsole('has children');
            Object.each(e.childNodes, function(c) {
                formatDom(c);
            });

        } else if (typeOf(e) == 'textnode') {


            var changed = formatString(e.nodeValue);

            if (changed) {
                //try{
                var s = new Element('span');
                s.innerHTML = changed;
                e.parentNode.replaceChild(s, e);
                //}catch(e){JSConsole(['Parse Exception',e]);}
            }
        }
        return e;
    };

    if (typeOf(text) == 'string') {
        return formatString(text) || text;

    } else {
        return formatDom(text);

    }



};

JSTextUtilities.IsUrl = function(s) {
    if ((s.trim().indexOf(" ") >= 0)) return false;
    if ((s.trim().indexOf(".") < 0)) return false;
    if (s.trim().length < 3) return false;
    return true;

};
JSTextUtilities.FormatUrl = function(s, protocol) {
    var p = protocol || 'http';
    var url = s.trim();
    if (p.indexOf('://') < 0 && url.indexOf('://') < 0)
        p += "://";
    if (url.indexOf(p) != 0)
        url = p + url;
    return url;

};

JSTextUtilities.ClipHTMLString = function(text, options) {
    var config = ObjectAppend({
        leeway: 25, //plus or minus. trys not to break html tags, or end during a word
        fixHTML: true

    }, options);

    if (!config.length && config.length <= 0)
        throw 'Expected a valid integer value for options.length';

    if (text.length <= config.length) return [text, ''];

    var n = text.lastIndexOf('.', config.length);
    if (n > -1 && (config.length - n) < config.leeway) return [text.substring(0, n + 1), text.substring(n + 1)];

    var n = text.indexOf('.', config.length);
    if (n > -1 && (n - config.length) < config.leeway) return [text.substring(0, n + 1), text.substring(n + 1)];

    return [text.substring(0, config.length), text.substring(config.length)];

};


module.exports = JSTextUtilities;
