/*jslint node: true, nomen: true, white: true, indent: 4 */

/// For help: node server.js --help

var execFile = require("child_process").execFile,
    fs    = require("fs"),
    http  = require("http"),
    path  = require("path"),
    url   = require("url"),
    qs    = require("querystring"),
    
    /// Third party dependancy
    mime = require("./mime/"),
    
    config = require("./config.js").config,
    
    create_thumbnail,
    htmlentities,
    
    port = 8888;

/*
process.on("uncaughtException", function(e)
{
    if (e.errno === 98) {
        console.log("Error: Unable to create server because port " + port + " is already is use.");
    } else if (e.errno === 13) {
        console.log("Error: You do not have permission to open port " + port + ".\nTry a port above 1023 or running \"sudo !!\"");
    } else {
        console.log("Error: " + e.message);
    }
    
    process.exit(e.errno);
});
*/

htmlentities = (function ()
{
    var entities = {
        /// Double Quote
        "\u0022": "&quot;",
        "\u0026": "&amp;",
        /// Single Quote
        "\u0027": "&#39;",
        "\u003c": "&lt;",
        "\u003e": "&gt;",
        "\u00a0": "&nbsp;",
        "\u00a1": "&iexcl;",
        "\u00a2": "&cent;",
        "\u00a3": "&pound;",
        "\u00a4": "&curren;",
        "\u00a5": "&yen;",
        "\u00a6": "&brvbar;",
        "\u00a7": "&sect;",
        "\u00a8": "&uml;",
        "\u00a9": "&copy;",
        "\u00aa": "&ordf;",
        "\u00ab": "&laquo;",
        "\u00ac": "&not;",
        "\u00ad": "&shy;",
        "\u00ae": "&reg;",
        "\u00af": "&macr;",
        "\u00b0": "&deg;",
        "\u00b1": "&plusmn;",
        "\u00b2": "&sup2;",
        "\u00b3": "&sup3;",
        "\u00b4": "&acute;",
        "\u00b5": "&micro;",
        "\u00b6": "&para;",
        "\u00b7": "&middot;",
        "\u00b8": "&cedil;",
        "\u00b9": "&sup1;",
        "\u00ba": "&ordm;",
        "\u00bb": "&raquo;",
        "\u00bc": "&frac14;",
        "\u00bd": "&frac12;",
        "\u00be": "&frac34;",
        "\u00bf": "&iquest;",
        "\u00c0": "&Agrave;",
        "\u00c1": "&Aacute;",
        "\u00c2": "&Acirc;",
        "\u00c3": "&Atilde;",
        "\u00c4": "&Auml;",
        "\u00c5": "&Aring;",
        "\u00c6": "&AElig;",
        "\u00c7": "&Ccedil;",
        "\u00c8": "&Egrave;",
        "\u00c9": "&Eacute;",
        "\u00ca": "&Ecirc;",
        "\u00cb": "&Euml;",
        "\u00cc": "&Igrave;",
        "\u00cd": "&Iacute;",
        "\u00ce": "&Icirc;",
        "\u00cf": "&Iuml;",
        "\u00d0": "&ETH;",
        "\u00d1": "&Ntilde;",
        "\u00d2": "&Ograve;",
        "\u00d3": "&Oacute;",
        "\u00d4": "&Ocirc;",
        "\u00d5": "&Otilde;",
        "\u00d6": "&Ouml;",
        "\u00d7": "&times;",
        "\u00d8": "&Oslash;",
        "\u00d9": "&Ugrave;",
        "\u00da": "&Uacute;",
        "\u00db": "&Ucirc;",
        "\u00dc": "&Uuml;",
        "\u00dd": "&Yacute;",
        "\u00de": "&THORN;",
        "\u00df": "&szlig;",
        "\u00e0": "&agrave;",
        "\u00e1": "&aacute;",
        "\u00e2": "&acirc;",
        "\u00e3": "&atilde;",
        "\u00e4": "&auml;",
        "\u00e5": "&aring;",
        "\u00e6": "&aelig;",
        "\u00e7": "&ccedil;",
        "\u00e8": "&egrave;",
        "\u00e9": "&eacute;",
        "\u00ea": "&ecirc;",
        "\u00eb": "&euml;",
        "\u00ec": "&igrave;",
        "\u00ed": "&iacute;",
        "\u00ee": "&icirc;",
        "\u00ef": "&iuml;",
        "\u00f0": "&eth;",
        "\u00f1": "&ntilde;",
        "\u00f2": "&ograve;",
        "\u00f3": "&oacute;",
        "\u00f4": "&ocirc;",
        "\u00f5": "&otilde;",
        "\u00f6": "&ouml;",
        "\u00f7": "&divide;",
        "\u00f8": "&oslash;",
        "\u00f9": "&ugrave;",
        "\u00fa": "&uacute;",
        "\u00fb": "&ucirc;",
        "\u00fc": "&uuml;",
        "\u00fd": "&yacute;",
        "\u00fe": "&thorn;",
        "\u00ff": "&yuml;"
    };
    
    function enc(symbol)
    {
        return entities[symbol];
    }
    /*
    return function (str, options)
    {
        var regex_str = "\u0027\u003c\u003e\u00a0-\u00ff";
        
        if (!options || !options.ignore_double_quote) {
            regex_str += "\u0022";
        }
        if (!options || !options.ignore_single_quote) {
            regex_str += "\u0026";
        }
        
        return String(str).replace(new RegExp("[" + regex_str + "]", "g"), enc);
    };
    */
    return function (str)
    {
        return String(str).replace(/[\u0022\u0026\u0027\u003c\u003e\u00a0-\u00ff]/g, enc);
    };
}());

function get_thumb_info(file)
{
    var ext = path.extname(file),
        thumb_dir = path.dirname(file) + "/" + config.thumbs_dir + "/",
        thumb_path,
        type;
    
    switch (ext.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
    case ".jpe":
    case ".png":
    case ".gif":
    case ".bmp":
    case ".tga":
    case ".tif":
    case ".tiff":
    case ".xcf":
    case ".psd":
    case ".ico":
    case ".cur":
    case ".jp2":
    case ".svg":
    case ".crw":
    case ".cr2":
        thumb_path = thumb_dir + path.basename(file) + ".jpg";
        type = "img";
        break;
    case ".avi":
    case ".mpg":
    case ".mpeg":
    case ".mp4":
    case ".mp4v":
    case ".mpg4":
    case ".mpe":
    case ".mlv":
    case ".m2v":
    case ".ogv":
    case ".flv":
    case ".mov":
    case ".qt":
    case ".dvd":
    case ".wmv":
    case ".wm":
        thumb_path = thumb_dir + path.basename(file) + ".gif";
        type = "vid";
        break;
    default:
    }
    
    return {
        exists:         path.existsSync(thumb_path),
        thumb_dir:      thumb_dir,
        thumb_path:     thumb_path,
        thumb_path_rel: config.thumbs_dir + "/" + path.basename(thumb_path),
        type:           type
    };
}

/// Load thumbnailer
create_thumbnail = (function ()
{
    var create_video_thumbnail,
        default_size = 176,
        tmp_dir = (function ()
        {
            if (path.existsSync("/tmp/")) {
                return "/tmp/";
            } else if (path.existsSync("C:\\Windows\temp\\")) {
                return "C:\\Windows\\temp\\";
            } else if (path.existsSync("C:\\temp\\")) {
                return "C:\\temp\\";
            }
            
            return process.cwd() + "/";
        }());
    
    function random_str()
    {
        return Math.random().toString(36).substring(10);
    }
    
    function create_image_thumb(file, thumb_name, callback, max_size)
    {
        if (path.existsSync(file)) {
            execFile("convert", [file, "-auto-orient", "-thumbnail", max_size + "x" + max_size, thumb_name], function (err, stdout, stderr)
            {
                if (typeof callback === "function") {
                    callback(thumb_name);
                }
            });
        }
    }
    
    create_video_thumbnail = (function ()
    {
        function zeroPad(num, places)
        {
            var zero = places - num.toString().length + 1;
            return Array(+(zero > 0 && zero)).join("0") + num;
        }
        
        function create_animation(files, thumb_name, callback)
        {
            var args = ["-loop", 0],
                i,
                len = files.length;
            
            for (i = 0; i < len; i += 1) {
                args[args.length] = "-delay";
                args[args.length] = 60;
                args[args.length] = files[i];
            }
            
            if (!config.high_quality) {
                /// By adding a global color map, it reduces the size but also (potentially) the quality.
                args[args.length] = "+map";
            }
            args[args.length] = thumb_name;
            
            execFile("convert", args, function (err, stdout, stderr)
            {
                /// Add the the play button watermark.
                ///TODO: Determine if this can be combined with another command.
                ///TODO: Make the play button scale if the image is too small.
                execFile("convert", [thumb_name, "-coalesce", "-gravity", "Center", "-geometry", "+0+0", "null:", "./images/play.png", "-layers", "composite", "-layers", "optimize", thumb_name], function (err, stdout, stderr)
                {

                    if (stderr) {
                        console.log(stderr);
                    }
                    
                    for (i = 0; i < len; i += 1) {
                        fs.unlink(files[i]);
                    }
                    
                    if (typeof callback === "function") {
                        callback(thumb_name);
                    }
                });
            });
        }
        
        /**
        * Get the size and duration of a video file (in seconds, not including miliseconds).
        */
        function get_video_info(video, callback)
        {
            if (typeof callback !== "function") {
                return;
            }
            
            if (path.existsSync(video)) {
                execFile("ffmpeg", ["-i", video], function (err, stdout, stderr)
                {
                    ///NOTE: The data is returned in stderr.
                    var dur_matches  = stderr.match(/Duration: (\d\d):(\d\d):(\d\d)\.(\d\d)/),
                        size_matches = stderr.match(/Stream #[^\n]* (\d+)x(\d+)/),
                        duration,
                        size;
                    
                    if (dur_matches.length && dur_matches.length > 3) {
                        duration = Number(dur_matches[1]) * 360 + Number(dur_matches[2]) * 60 + Number(dur_matches[3]);
                    }
                    
                    if (size_matches.length && size_matches.length > 2) {
                        size = {width: Number(size_matches[1]), height: Number(size_matches[2])};
                    }
                    
                    callback({duration: duration, size: size});
                });
            } else {
                callback(false);
            }
        }
        
        return function create_video_thumbnail(video, thumb_name, main_callback, max_size, total_thumbs)
        {
            if (!total_thumbs) {
                total_thumbs = 10;
            }
            
            ///NOTE: max_size must be a multiple of 2 (an FFMPEG requriment).
            if (!max_size) {
                max_size = default_size;
            } else {
                max_size = Math.floor(max_size/ 2) * 2;
            }
            
            get_video_info(video, function (info)
            {
                var files = [],
                    interval = info.duration / total_thumbs,
                    thumb_size,
                    extra_str = random_str(),
                    places = String(total_thumbs).length;
                
                ///NOTE: Both width and height must be a multiple of 2 (an FFMPEG requriment).
                if (info.size.width > info.size.height) {
                    thumb_size = max_size + "x" + (Math.floor(((max_size / info.size.width) * info.size.height) / 2) * 2);
                } else {
                    thumb_size = (Math.floor(((max_size / info.size.height) * info.size.width) / 2) * 2) + "x" + max_size;
                }
                
                function make_thumb(i, callback)
                {
                    var frame_thumb_name = tmp_dir + video.replace(/[\\\/]/g, "_") + extra_str + "thumb_" + zeroPad(i, places) + ".jpg";
                    files[files.length] = frame_thumb_name;
                    
                    execFile("ffmpeg", ["-ss", i * interval, "-i", video, "-vframes", 1, "-s", thumb_size, frame_thumb_name], function (err, stdout, stderr)
                    {
                        callback();
                    });
                }
                
                function loop(i)
                {
                    make_thumb(i, function ()
                    {
                        i += 1;
                        if (i < total_thumbs) {
                            loop(i);
                        } else {
                            create_animation(files, thumb_name, main_callback);
                        }
                    });
                }
                
                loop(0);
            });
        }
    }());
    
    return function create_thumbnail(file, callback, max_size, overwrite)
    {
        var thumb_info = get_thumb_info(file);
        
        if (!path.existsSync(thumb_info.thumb_dir)) {
            fs.mkdirSync(thumb_info.thumb_dir, 0777);
        }
        
        if (!max_size) {
            max_size = default_size;
        }
        
        if (thumb_info.type) {
            if (overwrite || !thumb_info.exists) {
                if (thumb_info.type === "img") {
                    create_image_thumb(file, thumb_info.thumb_path, callback, max_size);
                } else {
                    create_video_thumbnail(file, thumb_info.thumb_path, callback, max_size);
                }
            } else {
                if (typeof callback === "function") {
                    callback(thumb_info.thumb_path);
                }
            }
        } else {
            callback(false);
        }
    };
}());


function walk_through_folders(dir, func, callback)
{
    var content,
        i;
    
    if (dir.substr(-1) !== "/") {
        dir += "/";
    }
    
    content = fs.readdirSync(dir);
    
    function loop(i)
    {
        function iterate()
        {
            loop(i - 1);
        }
        
        if (i < 0) {
            callback();
            return;
        }
        
        if (fs.statSync(dir + content[i]).isDirectory()) {
            if (content[i] === config.thumbs_dir) {
                iterate();
            } else {
                walk_through_folders(dir + content[i] + "/", func, iterate);
            }
        } else {
            func(dir + content[i], iterate);
        }
    }
    
    loop(content.length - 1);
}

function create_all_thumbnails()
{
    function check_for_duplicates(dir)
    {
        var content,
            i,
            j,
            thumbs;
        
        if (dir.substr(-1) !== "/") {
            dir += "/";
        }
        
        content = fs.readdirSync(dir);
        
        for (i = content.length - 1; i >= 0; i -= 1) {
            if (fs.statSync(dir + content[i]).isDirectory()) {
                if (content[i] === config.thumbs_dir) {
                    thumbs = fs.readdirSync(dir + content[i] + "/");
                    for (j = thumbs.length - 1; j >= 0; j -= 1) {
                        if (!path.existsSync(dir + path.basename(thumbs[j], path.extname(thumbs[j])))) {
                            fs.unlinkSync(dir + content[i] + "/" + thumbs[j]);
                        }
                    }
                } else {
                    check_for_duplicates(dir + content[i] + "/");
                }
            }
        }
    }
    
    walk_through_folders(config.dir, create_thumbnail, function ()
    {
        check_for_duplicates(config.dir);
        setTimeout(create_all_thumbnails, config.create_thumbnail_delay);
    });
}

function get_files_or_dirs(dir, get_files)
{
    var content = fs.readdirSync(dir),
        is_dir,
        stuff = [];
    
    content.sort(function case_insensitive(a, b)
    {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });
    
    if (dir.substr(-1) !== "/") {
        dir += "/";
    }
    
    len = content.length;
    
    for (i = 0; i < len; i += 1) {
        is_dir = fs.statSync(dir + content[i]).isDirectory();
        if (get_files && !is_dir) {
            stuff[stuff.length] = content[i];
        } else if (!get_files && is_dir && content[i] !== config.thumbs_dir) {
            stuff[stuff.length] = content[i];
        }
    }
    
    return stuff;
}

function make_top_html(dir)
{
    var html = "",
        title;
    
    dir = String(dir).trim();
    
    if (dir === "") {
        title = htmlentities(config.title);
    } else {
        title = beautify_name(dir) + " - " + htmlentities(config.title);
    }
    
    html += "<html>";
    html += "<head>";
    html += "<meta http-equiv=content-type content=\"text/html;charset=UTF-8\">";
    html += "<title>" + title + "</title>";
    html += "<link rel=\"stylesheet\" href=\"/css/styles.css?virtual=1\">";
    html += "<script src=\"/client/main.js?virtual=1\"></script>";
    html += "</head>";
    html += "<body>";
    
    return html;
}
function make_bottom_html()
{
    var html = "";
    
    html += "</body>";
    html += "</html>";
    
    return html;
}

function toTitleCase(word)
{
    var smallWords = /^(a(?:nd?|s|t)?|b(?:ut|y)|en|for|i(?:f|n)|o(?:f|n|r)|t(?:he|o)|v(?:s?\.?|ia))$/i;
    
    return word.replace(/([^\W_]+[^\s-]*) */g, function (match, p1, index, title)
    {
        if (index > 0 && index + p1.length !== title.length && p1.search(smallWords) > -1 && title.charAt(index - 2) !== ":" && title.charAt(index - 1).search(/[^\s-]/) < 0) {
            return match.toLowerCase();
        }
    
        if (p1.substr(1).search(/[A-Z]|\../) > -1) {
            return match;
        }
        
        return match.charAt(0).toUpperCase() + match.substr(1);
    });
};


function beautify_name(name)
{
    return htmlentities(toTitleCase(path.basename(name, path.extname(name)).replace(/_/g, " ").replace(/^([1-2]\d\d\d)([01]\d)([0-3]\d)/, "$2/$3/$1").replace(/^([1-2]\d\d\d)([01]\d)/, "$1/$2")));
}

function random_rotation_css(min, max)
{
    var amt = Math.floor(Math.random() * (max - min + 1)) + min;
    
    return "-moz-transform: rotate(" + amt + "deg);-webkit-transform: rotate(" + amt + "deg);transform: rotate(" + amt + "deg);";
}

function make_picture_pile(name, dir, rel_path)
{
    var content = fs.readdirSync(dir),
        i = 0,
        count = 0,
        html = "";
    
    if (dir.substr(-1) !== "/") {
        dir += "/";
    }
    
    html += "<div class=picpile><a href=\"" + htmlentities(rel_path) + "/\">";
    
    for (;;) {
        if (!content[i] || count === 5) {
            break;
        }
        
        if (!fs.statSync(dir + content[i]).isDirectory()) {
            thumb_info = get_thumb_info(dir + content[i]);
            if (thumb_info.exists) {
                html += "<img style=\"" + random_rotation_css(-15, 15) +"\" src=\"" + htmlentities(rel_path + "/" + thumb_info.thumb_path_rel) + "\">";
                count += 1;
            }
        }
        
        i += 1;
    }
    
    html += "<div class=caption>" + beautify_name(name) + "</div>";
    html += "</a></div>";
    return html;
}

setTimeout(create_all_thumbnails, 0);


/// Start the server.
http.createServer(function (request, response)
{
    var cookies,
        filename,
        get_data,
        post_data,
        uri,
        url_parsed = url.parse(request.url);
    
    /// If the gallery is password protected, check for credentials.
    ///NOTE: This method is not secure and should not be used over a public connection.
    ///NOTE: .substr(6) is to remove the text "Basic " preceeding the usernamd and password.
    if (config.protect && (!request.headers.authorization || new Buffer(request.headers.authorization.substr(6), "base64").toString("utf8") !== config.username + ":" + config.password)) {
        response.writeHead(401, {"Content-Type": "text/html", "WWW-Authenticate": "Basic realm=\"Secure Area\""});
        response.write("Unauthorized");
        response.end();
        return;
    }
    
    uri = qs.unescape(url_parsed.pathname);
    
    /// A valid request must begin with a slash.
    if (uri[0] !== "/") {
        response.end();
        return;
    }
    
    filename = path.join(config.dir, uri);
    
    function request_page()
    {
        var dirs,
            files,
            i,
            len,
            thumb_info,
            stat;
        
        if (path.existsSync(filename)) {
            stat = fs.statSync(filename);
            if (stat.isDirectory()) {
                response.writeHead(200, {"Content-Type": "text/html"});
                response.write(make_top_html(path.basename(uri.substr(0, uri.length - 1))));
                
                /// Display folders.
                dirs = get_files_or_dirs(filename, false);
                if (uri !== "/") {
                    ///NOTE: There is an emdash, not a hyphen, because it looks better in the Euphoria font.
                    response.write(make_picture_pile("<– Back", path.dirname(filename), ".."));
                }
                len = dirs.length;
                for (i = 0; i < len; i += 1) {
                    response.write(make_picture_pile(dirs[i], path.join(filename, dirs[i]), dirs[i]));
                    //response.write("<div><a href=\"" + htmlentities(dirs[i]) + "/\" title=\"" + beautify_name(dirs[i]) + "\">" + htmlentities(dirs[i]) + "</a></div>");
                }
                
                /// Display thumbnails.
                files = get_files_or_dirs(filename, true);
                len = files.length;
                for (i = 0; i < len; i += 1) {
                    /// Ignore dummy files.
                    ///TODO: Make this configurable.
                    if (files[i] !== "Thumbs.db") {
                        thumb_info = get_thumb_info(path.join(filename, files[i]));
                        if (thumb_info.exists) {
                            response.write("<div class=pic><a style=\"" + random_rotation_css(-6, 6) +"\" target=_blank title=\"" + beautify_name(files[i]) + "\" href=\"" + htmlentities(files[i]) + "\">");
                            response.write("<img onload=\"adjust_pic_width(this)\" src=\"" + htmlentities(thumb_info.thumb_path_rel) + "\">");
                        } else {
                            response.write("<div class=icon><a target=_blank title=\"" + beautify_name(files[i]) + "\" href=\"" + htmlentities(files[i]) + "\">");
                            /// If it has no icon, display a blank page icon in its stead.
                            response.write("<img src=\"/images/file-icon.png?virtual=1\">");
                        }
                        response.write("</a></div>");
                    }
                }
                
                response.write(make_bottom_html());
                
            /// Write out files.
            } else {
                /// Check cache.
                if (request.headers["if-modified-since"] && Date.parse(request.headers["if-modified-since"]) >= Date.parse(stat.mtime)) {
                    response.writeHead(304, {"Content-Type": mime.lookup(filename)});
                } else {
                    response.writeHead(200, {"Content-Type": mime.lookup(filename), "Last-Modified": stat.mtime});
                    response.write(fs.readFileSync(filename));
                }
            }
        } else if (get_data.virtual && path.existsSync(process.cwd() + uri)) {
            stat = fs.statSync(process.cwd() + uri);
            ///TODO: Make sure it cannot access all files (just files in certain sub directories.
            /// Check cache.
            if (request.headers["if-modified-since"] && Date.parse(request.headers["if-modified-since"]) >= Date.parse(stat.mtime)) {
                response.writeHead(304, {"Content-Type": mime.lookup(uri)});
            } else {
                response.writeHead(200, {"Content-Type": mime.lookup(uri), "Last-Modified": stat.mtime});
                response.write(fs.readFileSync(process.cwd() + uri));
            }
        }
        
        response.end();
    }
    
    /// Are there cookies?
    if (request.headers.cookie) {
        cookies = {};
        request.headers.cookie.split(";").forEach(function (cookie)
        {
            var parts = cookie.split("=");
            cookies[parts[0]] = parts[1];
        });
    }
    
    /// Is there GET data?
    if (url_parsed.query !== "") {
        ///NOTE: GET data can be retrieved in node.js scripts via the following code:
        get_data = qs.parse(url_parsed.query);
    }
    
    /// Is there POST data?
    if (request.method === "POST") {
    
        post_data = "";
        
        request.on("data", function(chunk)
        {
            /// Get the POST data.
            post_data += chunk.toString();
        });
        
        request.on("end", function(chunk)
        {
            ///NOTE: POST data can be retrieved in node.js scripts via the following code:
            post_data = qs.parse(post_data);
            request_page();
        });
    } else {
        request_page();
    }
    
}).listen(port);
