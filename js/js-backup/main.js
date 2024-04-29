$(document).ready(function() {
			
			$('.name').velocity({ marginLeft: "+0%" }, { duration:1000 });
			$('.name').velocity("callout.tada", 800);
			$('.name img').velocity("transition.flipBounceYIn", 500);
			$('#forkongithub').hide();

			$('#fullpage').fullpage({
				anchors: ['firstPage', 'secondPage', '3rdPage'],
				sectionsColor: ['#445878', '#31353D', '#92CDCF'],
				css3: true,
				menu: '#menu',
				afterLoad: function(anchorLink, index){

					if(index == 3){
						$('#forkongithub').velocity("transition.flipBounceYIn", 500);
						$('#section2 h1').velocity({ marginLeft: "+0%" }, { duration:700 });
					}else{
						$('#forkongithub').velocity("transition.flipBounceYOut", 200);
					}

					if(index == 2){
						//moving the image
						if(!$('#slide1 img').is(":visible")){
		                	$('#slide1 img').velocity("transition.flipBounceYIn", 500);
		            	}else{
		            		$('#slide1 img').velocity("callout.bounce", 700);
		            	}

		            $('.bio').velocity("transition.flipBounceYIn", 500);

		            if(index == 1){
						//moving the image
						if(!$('.bio').is(":visible")){
		                	$('.bio').velocity("transition.flipBounceYIn", 500);
		            	}else{
		            		$('.bio').velocity("callout.bounce", 700);
		            	}
		            }


						//if($(''))

					}

					//section 3
					if(anchorLink == '3rdPage'){
						//moving the image
						$(".sides")
					    .velocity("transition.slideLeftIn", { stagger: 250 });
					    

					    $(".sides img").velocity("transition.slideLeftIn", { stagger: 500 });
					    
						
					}
				},
				afterSlideLoad: function( anchorLink, index, slideAnchor, slideIndex){
		            var loadedSlide = $(this);

		            //first slide of the second section
		            if(anchorLink == 'secondPage' && slideIndex == 1){
		                if(!$('#slide2 img').is(":visible")){
		                	$('#slide2 img').velocity("transition.slideUpBigIn", 300);
		            	}else{
		            		$('#slide2 img').velocity("callout.bounce", 700);
		            	}
		            }

		            //second slide of the second section (supposing #secondSlide is the
		            //anchor for the second slide
		            if(index == 2 && slideIndex == 2){
		                if(!$('#slide3 img').is(":visible")){
		                	$('#slide3 img').velocity("transition.flipXIn", 300);
		            	}else{
		            		$('#slide3 img').velocity("callout.bounce", 700);
		            	}
		            }

		            if(index == 2 && slideIndex == 0){
		                if(!$('#slide3 img').is(":visible")){
		                	$('#slide3 img').velocity("transition.flipXIn", 300);
		            	}else{
		            		$('#slide3 img').velocity("callout.bounce", 700);
		            	}

		            	$('#slide1 img, #footer').hover(function(){
		            		$('#footer').velocity("transition.slideUpIn", 500);
		            	},
		            	function(){
		            		$('#footer').velocity("transition.slideDownOut", 500);
		            	});
		            	
		            }
		        }


			});
			$('#clouds').pan({fps: 30, speed: 0.05, dir: 'left', depth: 10});


			
            
			//$('#hill1, #hill2, #clouds').spRelSpeed(8);
			

		  var currentKey;          //records the current key pressed
		  var TimerWalk;          //timer handle
		  var charStep = 2;       //1=1st foot, 2=stand, 3=2nd foot, 4=stand
		  var charSpeed = 100; //how fast the character will move
		  var movedOnce = false;
		  var moving = false;
		  var bg = $("#clouds, #hill1, #hill2, #trees");
		
		$("#robot").animateSprite({
		    fps: 6,
		    animations: {
		        walkRight: [0, 1, 2, 3],
		        runRight: [5,6,7,6],
		        jump:[10,11,12],
		        stop:[0,0,0,0]
		    },
		    loop: true,
		    autoplay: false,
		    complete: function(){
		        // use complete only when you set animations with 'loop: false'
		    }
	    });

	    $(document).keydown(function(e) {
		   	var now = Date.now();
	   		var nt = $(this).data("lastime") || now; 
	   		if( nt > now ) return;
			$(this).data("lastime", now + 100);  

		   	//if (!currentKey) {
		    currentKey = e.keyCode;
		 	if(currentKey == 39 || currentKey == 37 || currentKey == 68 || currentKey == 65){

			 	if(!movedOnce){
			 		$('#clouds').pan({fps: 30, speed: 0.7, dir: 'left', depth: 10});
					$('#hill2').pan({fps: 30, speed: 2, dir: 'left', depth: 30});
					$('#trees').pan({fps: 30, speed: 2.5, dir: 'left', depth: 60});
					$('#hill1').pan({fps: 30, speed: 3, dir: 'left', depth: 70});

					movedOnce = true;
			 	}else{
			 		bg.spStart();
			 	}

			 	if(movedOnce && !moving){ 
		        	$('#robot').animateSprite('play', 'walkRight');
		        	moving = true;
		        	console.log("start animation");
			        bg.spToggle();	
			    }
		    }

		      switch(e.keyCode) {
		        case 39: 
		        case 68: 
		        //$('#robot').animateSprite('play', 'walkRight');

		       	
		       	$('#robot').removeClass('flip').velocity({ marginLeft: "+=5px" }, charSpeed );
		       	bg.spChangeDir('left'); 
		        
		        console.log("-->");

		        break;
		        case 65: 
		        case 37: 
		        //$('#robot').animateSprite('play', 'walkRight');
		        $('#robot').addClass('flip').velocity({ marginLeft: "-=5px" }, charSpeed );
		        bg.spChangeDir('right'); 
			        console.log("<--");  
		        break;
		      }
		 			
		    //}
		 
		});
		
	    $(document).keyup(function(e) {
 
	  	$('#robot').animateSprite('play', 'stop');    
		moving = false;
		bg.spStop();
		$('#clouds').pan({fps: 30, speed: 0.05, dir: 'left', depth: 10});
	 
	  	});

		});



		$(window).scroll(function(){
				$('h2').velocity.velocity({ x: "+=200"});
				console.log("scroll");

		});