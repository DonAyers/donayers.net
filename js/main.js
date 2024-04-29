

$(document).ready(function() {
    var stamp;
    var time;
    var quotes = [];
    var url = "http://www.askkafka.com/quotes/api/?";
    var userAuthor;
    var userPages;
    var ajaxCalls = 0;
    var dialogShown = 0;
    var intro = true;
    var currentKey; //records the current key pressed
    var charSpeed = 50; //how fast the character will move
    var movedOnce = false;
    var moving = false;
    var jumping = false;
    var jumpedOnce = false;
    var bg = $("#clouds, #mountains, #buildings, #closeBuildings, #moveClouds, #ground"); // background elements to be sync moved

    audiojs.events.ready(function() {
    audiojs.createAll();
    });

    function ajaxBot(author) {
        userAuthor = author;
        userPages = 1;
        ajaxCalls++;

        $.getJSON(url, {
                author: userAuthor,
                pages: userPages
            })
            .done(function(data) {

                for (var i = 1; i < Object.keys(data).length; i++) {

                    quotes[i] = data[i];

                }



                $('.output p').text(quotes[1])
                    .velocity("transition.perspectiveRightOut", 2000)
                    .delay(3000)
                    .velocity("transition.perspectiveLeftIn", 2000);



                $('#stage').append("<div class='author'>" + author + "</div>");
                $('.author').css("marginleft", "0%").velocity({
                    marginLeft: "120%"
                }, {
                    duration: 10000
                });


            });


    }
    ajaxBot("camus");

    $('.test').click(function() {

        var author = $('.authorBox').val();
        ajaxBot(author);

    });


    $('.name').velocity({
        marginLeft: "+0%"
    }, {
        duration: 1000
    });
    $('.name').velocity("callout.tada", 800);
    $('.name img').velocity("transition.flipBounceYIn", 500);
    $('.social img').velocity("transition.slideDownIn", 500).velocity("callout.pulse", 500);
    $('#forkongithub').hide();

    $('#fullpage').fullpage({
        anchors: ['firstPage', 'secondPage', '3rdPage'],
        sectionsColor: ['#1C1D21', '#31353D', '#92CDCF'],
        css3: true,
        menu: '#menu',
        afterLoad: function(anchorLink, index) {
            if (index == 3) {
                $('#forkongithub').velocity("transition.flipBounceYIn", 500);
                $('#section2 h1').velocity({
                    marginLeft: "+0%"
                }, {
                    duration: 700
                });
            } else {
                $('#forkongithub').velocity("transition.flipBounceYOut", 200);
            }

            if (index == 2) {
                if (!$('#slide1 img').is(":visible")) {
                    $('#slide1 img').velocity("transition.flipBounceYIn", 500);
                } else {
                    $('#slide1 img').velocity("callout.bounce", 700);
                    $('.social img').velocity("callout.pulse", 500);
                }

                $('.bio').velocity("transition.flipBounceYIn", 500);

                if (index == 1) {
                    if (!$('.bio').is(":visible")) {
                        $('.bio').velocity("transition.flipBounceYIn", 500);
                    } else {
                        $('.bio').velocity("callout.bounce", 700);
                    }
                }
            }


            var intro = true;

            if (anchorLink == '3rdPage' && intro) {

                $(".sides")
                    .velocity("transition.slideLeftIn", {
                        stagger: 100
                    });


                $(".sides img").velocity("transition.slideLeftIn", {
                    stagger: 100
                });
                intro = false;

            }
        },
        afterSlideLoad: function(anchorLink, index, slideAnchor, slideIndex) {
            var loadedSlide = $(this);

            //first slide of the second section
            if (anchorLink == 'secondPage' && slideIndex == 1) {
                if (!$('#slide2 img').is(":visible")) {
                    $('#slide2 img').velocity("transition.slideUpBigIn", 300);
                } else {
                    $('#slide2 img').velocity("callout.bounce", 700);
                }
            }

            //second slide of the second section (supposing #secondSlide is the
            //anchor for the second slide
            if (index == 2 && slideIndex == 2) {
                if (!$('#slide3 img').is(":visible")) {
                    $('#slide3 img').velocity("transition.flipXIn", 300);
                } else {
                    $('#slide3 img').velocity("callout.bounce", 700);
                }
            }

            if (index == 2 && slideIndex == 0) {
                if (!$('#slide3 img').is(":visible")) {
                    $('#slide3 img').velocity("transition.flipXIn", 300);
                } else {
                    $('#slide3 img').velocity("callout.bounce", 700);
                }



            }
        }


    });
    $('#moveClouds').pan({
        fps: 30,
        speed: 0.05,
        dir: 'left',
        depth: 10
    });

		$('.dialog').velocity("transition.swoopIn", 1000);

    $(".dialog div").velocity("transition.slideLeftIn", {
        stagger: 200
    });

	$("#robot").animateSprite({
        fps: 6,
        animations: {
            walkRight: [0, 1, 2, 3],
            runRight: [5, 6, 7, 6],
            jump: [8, 9, 10, 11, 11, 11, 11],
            stop: [0, 0, 0, 0]
        },
        loop: true,
        autoplay: false,
    });


    function jump(height) {
        if (dialogShown == 1) {
            dialogShown++;
            $('.dialog').html("<div>Alright!</div><br><div>Now we're cooking with flarnktane.</div><br><div class=''>Keep Walking to see the great AJAX module in the sky.</div><br><div>Or Push the down arrow<img class='flipY' src='img/uparrow.png'/> Or spacebar to go to The Don's Other projects</div>");
            $('.dialog div').velocity("transition.slideLeftIn", {
                stagger: 750,
                complete: function() {
                    $('.dialog').delay(1000).velocity("transition.slideRightOut", {
                        duration: 500,
                        complete: function() {
                            $('.ajaxBox').css({
                                "display": "inline-block"
                            }).velocity({
                                left: "40%"
                            }, 5000);
                        }
                    });
                }
            });
            //console.log("jumpedOnce= " + jumpedOnce);
        }
        if (!jumping) {
            jumping = true;
            jumpedOnce = true;
            $('#robot').animateSprite('play', 'jump');
            $('#robot').velocity({
                    top: "-=" + height + "px"
                }, {
                    duration: 1000,
                    easing: "easeOutCubic"
                })
                .velocity({
                    top: "+=" + height + "px"
                }, {
                    duration: 500,
                    easing: "easeInCubic",
                    complete: function() {

                        //$('#robot').animateSprite('play', 'stop');    
                        if (moving) {
                            $('#robot').animateSprite('play', 'runRight');
                        } else {
                            $('#robot').animateSprite('play', 'stop');
                            bg.spStop();
                            $('#moveClouds').pan({
                                fps: 30,
                                speed: 0.05,
                                dir: 'left',
                                depth: 10
                            });
                        }

                        jumping = false;
                        
                    }
                });
        }


    }

    $('#robot').click(function() {
        jump(200);

    });



    $(document).keydown(function(e) {
         console.log(e.keyCode);
        var now = Date.now();
        var nt = $(this).data("lastime") || now;
        if (nt > now) return;
        $(this).data("lastime", now + 100);

        currentKey = e.keyCode;
        
        if (currentKey == 39 || currentKey == 37 || currentKey == 68 || currentKey == 65) {

            if (!movedOnce) {
                $('#clouds').pan({
                    fps: 30,
                    speed: 1.5,
                    dir: 'left',
                    depth: 10
                });
                $('#mountains').pan({
                    fps: 30,
                    speed: 1.7,
                    dir: 'left',
                    depth: 20
                });
                $('#moveClouds').pan({
                    fps: 30,
                    speed: 1.9,
                    dir: 'left',
                    depth: 30
                });
                $('#buildings').pan({
                    fps: 30,
                    speed: 2.2,
                    dir: 'left',
                    depth: 50
                });
                $('#closeBuildings').pan({
                    fps: 30,
                    speed: 2.5,
                    dir: 'left',
                    depth: 60
                });
                $('#ground').pan({
                    fps: 30,
                    speed: 3.5,
                    dir: 'left',
                    depth: 70
                });

                $('.dialog').html("<div>Thats the ticket</div><br><div>The Don lives high up in the clouds. They say you can see him up there when the moons are aligned, But Ill let you be the judge of that.</div><br><div>Activate my jumpjets by pressing up <img class='upArrow' src='img/uparrow.png'/> or the W key</div>");
                $('.dialog div').velocity("transition.slideLeftIn", {
                    stagger: 500,
                    complete: function() {
                        dialogShown++;

                    }
                });

                movedOnce = true;
            } else {
                bg.spStart();
            }

            if (movedOnce && !moving) {
                $('#robot').animateSprite('play', 'runRight');
                moving = true;
                //console.log("start animation");
                bg.spToggle();
            }
        }

        switch (e.keyCode) {
            case 38:
            case 87:
                jump(200);
                break;

            case 39:
            case 68:

                $('#robot').removeClass('flip');
                //$('#robot').velocity({marginLeft: "+=1px"}, charSpeed);

                bg.spChangeDir('left');
                var time = Date.now();
                flipQuote();
                break;
            case 65:
            case 37:
                //$('#robot').addClass('flip').velocity({marginLeft: "-=1px"}, charSpeed);
                bg.spChangeDir('right');
                break;
        }

    });
    $('.music, .bar').velocity({
        left: "-=300px"
    }, 200);

    $('.audiojs').velocity({
        left: "+700px"
    }, 200);

    var music = false;
    $('.music').click(function() {
        $('.music, .bar').velocity("reverse", 200);
        if (music) {
            $('.audiojs, .bar2, .bar3').velocity({
                left: "-=700px"
            }, 175);
            music = false;
        } else {
            $('.audiojs, .bar2, .bar3').velocity({
                left: "+=700px"
            }, 175);
            music = true;
        }

    });

    function flipQuote() {
        var now = Date.now();
        var nt = $(this).data("lastime") || now;
        if (nt > now) return;
        $(this).data("lastime", now + 2000);

        if (quotes.length > 0 && ajaxCalls > 0) {
            var num = Math.floor((Math.random() * quotes.length) + 1);
            var tick = true;
            $('.output p').text(quotes[num]);
            $('.output p').velocity("transition.perspectiveRightOut", {
                duration: 400,
                complete: function() {
                    if (tick) {
                        $('.output p').velocity("transition.perspectiveLeftIn", 400);
                        tick = false;
                    }
                }
            });
        }
    }

    arrowKeys = [65, 37, 39, 68];
    $(document).keyup(function(e) {
        for (var i = 0; i < 3; i++) {
            if (e.keyCode == arrowKeys[i]) {
                $('#robot').animateSprite('play', 'stop');
                moving = false;
                bg.spStop();
                $('#moveClouds').pan({
                    fps: 30,
                    speed: 0.05,
                    dir: 'left',
                    depth: 10
                });
            }
        }
    });

});
