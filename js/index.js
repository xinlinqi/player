;(function($){
	var $songProgressBar = $('#songProgressBar'),//歌曲进度条面板
	$songProgressCurrent = $('#songProgressCurrent'),//当前歌曲进度条位置
	$songProgressHideBar = $('#songProgressHideBar'),//歌曲进度条占位面板
	$volumeProgressCurrent = $('#volumeProgressCurrent'),//当前音量进度条位置
	$volumeCurrentBtn = $('#volumeCurrentBtn'),//当前音量按钮位置
	$volumeProgressBar = $('#volumeProgressBar'),//音量进度条面板
	$volumePanel = $('#volumePanel'),//音量面板
	$volumeBtn = $('#volumeBtn'),//音量按钮
	$playBtn = $('#playBtn'),//播放按钮
	$pauseBtn = $('#pauseBtn'),//暂停按钮
	$listBtn = $('#list_btn'),//播放列表按钮
	$lrc = $('#lrc'),//歌词元素
	$song_title = $('#song_ti'),
	$song_author = $('#song_ar');
	host = './tracks/',//歌曲文件路径
	songTime = 0,//歌曲时间
	player = {},
	songList = [],
	currentSong = 0;

	player.init = function(){
		this.create();
		this.bind();
	};

	player.set = function(time){
		time = time || 0;
		songTime = time;
	}

	player.create = function(){
		//初始化音频对象
		soundManager.setup({
		  	url: 'swf/',//flash文件
		  	debugMode: true,//调试模式
		  	onready: function() {
			    var mySoundObject = soundManager.createSound({
			        id: songList[currentSong].sid,//音频ID
			        url: songList[currentSong].mp3,//播放地址
			        volume: 50,//音量大小
			        autoLoad: true,//自动加载
			        onload:function(){
			      		songTime = Math.floor((this.bytesTotal/this.bytesLoaded)*this.duration);//记录歌曲时间
						showBtn($playBtn, $pauseBtn);
						soundManager.play(songList[currentSong].sid);			      		
			      	},
			      	whileplaying: function() {
					    var currentProgressPos = (this.position / this.duration) * 90,//当前播放进度
					    pos = (this.position / 1000).toFixed();//当前播放时间

					    //判断当前进度是否越界
					    if(currentProgressPos >= 90){
					    	return;
					    }
					    $songProgressCurrent.css('width', currentProgressPos + '%');//设置进度条

				    	//判断当前播放时间是否匹配到歌词对象
						if(player.lrc.options.data[pos]){
							//判断时间帧，防止多次执行
							if(pos != player.lrc.options.index){
								player.lrc.options.index = pos;//记录歌词下标
								$lrc.animate({'top': '-=38px'},'slow').find('p').removeClass('high')
								.end().find('p[time='+ pos +']').addClass('high');//滚动歌词，并高亮当前行歌词
							}
						}
						document.title =  songList[currentSong].title + "-" + songList[currentSong].artist + " | 一个朴素的音乐播放器";
				  	},
				    onfinish: function() {
					    showBtn($pauseBtn,$playBtn);
					    $songProgressCurrent.animate({'width':0},'slow');//重置进度条
					    $lrc.animate({'top':0},'slow');//重置歌词位置
					    soundManager.setPosition(songList[currentSong].sid,0);//重置播放位置
					    currentSong = (currentSong + 1 <= songList.length - 1) ? currentSong + 1: 0;
						player.changeSong();
						player.setSkin();
					}
			    });
		  	}
		});
		player.lrc.getData();
		player.setSkin();
	};

	player.bind = function(){
		//播放歌曲
		$playBtn.click(function(){
			showBtn($(this),$pauseBtn);
			soundManager.play(songList[currentSong].sid);
		});

		//暂停播放
		$pauseBtn.click(function(){
			showBtn($(this),$playBtn);
			soundManager.pause(songList[currentSong].sid);
		});
		
		//显示/隐藏播放列表
		$listBtn.click(function(){
			togglePanel($("#song_lrc"), $("#play_list"));
		});

		//打开音量面板
		$volumeBtn.click(function(){
			($volumePanel.is(':hidden')) ? $volumePanel.show() : $volumePanel.hide();
		});

		//指定进度条位置开始播放
		$songProgressHideBar.click(function(event){
			soundManager.pause(songList[currentSong].sid);//暂停播放
			showBtn($playBtn,$pauseBtn);

			var pos = player.volume.getAbsPos(this),//获取进度条容器位置
			page = player.volume.getPageXY(event),//获取鼠标位置
			currentProgressPos = ((page.x - pos.x) / $(this).width()) * 90,//当前进度条位置百分比
			secondWidth = songTime / $(this).width(),//歌曲每秒所占宽度
			currentPlayTime = (page.x - pos.x) * secondWidth;//当前播放时间

			//设置进度条位置
			$songProgressCurrent.animate({'width': currentProgressPos + '%'},'slow',function(){
				soundManager.setPosition(songList[currentSong].sid,currentPlayTime);//指定时间播放歌曲
				soundManager.resume(songList[currentSong].sid);//恢复歌曲
				soundManager.play(songList[currentSong].sid);//播放歌曲
			});
			player.lrc.scroll(currentPlayTime);//滚动歌词
		});

		//按下音量游标
		$volumeCurrentBtn.mousedown(player.volume.down);

		//移动音量游标
		$(document).mousemove(player.volume.move);

		//放下音量游标
		$(document).mouseup(player.volume.up);
	};
	
	    
    player.changeSong = function(){
    	soundManager.reboot();
    	player.lrc.getData();
    	songTime = 0;
		$songProgressCurrent.animate({'width':0}, 'slow');//重置进度条
	    $lrc.animate({'top':0},'slow');//重置歌词位置
	    soundManager.setPosition(songList[currentSong].sid, 0);//重置播放位置  
    };
	
	player.setSkin = function(){
		$(".cover img").attr("src", songList[currentSong].cover);
		$('#item-' + songList[currentSong].sid).addClass("active");
		$('#item-' + songList[currentSong].sid).parent().siblings().children().removeClass("active");
	};
	
	//歌词
	player.lrc = {
		options:{
			index: -1,//记录歌词下标
			data: {},//歌词数据
			html: []//歌词结构
		},
		//根据歌曲播放进度滚动歌词
		scroll:function(time){
			var jumpTime = 0;//记录最后一个小于或等于它的时间
			//找到跳转的位置
			for(var item in player.lrc.options.data){
				if(item <= time / 1000){
					jumpTime = item;
				}
			}
			
			//判断是否找到歌词
			if(jumpTime){
				var $jump = $lrc.find('p[time='+ jumpTime +']'),
				currentTop = $jump.offset().top - $lrc.offset().top - parseInt($lrc.css('padding-top'));//计算滚动位置
				$jump.addClass('high').siblings().removeClass('high');//高亮当前歌词
				$lrc.animate({'top': -currentTop},'slow');//滚动歌词到指定位置
			}else{
				$lrc.find('p').removeClass('high');//重置相关元素
				$lrc.animate({'top': 0},'slow');//滚动歌词到原位
			}
		},
		//读取歌词文件
		getData:function(){
			$.get(host + songList[currentSong].title + '.lrc', function(data){
				var arr = data.split("\n");//分割每行歌词
				var title = arr[0].replace(']', '').split(':')[1],
				author = arr[1].replace(']', '').split(':')[1];
				//遍历歌词
				player.lrc.options.data = []
				for(var i = 0, len = arr.length; i < len; i++){
					var text = arr[i].replace(/\[\d*:\d*((\.|\:)\d*)*\]/g,''),//获取歌词
					timeArr = arr[i].match(/\[\d*:\d*((\.|\:)\d*)*\]/g);//获取时间帧
					if(timeArr){
						//遍历时间帧
						for(var j = 0, lenn = timeArr.length; j < lenn; j++){
							var min = Math.floor(timeArr[j].match(/\[\d*/i).toString().slice(1)),//分
							sec = Math.floor(timeArr[j].match(/\:\d*/i).toString().slice(1)),//秒
							time = min * 60 + sec;//转换时间
							player.lrc.options.data[time] = $.trim(text);//歌词对象
				 		}
				 	}
				}
	        	player.lrc.createUI(player.lrc.options.data, title, author);//创建歌词结构
        	});
		},
		//创建歌词结构
		createUI:function(data, title, author){
			var i = 0;
        	for(var item in data){
        		player.lrc.options.html[i]= '<p time='+ item +'>' + data[item] + '</p>';
        		i++;
        	}
        	$lrc.html(player.lrc.options.html.join(' '));
        	if (title)	$song_title.html(title);
        	if (author)	$song_author.html(author);
		}
	};
	
	player.list = {
		init: function(){
			$.get('tracks.txt',function(data){
				$("#play_list ul li").remove();
				for(var i=0; i < data.songs.length; i++){
					var sid = "song-item-" + new Date().getTime() + i;
					data.songs[i].sid = sid;
					songList.push(data.songs[i]);
					$("#play_list ul").append(
						$("#song_item").html().replace("{song}", data.songs[i].title)
									.replace("{title}", data.songs[i].title + " - " + data.songs[i].artist + "《" + data.songs[i].album+ "》")
									.replace("{sid}", sid)
									.replace("{index}", i)
					);
				}
				console.log(songList);
				currentSong = Math.floor(Math.random() * (songList.length - 1));
	      		$(".song_item").on("click", function(){
	      			currentSong = $(this).attr('index');
					player.changeSong();
					player.setSkin();
	        	});
	        	player.init();
        	}, "json");
 
		}
	};

    //调整音量
    player.volume = {
    	options:{
    		$dragging: null,//当前拖拽对象
   			diffXY: null,//元素位置和鼠标位置之间的差值
			dragXY: null,//元素跟随鼠标的位置
			pageXY: null,//鼠标位置
			offsetXY: null,//元素相对视窗的相对坐标
			scrollXY: null,//滚动条的距离
			containerXY: null,//容器位置
			volHeight: 0,//音量位置
			timer: null//鼠标移动时间器
    	},
    	down:function(event){
    		player.volume.options.diffXY = player.volume.getDiffXY(this,event);
			player.volume.options.containerXY = player.volume.getAbsPos($volumeProgressBar[0]);//容器位置
			player.volume.options.volHeight = $volumeProgressBar.height();//音量进度条高度
			player.volume.options.$dragging = $(this);//记录当前拖拽对象
    	},
    	move:function(event){
			if(player.volume.options.$dragging !== null){
				player.volume.options.pageXY = player.volume.getPageXY(event);
				player.volume.options.dragXY = player.volume.getDragXY(event);
				
				var offsetY = player.volume.options.dragXY.y - player.volume.options.containerXY.y;//相对容器鼠标位置
				//判断是否超越容器大小
				if(offsetY > player.volume.options.volHeight || offsetY < 0){
					return;
				}

				player.volume.options.$dragging.css('top',offsetY);//设置音量游标位置
				$volumeProgressCurrent.css('top',offsetY);//设置音量进度条位置
				soundManager.setVolume(songList[currentSong].sid,100 - (offsetY / player.volume.options.volHeight * 100));//设置音量
			}
		},
		up:function(){
			if(player.volume.options.$dragging != null){
				// $dragging = diffXY = dragXY = pageXY = offsetXY = scrollXY = containerXY = null;
				player.volume.options.$dragging = null;

				//注销事件，释放内存
				$(document).unbind('mousemove');
				if(player.volume.options.timer) clearTimeout(player.volume.options.timer);
				player.volume.options.timer = setTimeout(function(){
					$(document).mousemove(player.volume.move);
				},100);
			}
		},
		//获取事件对象
		getEvent:function(event){
			return event ? event : window.event;
		},
		//获取滚动条的距离
		getScrollXY:function(){
			return {'x':(document.body.scrollLeft || document.documentElement.scrollLeft),'y':(document.body.scrollTop || document.documentElement.scrollTop)};
		},
		//获取鼠标位置
		getPageXY:function(event){
			var event = player.volume.getEvent(event),
			pageX = event.pageX,
			pageY = event.pageY,
			scrollXY = player.volume.getScrollXY();

			if(pageX === undefined){
				pageX = event.clientX + scrollXY.x;
				pageY = event.clientY + scrollXY.y;
			}
			return {'x':pageX,'y':pageY};
		},
		//获取元素和鼠标位置之间的差值（解决鼠标总是在元素左上角的问题）
		getDiffXY:function(obj,event){
			player.volume.options.pageXY = player.volume.getPageXY(event);
			player.volume.options.offsetXY = player.volume.getAbsPos(obj);
			return {'x':player.volume.options.pageXY.x - player.volume.options.offsetXY.x,'y':player.volume.options.pageXY.y - player.volume.options.offsetXY.y};
		},
		//获取元素跟随鼠标的位置
		getDragXY:function(event){
			return {'x':player.volume.options.pageXY.x - player.volume.options.diffXY.x,'y':player.volume.options.pageXY.y - player.volume.options.diffXY.y};
		},
		//获取元素相对视窗的绝对位置
		getAbsPos:function(obj){
			var offsetX = obj.offsetLeft,
			offsetY = obj.offsetTop,
			current = obj.offsetParent;
			while(current !== null){
				offsetX+= current.offsetLeft;
				offsetY+= current.offsetTop;
				current = current.offsetParent;
			}
			return {'x':offsetX,'y':offsetY};
		}
    };


	//显示隐藏播放暂停按钮
	function showBtn(a,b){
		a.hide();
		b.show();
		if(b.hasClass("pause-b")){
			$(".play-btn").hide();
		}
	}
	
	function togglePanel(a, b){
		if(!a.is(":visible"))	a.toggle();
		else	a.toggle();
		if(!b.is(":visible"))	b.toggle();
		else	b.toggle();
	}
	player.list.init();
	
	
	$(".cover img").hover(function(){
		$(".play-btn").show();
	},function(){
		if($(".pause-b").is(":visible")){
			$(".play-btn").hide();
		}
	});
	
	$(".play-btn").hover(function(){
		$(".play-btn").show();
	});
	
})(jQuery);