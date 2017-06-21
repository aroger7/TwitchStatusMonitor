var transitionEnd = "transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd";

$(document).ready(function () {
    var channelNames = getStoredChannelNames();
    getChannelData(channelNames, addChannels);

    bindFilterButtonClickHandlers();
    $(".form-add-channel").submit(function (e) {
        e.preventDefault();
        var $textbox = $(e.target).closest(".form-add-channel").children(".textbox");
        var val = $textbox.val();
        $textbox.val("");
        if (val.length > 0) {
            getChannelData([val], addChannels);
        }
    });
});

function addStoredChannelName(channelName) {
    var storedChannelNames = getStoredChannelNames();
    if (storedChannelNames.indexOf(channelName) == -1) {
        storedChannelNames.push(channelName);
        setStoredChannelNames(storedChannelNames);
    }
}

function removeStoredChannelName(channelName) {
    var storedChannelNames = getStoredChannelNames();
    var index = storedChannelNames.indexOf(channelName);
    if (index >= 0) {
        storedChannelNames.splice(index, 1);
        setStoredChannelNames(storedChannelNames);
    }
}

function getStoredChannelNames() {
    var channelNamesString = localStorage.getItem("channelSearchNames");
    if (channelNamesString) {
        return channelNamesString.split("/");
    }

    return [];
}

function setStoredChannelNames(channelNames) {
    var channelNamesString = channelNames.join("/");
    localStorage.setItem("channelSearchNames", channelNamesString);
}

function stringCompareLowercase(str1, str2) {
    return str1.toLowerCase().localeCompare(str2.toLowerCase());
}

function getChannelData(channelNames, callback) {
    var channelDataCollection = {};
    var requests = [];

    if (channelNames.length == 0 && callback) {
        callback([]);
        return;
    }

    for (var i = 0; i < channelNames.length; i++) {
        channelName = channelNames[i];
        channelDataCollection[channelName] = {
            searchName: channelName,
            channel: null,
            stream: null
        };
        var url = "https://wind-bow.gomix.me/twitch-api/channels/" + channelName + "?callback=?";
        (function (channelName) {
            requests.push($.getJSON(url, function (json) {
                channelDataCollection[channelName].channel = json;
            }));
            url = "https://wind-bow.gomix.me/twitch-api/streams/" + channelName + "?callback=?";
            requests.push($.getJSON(url, function (json) {
                channelDataCollection[channelName].stream = json;
            }));
        })(channelName);
    }

    $.when.apply($, requests).done(function () {
        if (callback) {
            var channelDataArr = Object.keys(channelDataCollection).map(function (key) {
                return channelDataCollection[key]
            });
            callback(channelDataArr);
        }
    });
}

function fadeIn($selector, duration, callback) {
    var visibleCount = $selector.get().filter(function (o) {
        return $(o).css("opacity") === 1;
    }).length;
    
    if(visibleCount === $selector.length) {
        if(callback) {
            callback();
        }
        return;
    }
    
    $selector.addClass("is-invisible");
    if (duration === "slow") {
        $selector.addClass("slow-fade");
    } else {
        $selector.addClass("fade");
    }

    $selector.removeClass("is-invisible");
    $selector.one(transitionEnd, function (e) {
        $(e.target).removeClass("fade slow-fade");
        visibleCount++;
        if (visibleCount === $selector.length && callback) {
            callback();
        }
    });
}

function fadeOut($selector, duration, callback) {
    var invisibleCount = $selector.get().filter(function (o) {
        return $(o).css("opacity") === 0;
    }).length;

    if (invisibleCount == $selector.length) {
        if (callback) {
            callback();
        }
        return;
    }

    $selector.removeClass("is-invisible");
    if (duration === "slow") {
        $selector.addClass("slow-fade");
    } else {
        $selector.addClass("fade");
    }

    $selector.addClass("is-invisible");
    $selector.one(transitionEnd, function (e) {
        $(e.target).removeClass("fade slow-fade");
        invisibleCount++;
        if (invisibleCount === $selector.length && callback) {
            callback();
        }
    });
}

function addChannels(channelData) {
    var $sectionTitleSelector = $(".section-channels--list--msg-empty");

    if (channelData.length > 0) {
        if (!$sectionTitleSelector.hasClass("is-hidden")) {
            fadeOut($sectionTitleSelector, "", function () {
                $sectionTitleSelector.addClass("is-hidden");
                drawChannels(channelData);
            });
        } else {
            drawChannels(channelData);
        }
    } else if ($(".card").length == 0) {
        $sectionTitleSelector.removeClass("is-hidden").outerWidth();
        fadeIn($sectionTitleSelector);
    }
}

function drawChannels(channelData) {
    var $list;
    var $cards = $("");

    for (var i = 0; i < channelData.length; i++) {
        if (isChannelAdded(channelData[i])) {
            continue;
        }

        var $newCard = getChannelCardElement(channelData[i]);
        $newCard.addClass("is-collapsed");
        var $newCardListItem = $("<li />", {
            class: "list--item"
        });
        $newCardListItem.append($newCard);

        if (isChannelOnline(channelData[i])) {
            $list = $("#channel-list-online");
        } else if (isChannelOffline(channelData[i])) {
            $list = $("#channel-list-offline");
        } else {
            $list = $("#channel-list-other");
        }

        if ($list.children().length == 0) {
            $list.append($newCardListItem);
        } else {
            var searchNames = $list.children().get().reduce(function (acc, val) {
                var $card = $(val).children(".card");
                acc.push($card.data("channelData").searchName);
                return acc;
            }, []);

            var searchNameToAdd = $newCard.data("channelData").searchName;

            if (stringCompareLowercase(searchNameToAdd, searchNames[0]) < 0) {
                $($list.children().get(0)).before($newCardListItem);
            } else {
                var j;
                for (j = 0; j < searchNames.length - 1; j++) {
                    var searchName = searchNames[j];
                    var nextSearchName = searchNames[j + 1];
                    if (stringCompareLowercase(searchNameToAdd, searchName) > 0 &&
                        stringCompareLowercase(searchNameToAdd, nextSearchName) < 0) {
                        break;
                    }
                }

                $($list.children().get(j)).after($newCardListItem);
            }

        }

        addStoredChannelName(channelData[i].searchName);
        expandVertical($newCard, 400);
    }
}

function isChannelAdded(channelData) {
    return $(".card").get().filter(function (e) {
        var searchName = $(e).data("channelData").searchName;
        return stringCompareLowercase(searchName, channelData.searchName) === 0;
    }).length > 0;
}

function isChannelOnline(channelData) {
    return !isChannelNonExistent(channelData) && channelData.stream.stream;
}

function isChannelOffline(channelData) {
    return !isChannelNonExistent(channelData) && !channelData.stream.stream;
}

function isChannelNonExistent(channelData) {
    return !channelData || !channelData.channel || channelData.channel.status == 404 || channelData.channel.status == 422;
}

function bindFilterButtonClickHandlers() {
    $("#filter-all-button").on("change", onFilterAllChange);
    $("#filter-online-button").on("change", onFilterOnlineChange);
    $("#filter-offline-button").on("change", onFilterOfflineChange);
}

function unbindFilterButtonClickHandlers() {
    $("#filter-all-button").off("change", onFilterAllChange);
    $("#filter-online-button").off("change", onFilterOnlineChange);
    $("#filter-offline-button").off("change", onFilterOfflineChange);
}

function enableFilterButtons() {
    $("#filter-all-button, #filter-online-button, #filter-offline-button").prop("disabled", false);
}

function disableFilterButtons() {
    $("#filter-all-button, #filter-online-button, #filter-offline-button").prop("disabled", true);
}

function onFilterAllChange(e) {
    if (e.target.checked) {
        disableFilterButtons();
        expandVertical($("#channel-list-online, #channel-list-offline, #channel-list-other"), 600, function () {
            enableFilterButtons();
        });
    }
}

function onFilterOnlineChange(e) {
    if (e.target.checked) {
        disableFilterButtons();
        collapseVertical($("#channel-list-offline, #channel-list-other"), 600, function () {
            expandVertical($("#channel-list-online"), 600, function () {
                enableFilterButtons();
            });
        });
    }
}

function onFilterOfflineChange(e) {
    if (e.target.checked) {
        disableFilterButtons();
        collapseVertical($("#channel-list-online, #channel-list-other"), 600, function () {
            expandVertical($("#channel-list-offline"), 600, function () {
                enableFilterButtons();
            });
        });
    }
}

function onRemoveClick(e) {
    var $selector = $(e.target).closest(".card");
    removeStoredChannelName($selector.data("channelData").searchName);
    $selector = $selector.closest(".list--item");
    collapseVertical($selector, 200, function () {
        $selector.remove();
        if($(".card").length == 0) {
            var $sectionTitleSelector = $(".section-channels-list--msg-empty");
            $sectionTitleSelector.removeClass("is-hidden").outerWidth();
            fadeIn($sectionTitleSelector, "slow");
        }
    });
}

function expandVertical($selector, duration, callback) {
    $selector.each(function (n, e) {
        $element = $(e);
        if ($element.hasClass("is-collapsed")) {
            $element.removeClass("is-collapsed");
            var height = $element.css("height");
            var paddingTop = $element.css("padding-top");
            var paddingBottom = $element.css("padding-bottom");
            var marginTop = $element.css("margin-top");
            var marginBottom = $element.css("margin-bottom");
            $element.addClass("is-collapsed");
            $element.stop().animate({
                height: height,
                paddingTop: paddingTop,
                paddingBottom: paddingBottom,
                marginTop: marginTop,
                marginBottom: marginBottom
            }, duration);

        }
    });

    $selector.promise().done(function () {
        $selector.removeClass("is-collapsed");
        $selector.removeAttr("style");
        if (callback) {
            callback();
        }
        console.log("Expanding done");
    })
}

function collapseVertical($selector, duration, callback) {
    $selector.stop().animate({
        height: "0px",
        paddingTop: "0px",
        paddingBottom: "0px",
        marginTop: "0px",
        marginBottom: "0px"
    }, duration);

    $selector.promise().done(function () {
        $selector.removeAttr("style");
        $selector.addClass("is-collapsed");
        if (callback) {
            callback();
        }
        console.log("Collapsing done");
    });
}

function getChannelCardLogoElement(channelData) {
    if (!channelData) {
        return null;
    }

    var $logo = $("<div />", {
        class: "card--logo"
    });

    var channelLogoUrl;
    if (isChannelNonExistent(channelData)) {
        channelLogoUrl = "http://res.cloudinary.com/dprf86vet/image/upload/v1486966972/136366_hqev16.svg";
    } else {
        if (channelData.channel.logo) {
            channelLogoUrl = channelData.channel.logo;
        } else {
            channelLogoUrl = "http://res.cloudinary.com/dprf86vet/image/upload/v1487993952/Glitch_Purple_RGB_qbdhgp.png";
        }
    }

    $logo.append($("<img />", {
        class: "card--logo--image",
        src: channelLogoUrl
    }));

    return $logo;
}

function getChannelCardDetailsElement(channelData) {
    if (!channelData) {
        return null;
    }

    var $details = $("<div />", {
        class: "card--details"
    }).append($("<h1 />", {
        class: "card--title",
        text: channelData.channel.display_name ? channelData.channel.display_name : channelData.searchName
    }));

    if (isChannelNonExistent(channelData)) {
        $details.append($("<h2 />", {
            class: "card--subtitle",
            text: "Channel not found!"
        }));
    } else if (isChannelOnline(channelData)) {
        var $gameProperty = $("<div />", {
            class: "card--prop"
        }).append($("<div />", {
            class: "card--prop--name"
        }).append($("<i />", {
            class: "fa fa-gamepad card--icon card--icon-s"
        })));
        $gameProperty.append($("<div />", {
            class: "card--prop--value",
        }).append($("<h2 />", {
            class: "card--subtitle",
            text: channelData.stream.stream.game
        })));

        var $viewersProperty = $("<div />", {
            class: "card--prop"
        }).append($("<div />", {
            class: "card--prop--name"
        }).append($("<i />", {
            class: "fa fa-users card--icon card--icon-s"
        })));
        $viewersProperty.append($("<div />", {
            class: "card--prop--value"
        }).append($("<h2 />", {
            class: "card--subtitle",
            text: channelData.stream.stream.viewers
        })));

        $details.append($gameProperty);
        $details.append($viewersProperty);
    } else {
        $details.append($("<h2 />", {
            class: "card--subtitle",
            text: "Offline"
        }));
    }

    return $details;
}

function getChannelCardControlsElement(channelData) {
    var $controls = $("<div />", {
        class: "card--controls"
    });

    if (!isChannelNonExistent(channelData)) {
        var $channelLink = $("<a />", {
            href: channelData.channel.url,
            target: "_blank"
        });
        if (isChannelOnline(channelData)) {
            $channelLink.append($("<i />", {
                class: "fa fa-play card--icon card--icon-watch card--icon-click",
            }));
            $controls.append($channelLink);
        } else {
            $channelLink.append($("<i />", {
                class: "fa fa-user card--icon card--icon-user card--icon-click",
            }));
            $controls.append($channelLink);
        }
    }

    $controls.append($("<i />", {
        class: "fa fa-trash-o card--icon card--icon-delete card--icon-click"
    }).click(onRemoveClick));

    return $controls;
}

function getChannelCardElement(channelData) {
    if (!channelData) {
        return null;
    }

    var $card = $("<div />", {
        class: "card"
    });

    var $logo = getChannelCardLogoElement(channelData);
    var $details = getChannelCardDetailsElement(channelData);
    var $controls = getChannelCardControlsElement(channelData);

    if (isChannelNonExistent(channelData)) {
        $card.addClass("card-nonexistent");
    } else {
        if (isChannelOnline(channelData)) {
            $card.addClass("card-online");
        } else {
            $card.addClass("card-offline");
        }
    }

    $card.append($logo);
    $card.append($details);
    $card.append($controls);

    $card.data("channelData", channelData);

    return $card;
}
