this.config = {
    create_thumbnail_delay: 86400000, /// 24 hours
    debug:        false,
    dir:          "/path/to/media/",
    base_path:    "/path/to/gallery.js/",
    high_quality: true,
    thumbs_dir:   ".thumbs",
    title:        "Gallery.js",
    port:         8888,
    /// An array of regular expressions used to ignore files.
    ///NOTE: file names are converted to lowercase before comparing
    /// E.g., /^dsci\d{4,}\.jpg$/ will ignore file like "dsci0001.jpg"
    ignore:       [/^thumbs\.db$/],
    
    /// Optional authentification settings
    protect:  false,
    username: "user",
    password: "pass"
};
