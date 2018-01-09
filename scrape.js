const WebSocket = require('ws')
const BitMEXClient = require('bitmex-realtime-api');
const fs = require('fs');

var pairs = {
	BCH:{futures:'BCHF18', spot:'BCHBTC'},
	DSH:{futures:'DASHH18', spot:'DSHBTC'},
	ETH:{futures:'ETHH18', spot:'ETHBTC'},
	ETC:{futures:'ETC7D', spot:'ETCBTC'},
	LTC:{futures:'LTCH18', spot:'LTCBTC'},
	XMR:{futures:'XMRH18', spot:'XMRBTC'},
	XRP:{futures:'XRPH18', spot:'XRPBTC'},
	ZEC:{futures:'ZECH18', spot:'ZECBTC'},
};

var bm = {
	'BCHF18':{bid:0, ask:0}, 
	'DASHH18':{bid:0, ask:0}, 
	'ETHH18':{bid:0, ask:0}, 
	'ETC7D':{bid:0, ask:0},
	'LTCH18':{bid:0, ask:0},
	'XMRH18':{bid:0, ask:0},
	'XRPH18':{bid:0, ask:0},
	'ZECH18':{bid:0, ask:0}, 
};

var bf = {
	'BCHBTC':{bid:0, ask:0},
	'DSHBTC':{bid:0, ask:0}, 
	'ETHBTC':{bid:0, ask:0}, 
	'ETCBTC':{bid:0, ask:0}, 
	'LTCBTC':{bid:0, ask:0}, 
	'XMRBTC':{bid:0, ask:0},
	'XRPBTC':{bid:0, ask:0}, 
	'ZECBTC':{bid:0, ask:0}
};

var channel_list = {};

function start_bf(){
	
    var ws = new WebSocket('wss://api.bitfinex.com/ws/');
	var shit = false;
	var timeoutObj;
	
	ws.onopen = () => {
		// API keys setup here (See "Authenticated Channels")
		
		// subscribe
		for (var i in bf){
			ws.send(JSON.stringify({
			   "event":"subscribe",
			   "channel":"ticker",
			   "pair":i
			}));
		}
		
	}
	
    ws.on('message', function(msg) {
		obj = JSON.parse(msg);
		if (typeof obj.event !== 'undefined'){
			switch(obj.event) {
				case "info": 
					if (typeof obj.version !== 'undefined'){
						console.log(getDateTime() + ' [Bitfinex] Version: ' + obj.version);
					} else {
						console.log(getDateTime() + ' [Bitfinex] Info: ' + obj.code + ' ' + obj.obj);
					}
					break;
				case "subscribed": 
					channel_list[obj.chanId] = obj.pair;
					break;
				case 'error':
					console.log(getDateTime() + ' [Bitfinex] ERROR: ' + obj.code + ' ' + obj.obj);
					shit = true;
					reconnect_bf();
					break;
			}
		} else if (typeof obj[0] === 'number' && obj.length == 11){
			clearTimeout(timeoutObj);
			// return ticker!
			var pairname = channel_list[obj[0]];
			bf[pairname].bid = obj[1];
			bf[pairname].ask = obj[3];
			//handleNewData();
			timeoutObj = setTimeout(() => {
				console.log(getDateTime() + ' No new data received from Bitfinex for 60 seconds. Reconnecting websocket in 10 seconds.');
				shit = true;
				reconnect_bf();
			}, 60*1000);
		}
	});
	
    ws.onclose = function(){
		shit = true;
		reconnect_bf();
		console.log(getDateTime() + ' Bitfinex socket closed.');
    };
	
	ws.onerror = function(){
		shit = true;
		reconnect_bf();
		console.log(getDateTime() + ' Bitfinex error occured.');
    };
	
	function reconnect_bf(){
		setTimeout(function(){
			if (shit) {
				shit = false;
				console.log(getDateTime() + ' Bitfinex websocket reconnecting.');
				ws.close();
				start_bf();
			}
		}, 10000);
	}
	
}

function start_bm(){
	
	var ws = new WebSocket('wss://www.bitmex.com/realtime');
	var shit = false;
	var timeoutObj;
	
	ws.onopen = () => {
		// API keys setup here 
		
		// subscribe
		tempArr = [];
		for (var i in bm){
			tempArr.push("instrument:" + i);
		}
		ws.send(JSON.stringify({
			"op": "subscribe", 
			"args": tempArr
		}));
	}
	
    ws.on('message', function(msg) {
		obj = JSON.parse(msg);
		if (typeof obj.data !== 'undefined'){
			clearTimeout(timeoutObj);
			if (typeof obj.data[0].bidPrice !== 'undefined'){
				bm[obj.data[0].symbol].bid = obj.data[0].bidPrice;
			}
			if (typeof obj.data[0].askPrice !== 'undefined'){
				bm[obj.data[0].symbol].ask = obj.data[0].askPrice;
			}
			timeoutObj = setTimeout(() => {
				console.log(getDateTime() + ' No new data received from Bitmex for 60 seconds. Reconnecting websocket in 10 seconds');
				shit = true;
				reconnect_bm();
			}, 60*1000);
		} else {
			console.log(obj);
		}
	});
	
    ws.onclose = function(){
		shit = true;
		reconnect_bm();
		console.log(getDateTime() + ' Bitmex socket closed.');
    };
	
	ws.onerror = function(){
		shit = true;
		reconnect_bm();
		console.log(getDateTime() + ' Bitmex error occured');
    };
	
	function reconnect_bm(){
		setTimeout(function(){
			if (shit) {
				shit = false;
				console.log(getDateTime() + ' Bitmex websocket reconnecting.');
				ws.close();
				start_bm();
			}
		}, 10000);
	}
	
}

function handleNewData(){
	/*for (var i in pairs){
		console.log(i);
		console.log('Bitfinex: ' + eval('bf.' + pairs[i].spot).bid + ' ' + eval('bf.' + pairs[i].spot).ask;
		console.log('Bitmex: ' + eval('bm.' + pairs[i].futures).bid + ' ' + eval('bm.' + pairs[i].futures).ask;
	}*/
}

function printAll(){
	//process.stdout.write('\033c');
	for (var i in pairs){
		// time, spot bid, spot ask, futures bid, futures ask
		fs.appendFile('output\\' + i + '.csv', getDateTime() + ',' + eval('bf.' + pairs[i].spot).bid + ',' + eval('bf.' + pairs[i].spot).ask + ',' + eval('bm.' + pairs[i].futures).bid + ',' + eval('bm.' + pairs[i].futures).ask + '\r\n', (err) => {  
			if (err) console.log(err);
		});
	}
	
}

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + "/" + month + "/" + day + " " + hour + ":" + min + ":" + sec;

}

start_bf();
start_bm();

var timerObj = setInterval(printAll, 10000);

