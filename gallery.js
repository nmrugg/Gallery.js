/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:true, undef:true, unused:true, curly:true, browser:true, node:true, indent:4, maxerr:50, globalstrict:true, nomen:false, white:true, newcap:true */

"use strict";

var execFile = require("child_process").execFile,
    fs       = require("fs"),
    path     = require("path"),
    server   = require("./server.js"),
    
    /// Third party dependancy
    mime = require("./mime/"),
    
    config = require("./config.js").config,
    
    create_thumbnail,
    
    server_config = {};


server_config.root_path = config.dir;

/// Make sure it is an absolute path.
config.base_path = path.resolve(config.base_path);

process.on("uncaughtException", function(e)
{
    ///NOTE: This does not work right in at least Node.js 0.6.15. The e.errno and e.code are the same for some reason. Do more research and maybe send a bug report.
    if (e.errno === 98) {
        console.log("Error: Unable to create server because port " + port + " is already is use.");
    } else if (e.errno === 13) {
        console.log("Error: You do not have permission to open port " + port + ".\nTry a port above 1023 or running \"sudo !!\"");
    } else {
        if (e.stack) {
            console.log("Error Stack:");
            console.log(e.stack);
        }
        console.log("Error:");
        console.log(e);
    }
    
    process.exit(e.errno);
});


function get_thumb_info(file)
{
    var ext = path.extname(file),
        thumb_dir = path.dirname(file) + "/" + config.thumbs_dir + "/",
        thumb_path,
        type;
    
    ///TODO: It should also incorporate the last modified time (mtime) to handle changes to already thumb'ed files.
    
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
            
            return config.base_path + "/";
        }());
    
    function random_str()
    {
        return Math.random().toString(36).substring(10);
    }
    
    function create_image_thumb(file, thumb_name, callback, max_size)
    {
        var args = [file, "-auto-orient", "-thumbnail", max_size + "x" + max_size];
        
        if (path.existsSync(file)) {
            if (!config.high_quality) {
                args[args.length] = "-quality";
                args[args.length] = 86;
            }
            
            args[args.length] = thumb_name;
            
            execFile("convert", args, function (err, stdout, stderr)
            {
                if (stderr) {
                    console.log("Error converting image");
                    console.log(stderr);
                }
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
            return new Array(+(zero > 0 && zero)).join("0") + num;
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
                if (stderr) {
                    console.log("Error animation 1:");
                    console.log(stderr);
                }
                /// Add the the play button watermark.
                ///TODO: Determine if this can be combined with another command.
                ///TODO: Make the play button scale if the image is too small.
                execFile("convert", [thumb_name, "-coalesce", "-gravity", "Center", "-geometry", "+0+0", "null:", config.base_path + "/images/play.png", "-layers", "composite", "-layers", "optimize", thumb_name], function (err, stdout, stderr)
                {

                    if (stderr) {
                        console.log("Error animation 2:");
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
                max_size = Math.floor(max_size / 2) * 2;
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
                        if (stderr) {
                            console.log("Error animation 3:");
                            console.log(stderr);
                        }
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
        };
    }());
    
    return function create_thumbnail(file, callback, max_size, overwrite)
    {
        var thumb_info = get_thumb_info(file);
        
        if (!path.existsSync(thumb_info.thumb_dir)) {
            fs.mkdirSync(thumb_info.thumb_dir, 777);
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


function walk_through_folders(dir, obj, callback)
{
    var content;
    
    if (dir.substr(-1) !== "/") {
        dir += "/";
    }
    
    fs.readdir(dir, function (err, content)
    {
        (function loop(i)
        {
            function iterate()
            {
                setTimeout(function ()
                {
                    loop(i - 1);
                }, 10);
            }
            
            if (i < 0) {
                loop = null;
                content = null;
                callback();
                return;
            }
            
            if (fs.statSync(dir + content[i]).isDirectory()) {
                console.log(i, content[i]);
                /// Check to see if we should enter into this folder.
                if (obj.check_dir(content[i], dir + content[i] + "/")) {
                    /// Skip this folder.
                    iterate();
                } else {
                    /// Enter into this folder.
                    setTimeout(function ()
                    {
                        walk_through_folders(dir + content[i] + "/", obj, iterate);
                    }, 10);
                }
            } else {
                /// This is needed both to let the server handle other requests as well as prevent exceeding the maximum stack size.
                setTimeout(function ()
                {
                    obj.action(dir + content[i], iterate);
                }, 10);
            }
        }(content.length - 1));
    });
}

function create_all_thumbnails()
{

    walk_through_folders(config.dir, {
        action: create_thumbnail, check_dir: function (name, pathname)
        {
            /// If this is a thumbnail folder, check for extra, straggling thumbnails.
            if (name === config.thumbs_dir) {
                fs.readdirSync(pathname).forEach(function (thumb)
                {
                    if (!path.existsSync(pathname + "../" + path.basename(thumb, path.extname(thumb)))) {
                        /// Delete thumbnails that do not have a matching file.
                        console.log("Deleting " + pathname + thumb);
                        fs.unlinkSync(pathname + thumb);
                    }
                });
                
                /// Return false to prevent walk_through_folders() from entering into the thumbnail folder.
                return true;
            }
            
            /// Allow walk_through_folders() to enter into the folder.
            return false;
        }
    }, function on_complete()
    {
        console.log("After walkthrough");
        setTimeout(create_all_thumbnails, config.create_thumbnail_delay);
    });
}

function get_files_or_dirs(dir, get_files)
{
    var content = fs.readdirSync(dir),
        i,
        is_dir,
        len,
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
        title = server.htmlentities(config.title);
    } else {
        title = beautify_name(dir) + " - " + server.htmlentities(config.title);
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
    
    return word.replace(/([^\W_]+[^\s\-]*) */g, function (match, p1, index, title)
    {
        if (index > 0 && index + p1.length !== title.length && p1.search(smallWords) > -1 && title.charAt(index - 2) !== ":" && title.charAt(index - 1).search(/[^\s\-]/) < 0) {
            return match.toLowerCase();
        }
    
        if (p1.substr(1).search(/[A-Z]|\../) > -1) {
            return match;
        }
        
        return match.charAt(0).toUpperCase() + match.substr(1);
    });
}


function beautify_name(name)
{
    return server.htmlentities(toTitleCase(path.basename(name, path.extname(name)).replace(/_/g, " ").replace(/^([1-2]\d\d\d)([01]\d)([0-3]\d)/, "$2/$3/$1").replace(/^([1-2]\d\d\d)([01]\d)/, "$1/$2")));
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
        html = "",
        thumb_info;
    
    if (dir.substr(-1) !== "/") {
        dir += "/";
    }
    
    html += "<div class=picpile><a href=\"" + server.htmlentities(rel_path) + "/\">";
    
    for (;;) {
        if (!content[i] || count === 5) {
            break;
        }
        
        if (!fs.statSync(dir + content[i]).isDirectory()) {
            thumb_info = get_thumb_info(dir + content[i]);
            if (thumb_info.exists) {
                html += "<img style=\"" + random_rotation_css(-15, 15) + "\" src=\"" + server.htmlentities(rel_path + "/" + thumb_info.thumb_path_rel) + "\">";
                count += 1;
            }
        }
        
        i += 1;
    }
    
    html += "<div class=caption>" + beautify_name(name) + "</div>";
    html += "</a></div>";
    return html;
}

setTimeout(create_all_thumbnails, 1000);

/// Start the server.
server.start_server(server_config, function (data, response)
{
    var basedir,
        dirs,
        files,
        i,
        len,
        thumb_info,
        stat;
    
    if (path.existsSync(data.filename)) {
        stat = fs.statSync(data.filename);
        if (stat.isDirectory()) {
            response.write_head(200, {"Content-Type": "text/html"});
            response.write(make_top_html(path.basename(data.uri.substr(0, data.uri.length - 1))));
            
            /// Display folders.
            dirs = get_files_or_dirs(data.filename, false);
            if (data.uri !== "/") {
                ///NOTE: There is an emdash, not a hyphen, because it looks better in the Euphoria font.
                response.write(make_picture_pile("<– Back", path.dirname(data.filename), ".."));
            }
            len = dirs.length;
            for (i = 0; i < len; i += 1) {
                response.write(make_picture_pile(dirs[i], path.join(data.filename, dirs[i]), dirs[i]));
            }
            
            /// Display thumbnails.
            files = get_files_or_dirs(data.filename, true);
            len = files.length;
            for (i = 0; i < len; i += 1) {
                /// Ignore dummy files.
                ///TODO: Make this configurable.
                if (files[i] !== "Thumbs.db") {
                    thumb_info = get_thumb_info(path.join(data.filename, files[i]));
                    if (thumb_info.exists) {
                        response.write("<div class=pic><a style=\"" + random_rotation_css(-6, 6) + "\" target=_blank title=\"" + beautify_name(files[i]) + "\" href=\"" + server.htmlentities(files[i]) + "\">");
                        response.write("<img onload=\"adjust_pic_width(this)\" src=\"" + server.htmlentities(thumb_info.thumb_path_rel) + "\">");
                    } else {
                        response.write("<div class=icon><a target=_blank title=\"" + beautify_name(files[i]) + "\" href=\"" + server.htmlentities(files[i]) + "\">");
                        /// If it has no icon, display a blank page icon in its stead.
                        response.write("<img src=\"/images/file-icon.png?virtual=1\">");
                    }
                    response.write("</a></div>");
                }
            }
            
            ///TODO: Display next folder (if any). (What about previous folder?)
            
            response.write(make_bottom_html());
        }
    } else if (data.get.virtual && path.existsSync(config.base_path + data.uri)) {
        /// Make sure it cannot access all files (just files in certain sub directories).
        basedir = path.dirname(data.uri);
        if (basedir === "/css" || basedir === "/client" || basedir === "/images" || basedir === "/fonts" || basedir === "/readme") {
            stat = fs.statSync(config.base_path + data.uri);
            /// Check cache.
            if (data.headers["if-modified-since"] && Date.parse(data.headers["if-modified-since"]) >= Date.parse(stat.mtime)) {
                response.write_head(304, {});
            } else {
                response.write_head(200, {"Content-Type": mime.lookup(data.uri), "Last-Modified": stat.mtime});
                response.write(fs.readFileSync(config.base_path + data.uri));
            }
        }
    }
    
    response.end();
});
