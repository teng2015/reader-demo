// 采用MVC架构,Model负责与服务器端的数据的交互,V负责渲染UI结构,Controller负责处理事件交互。

// todo 页面可以左右拖动回弹以及上下滚动到尽头时也有回弹效果,如何取消。
// todo 刷新页面读取上次的字号设置时,会有一个可见的字号改变效果,如何解决。

$(function () {
    "use strict";
    // 包装一个util方法用于在localstorage存取数剧并且为数据添加一个前缀。
    var util = (function () {
        var prefix = "h5_reader_";
        var storageGetter = function (key) {
            return localStorage.getItem(prefix + key);
        };
        var storageSetter = function (key, val) {
            return localStorage.setItem(prefix + key, val);
        };
        var itemRemove = function (key) {
            return localStorage.removeItem(prefix + key);
        };
        var getJSONP = function (url, callback) {
            $.jsonp({
                url: url,
                callback: "duokan_fiction_chapter",
                cache: true,
                success: function (result) {
                    var json = decodeURIComponent(escape($.base64.decode(result)));
                    callback && callback(json);
                }
            })
        };
        return {
            storageSetter: storageSetter,
            storageGetter: storageGetter,
            itemRemove: itemRemove,
            getJSONP: getJSONP
        }
    })();

    var setting = (function () {
        var key_font = "font_size",
            key_background = "background_color",
            key_night_mode_mask = "night_mode_mask",
            currentFontSize = parseInt(util.storageGetter(key_font)) || 14,
            currentBackground = util.storageGetter(key_background) || $("body").css("background-color"),
            night_mode_mask = util.storageGetter(key_night_mode_mask);

        var applyFontSetting = function () {
            util.storageSetter(key_font, currentFontSize);
            $("#fiction-content").css("font-size",currentFontSize);
        };
        var applyBgSetting = function () {
            util.storageSetter(key_background, currentBackground);
            $("body").css("background-color",currentBackground);
        };

        var increaseFontSize = function () {
            if (currentFontSize >= 18) {
                return;
            }
            currentFontSize += 1;
            applyFontSetting();
        };
        var decreaseFontSize = function () {
            if (currentFontSize <= 12) {
                return;
            }
            currentFontSize -= 1;
            applyFontSetting();
        };
        var changeBackground = function (bg) {

            currentBackground = typeof bg == "object"?bg.css("background-color"):bg;
            applyBgSetting()
        };
        var daytimeButton = function () {
            $(".button-daytime").removeClass("hidden").siblings().addClass("hidden");
            util.storageSetter(key_night_mode_mask,currentBackground);
            changeBackground($(".option-5"));
        };
        var nightButton = function () {
            $(".button-night").removeClass("hidden").siblings().addClass("hidden");
            changeBackground(util.storageGetter(key_night_mode_mask));
            util.itemRemove(key_night_mode_mask);

        };

        if (night_mode_mask) {
            daytimeButton();
        }


        applyFontSetting();
        applyBgSetting();

        return {
            increaseFontSize: increaseFontSize,
            decreaseFontSize: decreaseFontSize,
            changeBackground: changeBackground,
            daytimeButton: daytimeButton,
            nightButton: nightButton
            }
    })();

    var render,
        model;

    // 入口函数
    var main =function () {
        readerEventController();
        render = readerRender($("#fiction-content"));
        model = readerModel("12345", function (data) {
            render(data);
        });
        model.init();

    };

    // Model
    var readerModel = function (fic_id, UIcallback) {

        var chapter_id,
            chapterCount;

        // var init = function (UIcallback) {
        //     getFictionInfo(function () {
        //         getChapterContent(chapter_id, function (data) {
        //             UIcallback && UIcallback(data);
        //         });
        //     })
        // };

        var init = function (callback) {
            getFictionData().then(function () {
                getChapterWithID();
            });
        };
        
        // 获取chapter.json
        var getFictionData = function () {
            return new Promise(function (resolve, reject) {
                chapter_id = parseInt(util.storageGetter(fic_id + "_last_chapter"), 10);
                if (!chapter_id) {
                    $.get("./data/chapter.json", function (data) {
                        if (data.result == 0) {
                            chapter_id = data.chapters[1].chapter_id;
                            chapterCount = data.chapters.length;
                            util.storageSetter(fic_id + "_last_chapter", chapter_id);
                            resolve();
                        } else {
                            reject ({msg: "获取小说数据失败"});
                        }
                    }, "json")
                } else {
                    resolve();
                }
            });
        };

        // 获取data+chapter_id.json
        var getChapterWithID = function () {
            return new Promise(function (resolve, reject) {
                $.get("./data/data" + chapter_id + ".json", function (data) {
                    if (data.result == 0){
                        util.getJSONP(data.jsonp, UIcallback);
                        util.storageSetter(fic_id + "_last_chapter", chapter_id);
                        resolve();
                    } else {
                        reject(new Error("获取章节数据失败"));
                    }
                }, "json");
            });
        };


        var nextChapter = function () {
            if (chapter_id == chapterCount) {
                // 已经是最后一章
                return;
            }
            chapter_id += 1;
            getChapterWithID();
            $(window).scrollTop(0);
        };

        var prevChapter = function () {
            if (chapter_id == 1) {
                // 已经是第一章了
                return;
            }
            chapter_id -= 1;
            getChapterWithID();
            $(window).scrollTop(0);

        };
        return {
            init: init,
            nextChapter: nextChapter,
            prevChapter: prevChapter
        }
    };
    
    // View
    var readerRender = function (container) {
        // 根据json数据渲染界面
        var parseChapterData = function (json) {
            var jsonObj = JSON.parse(json);
            var html = "<h4>" + jsonObj.t + "</h4>";
            for (var i = 0; i < jsonObj.p.length; i++) {
                html += "<p>" + jsonObj.p[i] + "</p>";
            }
            return html;
        };
        // container.html = html;
        return function (data) {
            container.html(parseChapterData(data));
        }
    };
    
    // Controller
    var readerEventController = function () {
        // 点击中间区域控制上下导航显隐
        $("#control-mid").on("click", function () {
            $("#nav-top-wrapper, #nav-bottom-wrapper").toggleClass("hidden");
            $(".nav-bottom-submenu").addClass("hidden");
            $(".button-font>.button-icon").removeClass("active");
        });
        // 点击字体按钮控制次级次级导航的显隐
        $(".nav-bottom-menu .button-font").on("click", function () {
            $(".nav-bottom-submenu").toggleClass("hidden");
            $(this).find(".button-icon").toggleClass("active");
        });
        // 增大字号
        $(".increase-font").on("click", function () {
            setting.increaseFontSize();
        });
        // 减小字号
        $(".decrease-font").on("click", function () {
            setting.decreaseFontSize();
        });
        // 改变背景
        $(".bg-optiion").on("click", function () {
            setting.changeBackground($(this));
        });
        // 夜间模式
        $(".button-night").on("click", function () {
            setting.daytimeButton();
        });
        // 日间模式
        $(".button-daytime").on("click", function () {
            setting.nightButton();
        });
        // 滚动屏幕隐藏所有导航栏
        $(window).on("scroll", function () {
            $("#nav-bottom-wrapper, #nav-top-wrapper, .nav-bottom-submenu").addClass("hidden");
        });
        // 下一章
        $("#next-button").on("click", function () {
            model.nextChapter(function (data) {
                render(data);
            });
        });
        // 上一章
        $("#prev-button").on("click", function () {
            model.prevChapter(function (data) {
                render(data);
            })
        })
    };

    main();
});