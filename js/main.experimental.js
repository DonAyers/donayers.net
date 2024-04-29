$(document).ready(function() {
    
    var quotes = [];
    var url = "http://www.askkafka.com/quotes/api/?";
    var userAuthor;
    var userPages;
    var ajaxCalls = 0;
    var dialogShown = 0;
    var intro = true;
    var movedOnce = false;
    var moving = false;
    var jumping = false;
    var jumpedOnce = false;
    var bg = $("#mountains, #buildings, #closeBuildings, #ground"); // background elements to be sync moved

    audiojs.events.ready(function() {
        audiojs.createAll();
    });

     function stopMovement(){
    	movingRight = false;
	   	movingLeft = false;
		moving = false;
		$('#robot').animateSprite('play', 'stop');
		
		//console.log("stopMovement Called");
		bg.spStop();

    }


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

                    if(data[i].length < 125){
						quotes[i] = data[i];
                    }
                   // console.log(data[i].length);

                }



                $('.output p').text(quotes[1])
                    .velocity("transition.perspectiveRightOut", 2000)
                    .delay(3000)
                    .velocity("transition.perspectiveLeftIn", 2000);



                $('#stage').append("<div class='author'>" + author + "</div>");
                $('.author').css("marginleft", "0%").velocity({
                    marginLeft: "120%"
                }, {
                    duration: 10000,
                    complete: function() {
                   	$('.author').remove();
                }
                });


            });


    }
    

    $('.changeAuthor').click(function() {

        var author = $('.authorBox').val();
        quotes = [];
        ajaxBot(author);

    });


    $('.name').velocity({
        marginLeft: "+0%"
    }, {
        duration: 1000
    });
    $('.name').velocity("callout.tada", 800);
    $('.name img:first-of-type').velocity("transition.flipBounceYIn", 500);
    //$('.social img').velocity("transition.slideDownIn", 500).velocity("callout.pulse", 500);
    $('#forkongithub').hide();

    $('#mountains').pan({
                    fps: 30,
                    speed: 1,
                    dir: 'left',
                    depth: 20
                });
                
                $('#buildings').pan({
                    fps: 30,
                    speed: 2,
                    dir: 'left',
                    depth: 50
                });
                $('#closeBuildings').pan({
                    fps: 30,
                    speed: 3,
                    dir: 'left',
                    depth: 60
                });
                $('#ground').pan({
                    fps: 30,
                    speed: 4,
                    dir: 'left',
                    depth: 70
                });

  bg.spStop();



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
                    //$('.social img').velocity("callout.pulse", 500);
                }

                $('.bio').velocity("transition.flipBounceYIn", 500);

                if (index == 1) {
                    if (!$('.bio').is(":visible")) {
                        $('.bio').velocity("transition.flipBounceYIn", 500);
                    } else {
                        $('.bio').velocity("callout.bounce", 700);
                    }
                }
                arrowBounce();
            }

            if (anchorLink == '3rdPage' && intro) {

                
                $(".sides, .sides img")
                    .velocity("transition.slideLeftIn", {
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
		

    

    $('.dialog').velocity("transition.swoopIn", 1000);

    $(".dialog div").velocity("transition.slideLeftIn", {
        //stagger: 200
        duration:200
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


    

    $('#robot').click(function() {
        jump(200);

    });

    var keys = {};

		$(document).keydown(function(event) {
        keys[event.which] = true;
        //console.log(keys);
    }).keyup(function(event) {
        delete keys[event.which];
    });

    	//Robot / background movement functions

    /*$(".stage").click(function(e) {
	    var $this = $(this);
	    if (e.pageX - $this.offset().left > $this.width() / 2) {
	        // Clicked on the right side.
	        move("right");
	        
	    } else {
	        // Clicked on the left side.
	        move("left");
	        
	        moveBg();
	        
	    }
	});*/

	//var arrowClicked = false;
    var leftClicked;
    var rightClicked;

	$('.rightArrow').click(function(){
		//arrowClicked = true;

		if(!moving){
			//moveBg();
			move("right");
			moving = true;
			keys[39] = true;
            delete keys[37];
            delete keys[67];
			
		}else{
			//console.log(moving);
			stopMovement();
			delete keys[39], keys[68];
            
		}
	});
	$('.leftArrow').click(function(){
		//arrowClicked = true;
		if(!moving){
		  move("left");
	       moving = true;
	    	keys[37] = true;
            delete keys[39], keys[68];
            

	    }else{
	    	stopMovement();
	    	delete keys[37];
            delete keys[67];
	    }
	});
	var arrows = $(".fp-prev, .fp-next");
	function arrowBounce(){
		arrows.velocity({translateY: "-=15px"}, {
			duration:100,
			easing: "easeInOutElastic",
			complete: function(){
				arrows.velocity({translateY: "+=15px"}, 100);
			}
		});
	//setTimeout(arrowBounce,5000);
	}



	

    	function jump(height) {
        if (dialogShown == 1) {
            dialogShown++;
            $('.dialog').html("<div>Alright!</div><br><div>Now we're cooking with flarnktane.</div><br><div class=''>Keep Walking to see the great AJAX module in the sky.</div><br><div>Or Push the down arrow<img class='flipY' src='img/uparrow.png'/> Or spacebar to go to The Don's Other projects</div>");
            $('.dialog div').velocity("transition.slideLeftIn", {
                //stagger: 750,
                complete: function() {
                    ajaxBot("camus");
                    $('.dialog').delay(5000).velocity("transition.slideRightOut", {
                        duration: 500,
                        complete: function() {
                            var width = $(window).width();
                            var height = $(window).height();
                            var centerPercent = 30;
                            console.log(width);
                            if(width < 1400){
                                centerPercent = Math.round(width/2 - 350);
                                console.log("centerPercent = " + centerPercent);
                                centerPercent = String(centerPercent) + "px";
                            }else{
                                centerPercent = String(centerPercent) + "%";
                            }

                            if(height > width){
                                centerPercent = 0;
                                centerPercent = String(centerPercent) + "px";
                            }
                            
                            //console.log("centerPercent = " + centerPercent);

                            

                            $('.ajaxBox').css({
                                "display": "inline-block"
                            }).velocity({
                                left: centerPercent
                            }, 5000);
                        }
                    });
                }
            });
            //console.log("jumpedOnce= " + jumpedOnce);
        }
        if (!jumping) {
            flipQuote();
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
                    begin: function(){

                    },
                    complete: function() {

                        //$('#robot').animateSprite('play', 'stop');    
                        if (moving) {
                            $('#robot').animateSprite('play', 'runRight');
                        } else {
                            $('#robot').animateSprite('play', 'stop');
                            bg.spStop();

                            
                        }

                        jumping = false;

                    }
                });
        }


    }

    	var movingRight;
       	var movingLeft;

        function move(direction){
        	//console.log("animation triggered" + "moving = " + moving);

        	
        	switch(direction){
        		case "right":
        			if(!movingRight){
	        			movingRight = true;
	        			movingLeft = false;
	        			$('#robot').removeClass('flip');
	        			$('#robot').animateSprite('play', 'runRight');
	        			bg.spChangeDir('left');
	        			//console.log("movingRight triggered" );
        			}
        		break;

        		case "left":
        		if(!movingLeft){
        			movingLeft = true;
        			movingRight = false;
        			$('#robot').addClass('flip'); //.velocity({marginLeft: "-=1px"}, charSpeed);
		            $('#robot').animateSprite('play', 'runRight');
		            bg.spChangeDir('right');
		           //console.log("movingLeft triggered");

		        }
		        break;

        	}
        	
               
        }

   

    function gameLoop() {


        if (keys[39] || keys[37] || keys[68] || keys[65]) {
        			
            if (!movedOnce) {
                //moveBg();
                //console.log("not moved once");
                $('.dialog').html("<div>Thats the ticket</div><br><div>The Don lives high up in the clouds. They say you can see him up there when the moons are aligned, But Ill let you be the judge of that.</div><br><div>Activate my jumpjets by pressing up <img class='upArrow' src='img/uparrow.png'/> or clicking on me</div>");
                $('.dialog div').velocity("transition.slideLeftIn", {
                    //stagger: 500,
                    complete: function() {
                        dialogShown++;

                    }
                });

                movedOnce = true;
                
            } else {
                bg.spStart();
                //console.log("moved once");
            }

            if(!moving){
	            if(keys[39] || keys[68]) {
					moving = true;
					move("right");
	            
		        }
		        if(keys[65] || keys[37]) {
		            moving = true;
		            move("left");

		        }
	        }

           
        }else{
        	if(moving){
        		stopMovement();
        	}
        }

        if (keys[38] || keys[87]) {
            jump(200);
            
        }
// code to move objects and repaint canvas goes here

        setTimeout(gameLoop, 20);
    }
    
    gameLoop();

    

    

});
